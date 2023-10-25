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

const processSignal = {
    STOP: 'stop',
    PAUSE: 'pause'
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
    APPEND: 'append',
    INSERT: 'insert'
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

    private _ffmpegProcess: any;
    private _queueName: string;

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
        this._queueName = StreamLinker.genQueueName(this.rtmpOuputPath);

        this.workerConnection = options.workerConnection || this.defaultConnectionQueue;

        this.queueConnection = options.queueConnection || this.defaultConnectionQueue;

        if (options.standbyInputFilePath && fs.existsSync(options.standbyInputFilePath)) {
            this.standbyInputFilePath = options.standbyInputFilePath;
        }

        this.queue = new Queue(this._queueName, {
            connection: that.queueConnection
        });

        this.worker = new Worker(this._queueName, async (job: Job) => {
            if (job.name === `signal-${processSignal.STOP}`) {
                let allJobs = await this.queue.getJobs();
                for (const rmJob of allJobs) {
                    if (rmJob.id !== job.id) await rmJob.remove();
                }
                return { 'signal': processSignal.STOP }
            } else {
                let makerData = {
                    hlsManifestPath: that.hlsManifestPath,
                    appendMode: job.data.appendMode,
                    endlessMode: job.data.endlessMode,
                    sourceFilePath: job.data.sourceFilePath
                }

                switch (job.data.phase) {
                    case appendPhase.START:
                        let makerStart = new HLSMaker(makerData);
                        await makerStart.conversion(async (progress) => {
                            that.totalFrames = progress.frames;
                            that.appendStatus = appendStatus.DISABLED;
                            await job.updateProgress(progress);
                        });
                        break;
                    case appendPhase.INSERT:
                        that.appendStatus = appendStatus.DISABLED;

                        let sourceHlsManifestPath = path.join(
                            (path.parse(makerData.hlsManifestPath)).dir,
                            `${(path.parse(makerData.sourceFilePath)).name}.m3u8`
                        );

                        let sourceHls = new HLSMaker({
                            sourceFilePath: makerData.sourceFilePath,
                            hlsManifestPath: sourceHlsManifestPath,
                            appendMode: false,
                            endlessMode: makerData.endlessMode
                        });

                        let makerInsert = await sourceHls.conversion();

                        await HLSMaker.insert({
                            hlsManifestPath: makerData.hlsManifestPath,
                            sourceHlsManifestPath: sourceHlsManifestPath,
                            splicePercent: (((that.totalFrames - that.streamLeft) / that.totalFrames) * 100)
                        });

                        that.totalFrames += makerInsert.frames;
                        return makerInsert;
                    default:
                        let makerAppend = new HLSMaker(makerData);
                        that.appendStatus = appendStatus.DISABLED;
                        let concated = await makerAppend.conversion();
                        that.totalFrames += concated.frames;
                        return concated;
                }
            }
        }, {
            connection: that.workerConnection,
            concurrency: 1,
            autorun: false
        });

        this.worker.on('completed', async (job: Job, returnvalue: any) => {
            if (returnvalue && returnvalue.signal === processSignal.STOP) {
                try {
                    console.log(returnvalue);
                    await that.worker.close();
                    await that.queue.close();
                    that._ffmpegProcess.kill();
                    process.exit();
                } catch (error) {
                    console.log(error);
                }

            } else {
                that.appendStatus = appendStatus.PENDING;
                if (job.data.phase !== appendPhase.START) {
                    console.log("[Appended new file]", "Current total frames", that.totalFrames);
                }
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
        await this.queue.drain(true);
        // await this._queueInfo();
        await this.queue.add(this._queueName, {
            sourceFilePath: this.startInputFilePath,
            phase: appendPhase.START,
            appendMode: false,
            endlessMode: true,
        });

        this.worker.run();
    }

    public static async stop(rtmpOuputPath: string, redisConfig?: ConnectionConfig): Promise<boolean> {
        const queueName = StreamLinker.genQueueName(rtmpOuputPath);
        let queue = new Queue(queueName, {
            connection: redisConfig || StreamLinker.getDefaultConnectionQueue()
        });
        await queue.add(`signal-${processSignal.STOP}`, {
            signal: processSignal.STOP
        }, { removeOnComplete: true, removeOnFail: 10 });
        return true;
    }

    public static async append(sourceFilePath: string, rtmpOuputPath: string, redisConfig?: ConnectionConfig): Promise<void> {
        const queueName = StreamLinker.genQueueName(rtmpOuputPath);
        let queue = new Queue(queueName, {
            connection: redisConfig || StreamLinker.getDefaultConnectionQueue()
        });
        await queue.add(queueName, {
            sourceFilePath: sourceFilePath,
            appendMode: true,
            endlessMode: true,
            phase: appendPhase.APPEND
        }, { priority: 10, removeOnComplete: true, removeOnFail: 10 });
    }

    public static async insert(sourceFilePath: string, rtmpOuputPath: string, redisConfig?: ConnectionConfig): Promise<void> {
        const queueName = StreamLinker.genQueueName(rtmpOuputPath);
        let queue = new Queue(queueName, {
            connection: redisConfig || StreamLinker.getDefaultConnectionQueue()
        });
        await queue.add(queueName, {
            sourceFilePath: sourceFilePath,
            appendMode: false,
            endlessMode: true,
            phase: appendPhase.INSERT
        }, { priority: 10, removeOnComplete: true, removeOnFail: 10 });
    }

    public static getDefaultConnectionQueue(): ConnectionConfig {
        return redisConnectionDefault;
    }

    public static genQueueName(input: string): string {
        return `stream-linker-${md5(input)}`;
    }

    private _hlsManifestPath(): string {
        if (this.hlsManifestPath) return this.hlsManifestPath;

        const pathParse = path.parse(this.startInputFilePath);
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
        this._ffmpegProcess = ffmpeg(this.hlsManifestPath)
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
            });

        this._ffmpegProcess.run();
    }

    private async _apendDefault(): Promise<void> {
        if (this.streamLeft < 1000 && this.appendStatus == appendStatus.PENDING) {
            await this.queue.add(this._queueName, {
                sourceFilePath: this.standbyInputFilePath || this.startInputFilePath,
                appendMode: true,
                endlessMode: true,
                phase: appendPhase.APPEND
            }, { priority: 9999, removeOnComplete: true, removeOnFail: 10 });
            console.log("Append default", "reason frames left", this.streamLeft);
        }
    }

    private _isExistManifestPath(): boolean {
        return fs.existsSync(this.hlsManifestPath);
    }

    private async _queueInfo(): Promise<void> {
        const jobCounts = await this.queue.getJobCounts();
        let info: Array<string> = [];
        for (let i in jobCounts) {
            info.push(`${i} ${jobCounts[i]}`);
        }
        console.log("Queue information:", info.join(' | '));
    }
}