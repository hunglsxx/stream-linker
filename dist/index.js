"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamLinker = void 0;
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const bullmq_1 = require("bullmq");
const fs_1 = __importDefault(require("fs"));
const hls_maker_1 = require("hls-maker");
const path_1 = __importDefault(require("path"));
const md5_1 = __importDefault(require("md5"));
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
const redisConnectionDefault = {
    host: '127.0.0.1',
    port: 6379
};
class StreamLinker {
    constructor(options) {
        let that = this;
        this.startInputFilePath = options.startInputFilePath;
        if (!fs_1.default.existsSync(this.startInputFilePath)) {
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
        if (options.standbyInputFilePath && fs_1.default.existsSync(options.standbyInputFilePath)) {
            this.standbyInputFilePath = options.standbyInputFilePath;
        }
        this.queue = new bullmq_1.Queue(this.rtmpOuputPath, {
            connection: that.queueConnection
        });
        this.worker = new bullmq_1.Worker(this.rtmpOuputPath, async (job) => {
            let maker = new hls_maker_1.HLSMaker({
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
            }
            else {
                that.appendStatus = appendStatus.DISABLED;
                let concate = await maker.conversion();
                that.totalFrames += concate.frames;
                return concate;
            }
        }, {
            connection: that.workerConnection,
            concurrency: 1
        });
        this.worker.on('completed', (job, returnvalue) => {
            that.appendStatus = appendStatus.PENDING;
            if (job.data.phase !== appendPhase.START) {
                console.log("[Appended new file]", "Current total frames", that.totalFrames);
            }
        });
        this.worker.on("progress", (job, progress) => {
            if (that._isInitStream(job) && that._isExistManifestPath()) {
                that._broadcast();
                that.broadcastStatus = broadcastStatus.RUNNING;
            }
        });
    }
    get defaultConnectionQueue() {
        return redisConnectionDefault;
    }
    async start() {
        await this.queue.drain();
        await this.queue.add(this.rtmpOuputPath, {
            sourceFilePath: this.startInputFilePath,
            phase: appendPhase.START,
            appendMode: false,
            endlessMode: true,
        });
    }
    static getDefaultConnectionQueue() {
        return redisConnectionDefault;
    }
    static async append(sourceFilePath, rtmpOuputPath, redisConfig) {
        let queue = new bullmq_1.Queue(rtmpOuputPath, {
            connection: redisConfig || StreamLinker.getDefaultConnectionQueue()
        });
        await queue.add(rtmpOuputPath, {
            sourceFilePath: sourceFilePath,
            appendMode: true,
            endlessMode: true,
            phase: appendPhase.APPEND
        }, { removeOnComplete: true, removeOnFail: 10 });
    }
    _hlsManifestPath() {
        if (this.hlsManifestPath)
            return this.hlsManifestPath;
        const pathParse = path_1.default.parse(this.startInputFilePath);
        // const prefix = "hls-" + new Date().getTime();
        const prefix = `hls-${(0, md5_1.default)(this.rtmpOuputPath)}`;
        const dir = `${path_1.default.join(pathParse.dir, prefix)}`;
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        return `${path_1.default.join(dir, `${pathParse.name}.m3u8`)}`;
    }
    _isInitStream(job) {
        if (job.data.phase === appendPhase.START
            && this.broadcastStatus === broadcastStatus.PENDING) {
            return true;
        }
        return false;
    }
    _broadcast() {
        (0, fluent_ffmpeg_1.default)(this.hlsManifestPath)
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
    async _apendDefault() {
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
    _isExistManifestPath() {
        return fs_1.default.existsSync(this.hlsManifestPath);
    }
}
exports.StreamLinker = StreamLinker;
