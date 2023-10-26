#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const index_1 = require("./index");
const commander_1 = require("commander");
const program = new commander_1.Command();
function isRtmp(url) {
    try {
        const URI = new URL(url);
        if (URI.protocol.startsWith('rtmp'))
            return url;
        throw new Error('Invalid output URL');
    }
    catch (error) {
        throw error;
    }
}
function isExistInput(path) {
    try {
        if (fs_1.default.existsSync(path))
            return path;
        throw new Error('Input video file is not exist');
    }
    catch (error) {
        throw error;
    }
}
function parseRedisConnection(uri) {
    try {
        const URI = new URL(uri);
        if (!URI.protocol.startsWith('redis'))
            throw new Error('Redis connection string is not valid');
        let opts = {
            host: URI.hostname,
            port: parseInt(URI.port)
        };
        if (URI.username)
            opts['username'] = URI.username;
        if (URI.password)
            opts['password'] = URI.password;
        if (URI.pathname && URI.pathname.split('/').length > 1) {
            opts['db'] = parseInt(URI.pathname.split('/')[1]);
        }
        return opts;
    }
    catch (error) {
        throw error;
    }
}
function parseFfmpegOptions(opts) {
    try {
        opts = opts.trim();
        opts = opts.replace(/\s+/g, " ");
        return opts.split(" ");
    }
    catch (error) {
        throw error;
    }
}
program
    .name('stream-linker')
    .description('Seamless Streaming using StreamLinker CLI')
    .version('1.0.0');
program.command('start')
    .description('Launch Your Stream with StreamLinker')
    .requiredOption('-i, --input <string>', 'Input Video File', isExistInput)
    .requiredOption('-o, --output <string>', 'RTMP Output URL for Live Streaming', isRtmp)
    .option('-s, --standby <string>', 'Standby Video for No Signal', isExistInput)
    .option('-r, --redis <string>', 'Redis connection string. Example: redis://username:authpassword@127.0.0.1:6380/4', parseRedisConnection)
    .option('--stream-input [string]', 'Ffmpeg Input Options for Live Streaming', parseFfmpegOptions)
    .option('--stream-output [string]', 'Ffmpeg Output Options for Live Streaming', parseFfmpegOptions)
    .option('--hls-input [string]', 'Ffmpeg Input Options for HLS Conversion', parseFfmpegOptions)
    .option('--hls-output [string]', 'Ffmpeg Output Options for HLS Conversion', parseFfmpegOptions)
    .action((options) => {
    let streamOptions = {
        rtmpOuputPath: options.output,
        startInputFilePath: options.input,
    };
    if (options.redis) {
        streamOptions.workerConnection = options.redis;
        streamOptions.queueConnection = options.redis;
    }
    if (options.standby)
        streamOptions.standbyInputFilePath = options.standby;
    let ffmpegStreamOptions = {};
    if (options.streamInput)
        ffmpegStreamOptions.input = options.streamInput;
    if (options.streamOutput)
        ffmpegStreamOptions.output = options.streamOutput;
    if (Object.keys(ffmpegStreamOptions).length)
        streamOptions.ffmpegStreamOptions = ffmpegStreamOptions;
    let ffmpegHLSOptions = {};
    if (options.hlsInput)
        ffmpegHLSOptions.input = options.hlsInput;
    if (options.hlsOutput)
        ffmpegHLSOptions.output = options.hlsOutput;
    if (Object.keys(ffmpegHLSOptions).length)
        streamOptions.ffmpegHLSOptions = ffmpegHLSOptions;
    let stream = new index_1.StreamLinker(streamOptions);
    stream.start().then(() => {
        console.log("Stream started!");
    });
});
program.command('append')
    .description('Append a Video to Your Live Stream using StreamLinker')
    .requiredOption('-i, --input <string>', 'Input Video File', isExistInput)
    .requiredOption('-o, --output <string>', 'RTMP Output URL for Live Streaming', isRtmp)
    .option('-r, --redis <string>', 'Redis connection string. Example: redis://username:authpassword@127.0.0.1:6380/4', parseRedisConnection)
    .action((options) => {
    index_1.StreamLinker.append(options.input, options.output, options === null || options === void 0 ? void 0 : options.redis).then(() => {
        console.log(`Append ${options.input} to ${options.output} success`);
        process.exit();
    }).catch((e) => {
        throw e;
    });
});
program.command('insert')
    .description('Insert a Video to Your Live Stream using StreamLinker')
    .requiredOption('-i, --input <string>', 'Input Video File', isExistInput)
    .requiredOption('-o, --output <string>', 'RTMP Output URL for Live Streaming', isRtmp)
    .option('-r, --redis <string>', 'Redis connection string. Example: redis://username:authpassword@127.0.0.1:6380/4', parseRedisConnection)
    .action((options) => {
    index_1.StreamLinker.insert(options.input, options.output, options === null || options === void 0 ? void 0 : options.redis).then(() => {
        console.log(`Insert ${options.input} to ${options.output} success`);
        process.exit();
    }).catch((e) => {
        throw e;
    });
});
program.command('stop')
    .description('Graceful Shutdown Your Live Stream using StreamLinker')
    .argument('<rtmp>', 'RTMP Output URL for Live Streaming', isRtmp)
    .option('-r, --redis <string>', 'Redis connection string. Example: redis://username:authpassword@127.0.0.1:6380/4', parseRedisConnection)
    .action((rtmp, options) => {
    index_1.StreamLinker.stop(rtmp, options === null || options === void 0 ? void 0 : options.redis).then(() => {
        console.log(`Stoped ${rtmp}`);
        process.exit();
    }).catch((e) => {
        throw e;
    });
});
program.parse();
