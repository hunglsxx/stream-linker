import { StreamLinker } from '../dist';
import path from 'path';

// wget http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4
// to get sample file before run test
StreamLinker.append(
    `${path.join(__dirname, '/sample-video/BigBuckBunny.mp4')}`,
    'rtmps://live-api-s.facebook.com:443/rtmp/FB-6656554244393125-0-Aby2MpcdW1Ap6iWy'
).then(() => {
    process.exit();
});
