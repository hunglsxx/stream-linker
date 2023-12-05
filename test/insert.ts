import { StreamLinker } from '../src';
import path from 'path';

StreamLinker.insert(
    `${path.join(__dirname, 'sample-video/RW20seconds_1.mp4')}`,
    'rtmps://live-api-s.facebook.com:443/rtmp/FB-6721921254523090-0-Abz3RevlgvPYqbpi'
).then(() => {
    process.exit();
});
