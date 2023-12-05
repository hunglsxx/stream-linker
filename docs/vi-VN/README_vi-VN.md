Đọc bằng các ngôn ngữ khác: [English](../en-US/README_en-US.md) | Tiếng Việt

# StreamLinker

StreamLinker là một thư viện cho phép bạn kết nối và truyền video trực tiếp từ một nguồn đầu vào đến một đường dẫn RTMP. Thư viện này sử dụng các công nghệ ffmpeg, bullmq và hls-maker để xử lý video.

## Cài đặt

```bash
npm install stream-linker
```

## Ghi chú
- Đảm bảo bạn đã cài đặt ffmpeg và các thư viện cần thiết trước khi sử dụng thư viện này.
- Đảm bảo bạn đã cài đặt và chạy Redis trên hệ thống của bạn, vì StreamLinker sử dụng BullMQ, một thư viện hàng đợi dựa trên Redis. Bạn có thể tham khảo tài liệu của BullMQ để biết cách cấu hình Redis mở rộng.

## Sử dụng
```javascript
const { StreamLinker, StreamLinkerConfig } = require('stream-linker');

const options: StreamLinkerConfig = {
    rtmpOuputPath: 'rtmp://example.com/live/streamkey',
    startInputFilePath: '/đường/dẫn/đến/tập/tin/nguồn/của/bạn',
    // ... các tùy chọn khác cần thiết
};

const linker = new StreamLinker(options);

// Bắt đầu truyền video trực tiếp
linker.start();
```
### Video hướng dẫn
[![Video hướng dẫn](http://img.youtube.com/vi/-30Znc7hMwE/0.jpg)](http://www.youtube.com/watch?v=-30Znc7hMwE "Truyền trực tiếp với Stream Linker")

## API

### Lớp: StreamLinker
#### Constructor
```javascript
new StreamLinker(options: StreamLinkerConfig);
```
Tạo một thể hiện mới của StreamLinker.

#### Phương thức: start
```javascript
linker.start(): Promise<void>
```
Khởi tạo truyền video trực tiếp. Phương thức này sẽ bắt đầu quá trình chuyển đổi video và truyền nó đến đường dẫn RTMP được cung cấp.

#### Phương thức: append
```javascript
StreamLinker.append(sourceFilePath: string, rtmpOuputPath: string, redisConfig?: ConnectionConfig): Promise<void>
```
Thêm video vào luồng trực tiếp. Phương thức này cho phép bạn thêm các đoạn video bổ sung vào cuối luồng đang tiếp diễn.

#### Phương thức: insert
```javascript
StreamLinker.insert(sourceFilePath: string, rtmpOuputPath: string, redisConfig?: ConnectionConfig): Promise<void>
```
Chèn video vào luồng trực tiếp. Phương thức này cho phép bạn chèn các đoạn video bổ sung vào giữa luồng đang tiếp diễn.

#### Phương thức: stop
```javascript
StreamLinker.stop(rtmpOuputPath: string, redisConfig?: ConnectionConfig): Promise<boolean>
```
Dừng truyền video trực tiếp cho đường dẫn đầu ra RTMP cụ thể.

### Cấu hình
Giao diện: StreamLinkerConfig
```javascript
interface StreamLinkerConfig {
    rtmpOuputPath: string; 
    standbyInputFilePath?: string;
    isAppendDefault?: boolean;
    startInputFilePath: string;
    workerConnection?: ConnectionConfig,
    queueConnection?: ConnectionConfig,
    ffmpegHLSOptions?: ffmpegOptions,
    ffmpegStreamOptions?: ffmpegOptions
}
```
- `rtmpOuputPath` (chuỗi): Luồng RTMP đích.

- `startInputFilePath` (chuỗi): Đường dẫn đến tệp video nguồn.

- `standbyInputFilePath` (tùy chọn, chuỗi): Đường dẫn đến một tệp video sao lưu. Kích hoạt khi video nguồn kết thúc. Nếu không cung cấp, video nguồn sẽ được lặp lại.

- `isAppendDefault` (tùy chọn, boolean): Giá trị mặc định là `true`. Nếu là `false`, luồng sẽ dừng khi nguồn video kết thúc (không lặp lại).

- `workerConnection` (tùy chọn, ConnectionConfig): Kết nối Redis cho worker.

- `queueConnection` (tùy chọn, ConnectionConfig): Kết nối Redis cho hàng đợi.

- `ffmpegHLSOptions` (tùy chọn) Tùy chọn ffmpeg cho việc chuyển đổi video đầu vào thành HLS.

- `ffmpegStreamOptions` (tùy chọn) Tùy chọn ffmpeg cho truyền video trực tiếp.

Cấu hình cho StreamLinker. Bao gồm thông tin cần thiết để khởi tạo và cấu hình truyền video trực tiếp.

## Ví dụ
```javascript
const { StreamLinker, StreamLinkerConfig } = require('stream-linker');

const redisConfig = {
    host: '127.0.0.1', 
    port: 6379,
    username: 'default',
    password: 'password',
    db: 0
}

const options: StreamLinkerConfig = {
    rtmpOuputPath: 'rtmp://example.com/live/streamkey',
    startInputFilePath: '/đường/dẫn/đến/video/nguồn.mp4',
    standbyInputFilePath: '/đường/dẫn/đến/video/sao/lưu.mp4', // Tùy chọn
    workerConnection: redisConfig, // Tùy chọn
    queueConnection: redisConfig, // Tùy chọn
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
    }, // Tùy chọn
    ffmpegHLSOptions: { 
        input: ['...'], 
        output: ['...']
    }, // Tùy chọn
    
};

const linker = new StreamLinker(options);

// Bắt đầu truyền video trực tiếp
linker.start();

// Thêm video bổ sung vào luồng trực tiếp 
// Tham số redisConfig là tùy chọn
StreamLinker.append('/đường/dẫn/đến/tệp/nguồn/khác', 'rtmp://example.com/live/streamkey', redisConfig);

// Chèn video bổ sung vào luồng trực tiếp
// Tham số redisConfig là tùy chọn
StreamLinker.insert('/đường/dẫn/đến/tệp/nguồn/khác', 'rtmp://example.com/live/streamkey', redisConfig);

// Dừng truyền video trực tiếp
// Tham số redisConfig là tùy chọn
StreamLinker.stop('rtmp://example.com/live/streamkey', redisConfig);

// Các sự kiện
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

## Giao diện dòng lệnh (CLI)
StreamLinker cung cấp một giao diện dòng lệnh cho truyền video mượt mà. Dưới đây là các lệnh có sẵn và cách sử dụng của chúng:

### Cài đặt
Cài đặt StreamLinker toàn cục bằng npm:

```bash
npm install -g stream-linker
```

### Lệnh Start
Bạn có thể sử dụng `-h` hoặc `--help` để xem các tùy chọn có sẵn
```bash
stream-linker -h
```

Bắt đầu luồng của bạn với StreamLinker:
```bash
stream-linker start -i <đường/dẫn/nguồn> -o <đường/dẫn/ra> [-s <đường/dẫn/sao/lưu>]
```
- ```-i, --input <đường/dẫn/nguồn>```: Đường dẫn đến tệp video nguồn. Phải được chỉ định.
- ```-o, --output <đường/dẫn/ra>```: Đường dẫn đầu ra RTMP cho truyền video trực tiếp. Phải được chỉ định.
- ```-s, --standby <đường/dẫn/sao/lưu>``` (tùy chọn): Đường dẫn đến video sao lưu cho trường hợp không có tín hiệu.
- ... sử dụng `stream-linker start -h` để xem các tùy chọn có sẵn

Ví dụ:
```bash
stream-linker start -i /đường/dẫn/đến/tệp/nguồn/video.mp4 -o rtmp://example.com/live/streamkey -s /đường/dẫn/đến/tệp/sao/lưu/video.mp4
```

### Lệnh Append
Thêm một video vào luồng trực tiếp của bạn:
```bash
stream-linker append -i <đường/dẫn/nguồn> -o <đường/dẫn/ra>
```
- ```-i, --input <đường/dẫn/nguồn>```: Đường dẫn đến tệp video nguồn. Phải được chỉ định.
- ```-o, --output <đường/dẫn/ra>```: Đường dẫn đầu ra RTMP cho truyền video trực tiếp. Phải được chỉ định.
- ... sử dụng `stream-linker append -h` để xem các tùy chọn có sẵn

Ví dụ:
```bash
stream-linker append -i /đường/dẫn/đến/video/khác.mp4 -o rtmp://example.com/live/streamkey
```

### Lệnh Insert
Chèn một video vào luồng trực tiếp của bạn:
```bash
stream-linker insert -i <đường/dẫn/nguồn> -o <đường/dẫn/ra>
```
- ```-i, --input <đường/dẫn/nguồn>```: Đường dẫn đến tệp video nguồn. Phải được chỉ định.
- ```-o, --output <đường/dẫn/ra>```: Đường dẫn đầu ra RTMP cho truyền video trực tiếp. Phải được chỉ định.
- ... sử dụng `stream-linker insert -h` để xem các tùy chọn có sẵn

Ví dụ:
```bash
stream-linker insert -i /đường/dẫn/đến/video/khác.mp4 -o rtmp://example.com/live/streamkey
```

### Lệnh Stop
Dừng truyền video trực tiếp cho một URL đầu ra cụ thể:
```bash
stream-linker stop <đường/dẫn/ra>
```
- ```<đường/dẫn/ra>```: Đường dẫn đầu ra RTMP cho truyền video trực tiếp. Phải được chỉ định.
- ... sử dụng `stream-linker stop -h` để xem các tùy chọn có sẵn

Ví dụ:
```bash
stream-linker stop rtmp://example.com/live/streamkey
```

Chú ý:
- Đảm bảo bạn đã cài đặt StreamLinker toàn cầu bằng lệnh npm install -g stream-linker trước khi sử dụng CLI.
- Đảm bảo cả tệp video nguồn và tệp video sao lưu tồn tại tại các đường dẫn được chỉ định.

## Hỗ trợ
Liên hệ với tác giả: hunglsxx@gmail.com

## Giấy phép
Thư viện này được phát hành theo Giấy phép MIT.