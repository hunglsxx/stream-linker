# StreamLinker

StreamLinker is a library that allows you to connect and livestream video data from an input source to an RTMP path. This library utilizes ffmpeg and hls-maker technologies for video processing.

## Installation

```bash
npm install stream-linker
```

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
Configuration for StreamLinker. Includes necessary information for initializing and configuring the livestream.

## Example
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

// Append additional video to the live stream
StreamLinker.append('/path/to/another/source/file', 'rtmp://example.com/live/streamkey');
```

## Notes
- Make sure you have ffmpeg and necessary libraries installed before using this library.
- You can also provide Redis connection configurations via workerConnection and queueConnection (defaults to localhost:6379).

## Support
Contact the author: hunglsxx@gmail.com

## License
This library is released under the MIT License.