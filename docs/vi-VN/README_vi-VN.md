Đọc bằng các ngôn ngữ khác: [English](../en-US/README_en-US.md) | Tiếng Việt

# StreamLinker

StreamLinker là một thư viện cho phép bạn kết nối và truyền dữ liệu video từ nguồn đầu vào đến một đường dẫn RTMP. Thư viện này sử dụng công nghệ ffmpeg, bullmq và hls-maker để xử lý video.

## Cài đặt

```bash
npm install stream-linker
```

## Ghi chú
- Hãy chắc chắn rằng bạn đã cài đặt ffmpeg và các thư viện cần thiết trước khi sử dụng thư viện này.
- Hãy chắc chắn rằng bạn đã cài đặt và đang chạy Redis trên hệ thống của bạn, vì StreamLinker sử dụng BullMQ, một thư viện hàng đợi dựa trên Redis. Bạn có thể tham khảo tài liệu BullMQ để biết cách cấu hình Redis mở rộng.

## Cách sử dụng
```javascript
const { StreamLinker, StreamLinkerConfig } = require('stream-linker');

const options: StreamLinkerConfig = {
    rtmpOuputPath: 'rtmp://example.com/live/streamkey',
    startInputFilePath: '/path/to/your/source/file',
    // ... các tùy chọn khác nếu cần
};

const linker = new StreamLinker(options);

// Bắt đầu truyền video trực tiếp
linker.start();
```

### Video Hướng dẫn
[![Video Hướng dẫn](http://img.youtube.com/vi/-30Znc7hMwE/0.jpg)](http://www.youtube.com/watch?v=-30Znc7hMwE "Truyền video trực tiếp với Stream Linker")

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
Thêm video vào luồng trực tiếp. Phương thức này cho phép bạn thêm các phân đoạn bổ sung vào luồng đang diễn ra.

#### Phương thức: stop
```javascript
StreamLinker.stop(rtmpOuputPath: string, redisConfig?: ConnectionConfig): Promise<boolean>
```
Dừng việc truyền video cho đường dẫn RTMP được chỉ định.

### Cấu hình
Giao diện: StreamLinkerConfig
```javascript
interface StreamLinkerConfig {
    rtmpOuputPath: string; 
    standbyInputFilePath?: string;
    startInputFilePath: string;
    workerConnection?: ConnectionConfig,
    queueConnection?: ConnectionConfig
}
```
- `rtmpOuputPath` (chuỗi): Luồng đích RTMP.

- `startInputFilePath` (chuỗi): Đường dẫn đến tệp video nguồn.

- `standbyInputFilePath` (tùy chọn, chuỗi): Đường dẫn đến tệp video dự phòng. Kích hoạt khi video nguồn kết thúc. Nếu không được cung cấp, video nguồn sẽ được lặp lại.

- `workerConnection` (tùy chọn, ConnectionConfig): Kết nối Redis cho worker.

- `queueConnection` (tùy chọn, ConnectionConfig): Kết nối Redis cho hàng đợi.

Cấu hình cho StreamLinker. Bao gồm thông tin cần thiết để khởi tạo và cấu hình truyền video trực tiếp.

## Ví dụ
```javascript
const { StreamLinker, StreamLinkerConfig } = require('stream-linker');

const options: StreamLinkerConfig = {
    rtmpOuputPath: 'rtmp://example.com/live/streamkey',
    startInputFilePath: '/path/to/source/video.mp4',
    standbyInputFilePath: '/path/to/standby/video.mp4', // Tùy chọn
    workerConnection: { host: '127.0.0.1', port: 6380 }, // Tùy chọn
    queueConnection: { host: '127.0.0.1', port: 6381 } // Tùy chọn
};

const linker = new StreamLinker(options);

// Bắt đầu truyền video trực tiếp
linker.start();

// Thêm video bổ sung vào luồng trực tiếp
StreamLinker.append('/path/to/another/source/file', 'rtmp://example.com/live/streamkey');

// Dừng việc truyền video
StreamLinker.stop('rtmp://example.com/live/streamkey');
```

## Command Line Interface (CLI)
StreamLinker cung cấp giao diện dòng lệnh (CLI) cho việc truyền video một cách dễ dàng. Dưới đây là các lệnh có sẵn và cách sử dụng của chúng:

### Cài đặt
Cài đặt StreamLinker toàn cầu bằng npm:

```bash
npm install -g stream-linker
```

### Lệnh Start
Khởi đầu luồng trực tiếp với StreamLinker:
```bash
stream-linker start -i <inputPath> -o <outputUrl> [-s <standbyPath>]
```
- ```-i, --input <inputPath>```: Đường dẫn đến tệp video đầu vào. Bắt buộc phải được chỉ định.
- ```-o, --output <outputUrl>```: URL đầu ra RTMP cho việc truyền video trực tiếp. Bắt buộc phải được chỉ định.
- ```-s, --standby <standbyPath>``` (tùy chọn): Đường dẫn đến tệp video dự phòng khi không có tín hiệu.

Ví dụ:
```bash
stream-linker start -i /path/to/input/video.mp4 -o rtmp://example.com/live/streamkey -s /path/to/standby/video.mp4
```

### Lệnh Append
Thêm video vào luồng trực tiếp của bạn:
```bash
stream-linker append -i <inputPath> -o <outputUrl>
```
- ```-i, --input <inputPath>```: Đường dẫn đến tệp video đầu vào. Bắt buộc phải được chỉ định.
- ```-o, --output <outputUrl>```: URL đầu ra RTMP cho việc truyền video trực tiếp. Bắt buộc phải được chỉ định.

Ví dụ:
```bash
stream-linker append -i /path/to/another/video.mp4 -o rtmp://example.com/live/streamkey
```

### Lệnh Stop
Dừng việc truyền video trực tiếp cho một URL đầu ra cụ thể:
```bash
stream-linker stop <outputUrl>
```
- ```<outputUrl>```: URL đầu ra RTMP cho việc truyền video trực tiếp. Bắt buộc phải được chỉ định.

Ví dụ:
```bash
stream-linker stop rtmp://example.com/live/streamkey
```

Lưu ý:
- Hãy chắc chắn rằng bạn đã cài đặt StreamLinker toàn cầu bằng cách sử dụng lệnh `npm install -g stream-linker` trước khi sử dụng CLI.
- Đảm bảo rằng cả hai tệp video đầu vào và dự phòng tồn tại tại các đường dẫn đã chỉ định.

## Hỗ trợ
Liên hệ tác giả: hunglsxx@gmail.com

## Giấy phép
Thư viện này được phát hành theo Giấy phép MIT.