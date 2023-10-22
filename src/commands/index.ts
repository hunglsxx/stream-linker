#!/usr/bin/env node

import fs from 'fs';
import { StreamLinker, StreamLinkerConfig } from '../index';
import { Command } from 'commander';
const program = new Command();

function isRtmp(url: string): string {
    try {
        const URI = new URL(url);
        if (URI.protocol.startsWith('rtmp')) return url;

        throw new Error('Invalid output URL');
    } catch (error) {
        throw error;
    }
}

function isExistInput(path: string): string {
    try {
        if (fs.existsSync(path)) return path;

        throw new Error('Input video file is not exist');
    } catch (error) {
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
        let streamOptions: StreamLinkerConfig = {
            rtmpOuputPath: options.output,
            startInputFilePath: options.input,
        }

        if (options.standby) {
            streamOptions.standbyInputFilePath = options.standby;
        }

        let stream = new StreamLinker(streamOptions);

        stream.start().then(() => {
            console.log("Stream started!");
        });

    });

program.command('append')
    .description('Append a Video to Your Live Stream using StreamLinker')
    .requiredOption('-i, --input <string>', 'Input Video File', isExistInput)
    .requiredOption('-o, --output <string>', 'RTMP Output URL for Live Streaming', isRtmp)
    .action((options) => {
        StreamLinker.append(options.input, options.output).then(() => {
            console.log(`Append ${options.input} to ${options.output} success`);
            process.exit();
        }).catch((e) => {
            throw e;
        });
    });

program.command('stop')
    .description('Graceful Shutdown Your Live Stream using StreamLinker')
    .argument('<rtmp>', 'RTMP Output URL for Live Streaming', isRtmp)
    .action((rtmp) => {
        StreamLinker.stop(rtmp).then(() => {
            console.log(`Stoped ${rtmp}`);
            process.exit();
        }).catch((e) => {
            throw e;
        });
    });

program.parse();