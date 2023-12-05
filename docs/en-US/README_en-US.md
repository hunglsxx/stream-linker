Read this in other languages: English | [Tiếng Việt](../vi-VN/README_vi-VN.md)

# StreamLinker

StreamLinker is a library that allows you to connect and livestream video data from an input source to an RTMP path. This library utilizes ffmpeg, bullmq and hls-maker technologies for video processing.

## Installation

```bash
npm install stream-linker
```

## Notes
- Make sure you have ffmpeg and necessary libraries installed before using this library.
- Make sure you have Redis installed and running on your system, as StreamLinker uses BullMQ, a Redis-based queue library. You can refer to BullMQ's documentation for advanced Redis configurations.

## Usage
```javascript
const { StreamLinker, StreamLinkerConfig } = require('stream-linker');

const options: StreamLinkerConfig = {
    rtmpOuputPath: 'rtmp://example.com/live/streamkey',
    startInputFilePath: '/path/to/your/source/file',
    // ... other options as needed
};

const linker = new StreamLinker(options);

// Start livestreaming video
linker.start();
```
### Tutorial Video
[![Tutorial Video](http://img.youtube.com/vi/-30Znc7hMwE/0.jpg)](http://www.youtube.com/watch?v=-30Znc7hMwE "Livestream With Stream Linker")

## API

### Class: StreamLinker
#### Constructor
```javascript
new StreamLinker(options: StreamLinkerConfig);
```
Creates a new instance of StreamLinker.

#### Method: start
```javascript
linker.start(): Promise<void>
```
Initiates the video livestream. This method will begin the video conversion process and stream it to the provided RTMP path.

#### Method: append
```javascript
StreamLinker.append(sourceFilePath: string, rtmpOuputPath: string, redisConfig?: ConnectionConfig): Promise<void>
```
Appends video to the live stream. This method allows you to add additional segments to the ongoing stream.

#### Method: insert
```javascript
StreamLinker.insert(sourceFilePath: string, rtmpOuputPath: string, redisConfig?: ConnectionConfig): Promise<void>
```
Insert video to the live stream. This method allows you to insert additional segments to the ongoing stream.

#### Method: stop
```javascript
StreamLinker.stop(rtmpOuputPath: string, redisConfig?: ConnectionConfig): Promise<boolean>
```
Stops the livestream for the specified RTMP output path.

### Configuration
Interface: StreamLinkerConfig
```javascript
interface StreamLinkerConfig {
    rtmpOuputPath: string; 
    standbyInputFilePath?: string;
    startInputFilePath: string;
    isAppendDefault?: boolean;
    workerConnection?: ConnectionConfig,
    queueConnection?: ConnectionConfig,
    ffmpegHLSOptions?: ffmpegOptions,
    ffmpegStreamOptions?: ffmpegOptions
}
```
- `rtmpOuputPath` (string): Destination RTMP stream.

- `startInputFilePath` (string): Path to the source video file.

- `standbyInputFilePath` (optional, string): Path to a backup video file. Activated if the source video ends. If not provided, the source video is looped.

- `isAppendDefault` (optional, boolean): Default is `true`. If it is `false` stream will be stopped when video source ends (no loop)

- `workerConnection` (optional, ConnectionConfig): Redis connection for the worker.

- `queueConnection` (optional, ConnectionConfig): Redis connection for the queue.

- `ffmpegHLSOptions` (optional) Ffmpeg options for conversion input video to HLS

- `ffmpegStreamOptions` (optional) Ffmpeg options for live streaming

Configuration for StreamLinker. Includes necessary information for initializing and configuring the livestream.

## Example
```javascript
const { StreamLinker, StreamLinkerConfig } = require('stream-linker');

const redisConfig = {
    host: '127.0.0.1', 
    port: 6379,
    username: 'default',
    password: 'passWord',
    db: 0
}

const options: StreamLinkerConfig = {
    rtmpOuputPath: 'rtmp://example.com/live/streamkey',
    startInputFilePath: '/path/to/source/video.mp4',
    standbyInputFilePath: '/path/to/standby/video.mp4', // Optional
    workerConnection: redisConfig, // Optional
    queueConnection: redisConfig, // Optional
    ffmpegStreamOptions: {
        input: [
            '-re', 
            '-live_start_index', '50'
        ], 
        output: [
            '-c', 'copy', 
            '-preset', 'veryfast', 
            '-f', 'flv', 
            '-flvflags', 'no_duration_filesize'
        ]
    }, // Optional
    ffmpegHLSOptions: { 
        input: ['...'], 
        output: ['...']
    }, // Optional
    
};

const linker = new StreamLinker(options);

// Start livestreaming video
linker.start();

// Append additional video to the live stream 
// redisConfig param is optional
StreamLinker.append('/path/to/another/source/file', 'rtmp://example.com/live/streamkey', redisConfig);

// Insert additional video to the live stream
// redisConfig param is optional
StreamLinker.insert('/path/to/another/source/file', 'rtmp://example.com/live/streamkey', redisConfig);

// Stop the livestream
// redisConfig param is optional
StreamLinker.stop('rtmp://example.com/live/streamkey', redisConfig);

// Events tracking
stream.on('startStream', function (ffmpegCommand) {
    console.log("onStartStream", ffmpegCommand)
});

stream.on('progressStream', function (totalFrames, progressFrames) {
    console.log("onProgressStream", totalFrames, progressFrames);
});

stream.on('endStream', function (streamOutput) {
    console.log("onEndStream", streamOutput);
});

stream.on('errorStream', function (err, stdout, stderr) {
    console.log("err", err, "stdout", stdout, "stderr", stderr);
});

stream.on('completed', function (value) {
    console.log("onCompleted", value);
});
```

## Command Line Interface (CLI)
StreamLinker provides a CLI for seamless streaming. Below are the available commands and their usage:

### Installation
Install StreamLinker globally using npm:

```bash
npm install -g stream-linker
```

### Start Command
You can use `-h` or `--help` to see the available options.
```bash
stream-linker -h
```

Launch your stream with StreamLinker:
```bash
stream-linker start -i <inputPath> -o <outputUrl> [-s <standbyPath>]
```
- ```-i, --input <inputPath>```: Path to the input video file. Must be specified.
- ```-o, --output <outputUrl>```: RTMP output URL for live streaming. Must be specified.
- ```-s, --standby <standbyPath>``` (optional): Path to the standby video for no signal.
- ... use `stream-linker start -h` to see the available options.

Example:
```bash
stream-linker start -i /path/to/input/video.mp4 -o rtmp://example.com/live/streamkey -s /path/to/standby/video.mp4
```

### Append Command
Append a video to your live stream:
```bash
stream-linker append -i <inputPath> -o <outputUrl>
```
- ```-i, --input <inputPath>```: Path to the input video file. Must be specified.
- ```-o, --output <outputUrl>```: RTMP output URL for live streaming. Must be specified.
- ... use `stream-linker append -h` to see the available options.

Example:
```bash
stream-linker append -i /path/to/another/video.mp4 -o rtmp://example.com/live/streamkey
```

### Insert Command
Insert a video to your live stream:
```bash
stream-linker insert -i <inputPath> -o <outputUrl>
```
- ```-i, --input <inputPath>```: Path to the input video file. Must be specified.
- ```-o, --output <outputUrl>```: RTMP output URL for live streaming. Must be specified.
- ... use `stream-linker insert -h` to see the available options.

Example:
```bash
stream-linker insert -i /path/to/another/video.mp4 -o rtmp://example.com/live/streamkey
```

### Stop Command
Stop a livestream for a specific output URL:
```bash
stream-linker stop <outputUrl>
```
- ```<outputUrl>```: RTMP output URL for live streaming. Must be specified.
- ... use `stream-linker stop -h` to see the available options.

Example:
```bash
stream-linker stop rtmp://example.com/live/streamkey
```

Note:
- Make sure you have installed StreamLinker globally using npm install -g stream-linker before using the CLI.
- Ensure that both the input and standby video files exist at the specified paths.

## Support
Contact the author: hunglsxx@gmail.com

## License
This library is released under the MIT License.