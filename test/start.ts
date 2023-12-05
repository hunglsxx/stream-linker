import { StreamLinker } from '../src';
import path from 'path';

// wget http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4 
// to get sample file before run test
let stream = new StreamLinker({
    rtmpOuputPath: 'rtmps://live-api-s.facebook.com:443/rtmp/FB-6827819137266634-0-AbxwP907x11dWPUW',
    startInputFilePath: `${path.join(__dirname, 'sample-video/BigBuckBunny.mp4')}`,
    isAppendDefault: false,
    /**  Overwrite ffmpeg options to livestream
    ffmpegStreamOptions: {
        input: ['-re', '-live_start_index', '0'],
        output: [
            // '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-shortest', '-strict', 'experimental', '-preset', 'veryfast', '-f', 'flv', '-flvflags', 'no_duration_filesize'
            // '-c:v', 'copy', '-c:a', 'aac', '-f', 'flv'
            // '-c:v', 'libx264', '-preset', 'veryfast',
            // '-tune', 'zerolatency',
            // '-c:a', 'aac', '-f', 'flv',

            '-map', '0', '-c:v', 'libx264', '-crf', '18',
            // '-vf', 'format=yuv420p', 
            '-c:a', 'copy',
            // '-preset', 'veryfast',
            // '-tune', 'zerolatency',
            '-maxrate', '2000k', '-bufsize', '20000k',
            '-f', 'flv'
        ]
    }*/
});

stream.on('startStream', function (command) {
    console.log("\nonStartStream", command)
});

stream.on('progressStream', function (total, progress) {
    console.log("onProgressStream", total, progress);
});

stream.on('endStream', function (stream) {
    console.log("onEndStream", stream);
});

stream.on('errorStream', function (err, stdout, stderr) {
    console.log("err", err, "stdout", stdout, "stderr", stderr);
});

stream.on('completed', function (value) {
    console.log("onCompleted", value);
});



stream.start().then(() => {
    console.log("Stream started");
});
