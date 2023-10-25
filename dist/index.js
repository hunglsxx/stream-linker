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
const processSignal = {
    STOP: 'stop',
    PAUSE: 'pause'
};
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
        this._queueName = StreamLinker.genQueueName(this.rtmpOuputPath);
        this.workerConnection = options.workerConnection || this.defaultConnectionQueue;
        this.queueConnection = options.queueConnection || this.defaultConnectionQueue;
        if (options.standbyInputFilePath && fs_1.default.existsSync(options.standbyInputFilePath)) {
            this.standbyInputFilePath = options.standbyInputFilePath;
        }
        this.queue = new bullmq_1.Queue(this._queueName, {
            connection: that.queueConnection
        });
        this.worker = new bullmq_1.Worker(this._queueName, async (job) => {
            if (job.name === `signal-${processSignal.STOP}`) {
                let allJobs = await this.queue.getJobs();
                for (const rmJob of allJobs) {
                    if (rmJob.id !== job.id)
                        await rmJob.remove();
                }
                return { 'signal': processSignal.STOP };
            }
            else {
                let makerData = {
                    hlsManifestPath: that.hlsManifestPath,
                    appendMode: job.data.appendMode,
                    endlessMode: job.data.endlessMode,
                    sourceFilePath: job.data.sourceFilePath
                };
                switch (job.data.phase) {
                    case appendPhase.START:
                        let makerStart = new hls_maker_1.HLSMaker(makerData);
                        await makerStart.conversion(async (progress) => {
                            that.totalFrames = progress.frames;
                            that.appendStatus = appendStatus.DISABLED;
                            await job.updateProgress(progress);
                        });
                        break;
                    case appendPhase.INSERT:
                        that.appendStatus = appendStatus.DISABLED;
                        let sourceHlsManifestPath = path_1.default.join((path_1.default.parse(makerData.hlsManifestPath)).dir, `${(path_1.default.parse(makerData.sourceFilePath)).name}.m3u8`);
                        let sourceHls = new hls_maker_1.HLSMaker({
                            sourceFilePath: makerData.sourceFilePath,
                            hlsManifestPath: sourceHlsManifestPath,
                            appendMode: false,
                            endlessMode: makerData.endlessMode
                        });
                        let makerInsert = await sourceHls.conversion();
                        await hls_maker_1.HLSMaker.insert({
                            hlsManifestPath: makerData.hlsManifestPath,
                            sourceHlsManifestPath: sourceHlsManifestPath,
                            splicePercent: (((that.totalFrames - that.streamLeft) / that.totalFrames) * 100)
                        });
                        that.totalFrames += makerInsert.frames;
                        return makerInsert;
                    default:
                        let makerAppend = new hls_maker_1.HLSMaker(makerData);
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
        this.worker.on('completed', async (job, returnvalue) => {
            if (returnvalue && returnvalue.signal === processSignal.STOP) {
                try {
                    console.log(returnvalue);
                    await that.worker.close();
                    await that.queue.close();
                    that._ffmpegProcess.kill();
                    process.exit();
                }
                catch (error) {
                    console.log(error);
                }
            }
            else {
                that.appendStatus = appendStatus.PENDING;
                if (job.data.phase !== appendPhase.START) {
                    console.log("[Appended new file]", "Current total frames", that.totalFrames);
                }
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
    static async stop(rtmpOuputPath, redisConfig) {
        const queueName = StreamLinker.genQueueName(rtmpOuputPath);
        let queue = new bullmq_1.Queue(queueName, {
            connection: redisConfig || StreamLinker.getDefaultConnectionQueue()
        });
        await queue.add(`signal-${processSignal.STOP}`, {
            signal: processSignal.STOP
        }, { removeOnComplete: true, removeOnFail: 10 });
        return true;
    }
    static async append(sourceFilePath, rtmpOuputPath, redisConfig) {
        const queueName = StreamLinker.genQueueName(rtmpOuputPath);
        let queue = new bullmq_1.Queue(queueName, {
            connection: redisConfig || StreamLinker.getDefaultConnectionQueue()
        });
        await queue.add(queueName, {
            sourceFilePath: sourceFilePath,
            appendMode: true,
            endlessMode: true,
            phase: appendPhase.APPEND
        }, { priority: 10, removeOnComplete: true, removeOnFail: 10 });
    }
    static async insert(sourceFilePath, rtmpOuputPath, redisConfig) {
        const queueName = StreamLinker.genQueueName(rtmpOuputPath);
        let queue = new bullmq_1.Queue(queueName, {
            connection: redisConfig || StreamLinker.getDefaultConnectionQueue()
        });
        await queue.add(queueName, {
            sourceFilePath: sourceFilePath,
            appendMode: false,
            endlessMode: true,
            phase: appendPhase.INSERT
        }, { priority: 10, removeOnComplete: true, removeOnFail: 10 });
    }
    static getDefaultConnectionQueue() {
        return redisConnectionDefault;
    }
    static genQueueName(input) {
        return `stream-linker-${(0, md5_1.default)(input)}`;
    }
    _hlsManifestPath() {
        if (this.hlsManifestPath)
            return this.hlsManifestPath;
        const pathParse = path_1.default.parse(this.startInputFilePath);
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
        this._ffmpegProcess = (0, fluent_ffmpeg_1.default)(this.hlsManifestPath)
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
    async _apendDefault() {
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
    _isExistManifestPath() {
        return fs_1.default.existsSync(this.hlsManifestPath);
    }
    async _queueInfo() {
        const jobCounts = await this.queue.getJobCounts();
        let info = [];
        for (let i in jobCounts) {
            info.push(`${i} ${jobCounts[i]}`);
        }
        console.log("Queue information:", info.join(' | '));
    }
}
exports.StreamLinker = StreamLinker;
