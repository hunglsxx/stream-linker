import { StreamLinker } from '../dist';
import path from 'path';

// wget http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4 
// to get sample file before run test
let stream = new StreamLinker({
    rtmpOuputPath: 'rtmps://live-api-s.facebook.com:443/rtmp/FB-6656554244393125-0-Aby2MpcdW1Ap6iWy',
    startInputFilePath: `${path.join(__dirname, 'sample-video/ForBiggerBlazes.mp4')}`,
});

stream.start().then(() => {
    console.log("Stream started");
});
