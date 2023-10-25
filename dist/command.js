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
program
    .name('stream-linker')
    .description('Seamless Streaming using StreamLinker CLI')
    .version('1.0.0');
program.command('start')
    .description('Launch Your Stream with StreamLinker')
    .requiredOption('-i, --input <string>', 'Input Video File', isExistInput)
    .requiredOption('-o, --output <string>', 'RTMP Output URL for Live Streaming', isRtmp)
    .option('-s, --standby <string>', 'Standby Video for No Signal', isExistInput)
    .action((options) => {
    let streamOptions = {
        rtmpOuputPath: options.output,
        startInputFilePath: options.input,
    };
    if (options.standby) {
        streamOptions.standbyInputFilePath = options.standby;
    }
    let stream = new index_1.StreamLinker(streamOptions);
    stream.start().then(() => {
        console.log("Stream started!");
    });
});
program.command('append')
    .description('Append a Video to Your Live Stream using StreamLinker')
    .requiredOption('-i, --input <string>', 'Input Video File', isExistInput)
    .requiredOption('-o, --output <string>', 'RTMP Output URL for Live Streaming', isRtmp)
    .action((options) => {
    index_1.StreamLinker.append(options.input, options.output).then(() => {
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
    .action((options) => {
    index_1.StreamLinker.insert(options.input, options.output).then(() => {
        console.log(`Insert ${options.input} to ${options.output} success`);
        process.exit();
    }).catch((e) => {
        throw e;
    });
});
program.command('stop')
    .description('Graceful Shutdown Your Live Stream using StreamLinker')
    .argument('<rtmp>', 'RTMP Output URL for Live Streaming', isRtmp)
    .action((rtmp) => {
    index_1.StreamLinker.stop(rtmp).then(() => {
        console.log(`Stoped ${rtmp}`);
        process.exit();
    }).catch((e) => {
        throw e;
    });
});
program.parse();
