import ffmpeg from 'fluent-ffmpeg';
import { Queue, Worker, Job } from 'bullmq';
import fs from 'fs';
import { HLSMaker } from "hls-maker";
import path from 'path';
import md5 from 'md5';

export interface ConnectionConfig {
    host: string
    port: number;
}

export interface StreamLinkerConfig {
    rtmpOuputPath: string;
    standbyInputFilePath?: string;
    startInputFilePath: string;
    workerConnection?: ConnectionConfig,
    queueConnection?: ConnectionConfig
}
const appendStatus = {
    PENDING: 'pending',
    SUCCESS: 'success',
    ERROR: 'error',
    DISABLED: 'disabled',
};

const broadcastStatus = {
    PENDING: 'pending',
    RUNNING: 'running',
    SUCCESS: 'success',
    ERROR: 'error',
    DISABLED: 'disabled',
};

const appendPhase = {
    START: 'start',
    APPEND: 'append'
};

const redisConnectionDefault: ConnectionConfig = {
    host: '127.0.0.1',
    port: 6379
}

export class StreamLinker {
    public rtmpOuputPath: string;
    public hlsManifestPath: string;

    public startInputFilePath: string;
    public standbyInputFilePath?: string;

    public queue: Queue;
    public worker: Worker;
    public workerConnection: ConnectionConfig;
    public queueConnection: ConnectionConfig;

    public broadcastStatus: string;
    public appendStatus: string;

    public totalFrames: number;
    public streamFrames: number;
    public streamLeft: number;

    constructor(options: StreamLinkerConfig) {
        let that = this;
        this.startInputFilePath = options.startInputFilePath;
        if (!fs.existsSync(this.startInputFilePath)) {
            throw new Error(`Source path ${this.startInputFilePath} is not exist`);
        }
        this.rtmpOuputPath = options.rtmpOuputPath;
        this.hlsManifestPath = this._hlsManifestPath();
        this.broadcastStatus = broadcastStatus.PENDING;
        this.appendStatus = appendStatus.PENDING;
        this.totalFrames = 0;
        this.streamFrames = 0;
        this.streamLeft = 0;

        this.workerConnection = options.workerConnection || this.defaultConnectionQueue;

        this.queueConnection = options.queueConnection || this.defaultConnectionQueue;

        if (options.standbyInputFilePath && fs.existsSync(options.standbyInputFilePath)) {
            this.standbyInputFilePath = options.standbyInputFilePath;
        }

        this.queue = new Queue(this.rtmpOuputPath, {
            connection: that.queueConnection
        });

        this.worker = new Worker(this.rtmpOuputPath, async (job: Job) => {
            let maker = new HLSMaker({
                hlsManifestPath: that.hlsManifestPath,
                appendMode: job.data.appendMode,
                endlessMode: job.data.endlessMode,
                sourceFilePath: job.data.sourceFilePath
            });

            if (job.data.phase === appendPhase.START) {
                await maker.conversion(async (progress) => {
                    that.totalFrames = progress.frames;
                    that.appendStatus = appendStatus.DISABLED;
                    await job.updateProgress(progress);
                });
            } else {
                that.appendStatus = appendStatus.DISABLED;
                let concate = await maker.conversion();
                that.totalFrames += concate.frames;
                return concate;
            }
        }, {
            connection: that.workerConnection,
            concurrency: 1
        });

        this.worker.on('completed', (job: Job, returnvalue: any) => {
            that.appendStatus = appendStatus.PENDING;
            if (job.data.phase !== appendPhase.START) {
                console.log("[Appended new file]", "Current total frames", that.totalFrames);
            }
        });

        this.worker.on("progress", (job: Job, progress: any) => {
            if (that._isInitStream(job) && that._isExistManifestPath()) {
                that._broadcast();
                that.broadcastStatus = broadcastStatus.RUNNING;
            }
        });
    }

    get defaultConnectionQueue(): ConnectionConfig {
        return redisConnectionDefault;
    }

    public async start(): Promise<void> {
        await this.queue.drain();
        await this.queue.add(this.rtmpOuputPath, {
            sourceFilePath: this.startInputFilePath,
            phase: appendPhase.START,
            appendMode: false,
            endlessMode: true,
        });
    }

    public static getDefaultConnectionQueue(): ConnectionConfig {
        return redisConnectionDefault;
    }

    public static async append(sourceFilePath: string, rtmpOuputPath: string, redisConfig?: ConnectionConfig) {
        let queue = new Queue(rtmpOuputPath, {
            connection: redisConfig || StreamLinker.getDefaultConnectionQueue()
        });
        await queue.add(rtmpOuputPath, {
            sourceFilePath: sourceFilePath,
            appendMode: true,
            endlessMode: true,
            phase: appendPhase.APPEND
        }, { removeOnComplete: true, removeOnFail: 10 });
    }

    private _hlsManifestPath(): string {
        if (this.hlsManifestPath) return this.hlsManifestPath;

        const pathParse = path.parse(this.startInputFilePath);
        // const prefix = "hls-" + new Date().getTime();
        const prefix = `hls-${md5(this.rtmpOuputPath)}`;
        const dir = `${path.join(pathParse.dir, prefix)}`;

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        return `${path.join(dir, `${pathParse.name}.m3u8`)}`;
    }

    private _isInitStream(job: any): boolean {
        if (job.data.phase === appendPhase.START
            && this.broadcastStatus === broadcastStatus.PENDING) {
            return true;
        }
        return false;
    }

    private _broadcast(): void {

        ffmpeg(this.hlsManifestPath)
            .inputOption([
                '-re',
                '-live_start_index', '0'
            ])
            .outputOptions([
                '-c', 'copy',
                '-preset', 'veryfast',
                '-f', 'flv',
                '-flvflags', 'no_duration_filesize'
            ])
            .output(this.rtmpOuputPath)
            .on('error', (err, stdout, stderr) => {
                console.error('Error:', err.message);
                console.error('ffmpeg stdout:', stdout);
                console.error('ffmpeg stderr:', stderr);
            })
            .on('start', (command) => {
                console.log('ffmpeg command:', command);
            })
            .on('progress', async (progress) => {
                console.log("Stream progress frames", progress.frames, "Total frames", this.totalFrames);

                this.streamLeft = this.totalFrames - progress.frames;
                await this._apendDefault();
            })
            .on('end', () => {
                console.log('Livestream ended');
            })
            .run();
    }

    private async _apendDefault(): Promise<void> {
        if (this.streamLeft < 1000 && this.appendStatus == appendStatus.PENDING) {
            await this.queue.add(this.hlsManifestPath, {
                sourceFilePath: this.standbyInputFilePath || this.startInputFilePath,
                appendMode: true,
                endlessMode: true,
                phase: appendPhase.APPEND
            }, { priority: 9999, removeOnComplete: true, removeOnFail: 10 });
            console.log("Append default", "reason timeleft", this.streamLeft);
        }
    }

    private _isExistManifestPath(): boolean {
        return fs.existsSync(this.hlsManifestPath);
    }
}