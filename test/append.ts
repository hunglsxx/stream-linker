import { StreamLinker } from '../src';
import path from 'path';

// wget http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4
// to get sample file before run test
StreamLinker.append(
    `${path.join(__dirname, '/sample-video/BigBuckBunny.mp4')}`,
    'rtmps://live-api-s.facebook.com:443/rtmp/FB-6662498707132012-0-AbyD8VExJ4bnvqsf'
).then(() => {
    process.exit();
});
