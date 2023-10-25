import { StreamLinker } from '../src';
import path from 'path';

// wget http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4
// to get sample file before run test
StreamLinker.append(
    `${path.join(__dirname, '/sample-video/960x400_ocean_with_audio.mkv')}`,
    'rtmps://live-api-s.facebook.com:443/rtmp/FB-6672187432829806-0-AbzWVfvWUMh7ugPJ'
).then(() => {
    process.exit();
});
