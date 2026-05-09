import { Response } from 'express';
import { Stats } from 'fs';
export declare class FileService {
    private readonly storagePath;
    private readonly rootPath;
    private readonly etagCache;
    private readonly pendingEtags;
    private readonly maxEtagCacheSize;
    getSafePath(filename: string): string;
    validateFile(filename: string): Promise<{
        filePath: string;
        stats: Stats;
    }>;
    generateETag(filePath: string): Promise<string>;
    getETag(filePath: string, stats: Stats): Promise<string>;
    sendFullFile(res: Response, filePath: string, filename: string, stats: Stats): Promise<void>;
    handleRangeRequest(res: Response, filename: string, filePath: string, rangeHeader: string, stats: Stats): Promise<void>;
    private parseRangeHeader;
    private setCachedEtag;
    private buildDownloadHeaders;
    handleDownloadError(error: Error, res: Response, fileSize?: number): void;
}
