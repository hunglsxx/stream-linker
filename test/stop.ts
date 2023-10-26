import { StreamLinker } from '../src';

// wget http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4
// to get sample file before run test
StreamLinker.stop(
    'rtmps://live-api-s.facebook.com:443/rtmp/FB-6680388575343025-0-AbwG7fkIZntUQLlF'
).then(() => {
    process.exit();
});
