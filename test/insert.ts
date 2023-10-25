import { StreamLinker } from '../src';
import path from 'path';

StreamLinker.insert(
    `${path.join(__dirname, 'sample-video/ForBiggerBlazes.mp4')}`,
    'rtmps://live-api-s.facebook.com:443/rtmp/FB-6672187432829806-0-AbzWVfvWUMh7ugPJ'
).then(() => {
    process.exit();
});
