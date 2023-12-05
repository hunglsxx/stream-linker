/// <reference types="node" />
import { Queue, Worker } from 'bullmq';
import { EventEmitter } from 'events';
export interface ConnectionConfig {
    host: string;
    port: number;
    username?: string;
    password?: string;
    db?: number;
}
export interface ffmpegOptions {
    input: Array<string>;
    output: Array<string>;
}
export interface StreamLinkerConfig {
    rtmpOuputPath: string;
    standbyInputFilePath?: string;
    startInputFilePath: string;
    isAppendDefault?: boolean;
    workerConnection?: ConnectionConfig;
    queueConnection?: ConnectionConfig;
    ffmpegHLSOptions?: ffmpegOptions;
    ffmpegStreamOptions?: ffmpegOptions;
}
export declare class StreamLinker extends EventEmitter {
    rtmpOuputPath: string;
    hlsManifestPath: string;
    startInputFilePath: string;
    standbyInputFilePath?: string;
    queue: Queue;
    worker: Worker;
    workerConnection: ConnectionConfig;
    queueConnection: ConnectionConfig;
    broadcastStatus: string;
    appendStatus: string;
    totalFrames: number;
    streamFrames: number;
    streamLeft: number;
    isAppendDefault: boolean;
    private _ffmpegProcess;
    private _queueName;
    ffmpegStreamOptions: ffmpegOptions;
    ffmpegHLSOptions: ffmpegOptions;
    constructor(options: StreamLinkerConfig);
    get defaultConnectionQueue(): ConnectionConfig;
    get defaultFfmpegStreamOptions(): ffmpegOptions;
    start(): Promise<void>;
    static stop(rtmpOuputPath: string, redisConfig?: ConnectionConfig): Promise<boolean>;
    static append(sourceFilePath: string, rtmpOuputPath: string, redisConfig?: ConnectionConfig): Promise<void>;
    static insert(sourceFilePath: string, rtmpOuputPath: string, redisConfig?: ConnectionConfig): Promise<void>;
    static getDefaultConnectionQueue(): ConnectionConfig;
    static genQueueName(input: string): string;
    private _hlsManifestPath;
    private _isInitStream;
    private _broadcast;
    private _appendDefault;
    private _isExistManifestPath;
    private _queueInfo;
}
