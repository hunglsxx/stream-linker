import { StreamLinker } from '../src';

// wget http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4
// to get sample file before run test
StreamLinker.stop(
    'rtmps://live-api-s.facebook.com:443/rtmp/FB-6827819137266634-0-AbxwP907x11dWPUW'
).then(() => {
    process.exit();
});
