import { StreamLinker } from '../src';
import path from 'path';

// wget http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4 
// to get sample file before run test
let stream = new StreamLinker({
    rtmpOuputPath: 'rtmps://live-api-s.facebook.com:443/rtmp/FB-6672187432829806-0-AbzWVfvWUMh7ugPJ',
    startInputFilePath: `${path.join(__dirname, 'sample-video/BigBuckBunny.mp4')}`,
});

stream.start().then(() => {
    console.log("Stream started");
});
