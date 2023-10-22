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
    workerConnection?: ConnectionConfig,
    queueConnection?: ConnectionConfig
}
```
- `rtmpOuputPath` (string): Destination RTMP stream.

- `startInputFilePath` (string): Path to the source video file.

- `standbyInputFilePath` (optional, string): Path to a backup video file. Activated if the source video ends. If not provided, the source video is looped.

- `workerConnection` (optional, ConnectionConfig): Redis connection for the worker.

- `queueConnection` (optional, ConnectionConfig): Redis connection for the queue.

Configuration for StreamLinker. Includes necessary information for initializing and configuring the livestream.

## Example
```javascript
const { StreamLinker, StreamLinkerConfig } = require('stream-linker');

const options: StreamLinkerConfig = {
    rtmpOuputPath: 'rtmp://example.com/live/streamkey',
    startInputFilePath: '/path/to/source/video.mp4',
    standbyInputFilePath: '/path/to/standby/video.mp4', // Optional
    workerConnection: { host: '127.0.0.1', port: 6380 }, // Optional
    queueConnection: { host: '127.0.0.1', port: 6381 } // Optional
};

const linker = new StreamLinker(options);

// Start livestreaming video
linker.start();

// Append additional video to the live stream
StreamLinker.append('/path/to/another/source/file', 'rtmp://example.com/live/streamkey');

// Stop the livestream
StreamLinker.stop('rtmp://example.com/live/streamkey');
```

## Command Line Interface (CLI)
StreamLinker provides a CLI for seamless streaming. Below are the available commands and their usage:

### Installation
Install StreamLinker globally using npm:

```bash
npm install -g stream-linker
```

### Start Command
Launch your stream with StreamLinker:
```bash
stream-linker start -i <inputPath> -o <outputUrl> [-s <standbyPath>]
```
- ```-i, --input <inputPath>```: Path to the input video file. Must be specified.
- ```-o, --output <outputUrl>```: RTMP output URL for live streaming. Must be specified.
- ```-s, --standby <standbyPath>``` (optional): Path to the standby video for no signal.

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

Example:
```bash
stream-linker append -i /path/to/another/video.mp4 -o rtmp://example.com/live/streamkey
```

### Stop Command
Stop a livestream for a specific output URL:
```bash
stream-linker stop <outputUrl>
```
- ```<outputUrl>```: RTMP output URL for live streaming. Must be specified.

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