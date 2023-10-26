import { StreamLinker } from '../src';
import path from 'path';

StreamLinker.insert(
    `${path.join(__dirname, 'sample-video/ForBiggerBlazes.mp4')}`,
    'rtmps://live-api-s.facebook.com:443/rtmp/FB-6680388575343025-0-AbwG7fkIZntUQLlF'
).then(() => {
    process.exit();
});
