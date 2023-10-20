import { Queue, Worker } from 'bullmq';
export interface ConnectionConfig {
    host: string;
    port: number;
}
export interface StreamLinkerConfig {
    rtmpOuputPath: string;
    standbyInputFilePath?: string;
    startInputFilePath: string;
    workerConnection?: ConnectionConfig;
    queueConnection?: ConnectionConfig;
}
export declare class StreamLinker {
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
    constructor(options: StreamLinkerConfig);
    get defaultConnectionQueue(): ConnectionConfig;
    start(): Promise<void>;
    static getDefaultConnectionQueue(): ConnectionConfig;
    static append(sourceFilePath: string, rtmpOuputPath: string, redisConfig?: ConnectionConfig): Promise<void>;
    private _hlsManifestPath;
    private _isInitStream;
    private _broadcast;
    private _apendDefault;
    private _isExistManifestPath;
}
