import { Response } from 'express';
import { Stats } from 'fs';
export declare class FileService {
    private readonly storagePath;
    getSafePath(filename: string): string;
    validateFile(filename: string): Promise<{
        filePath: string;
        stats: Stats;
    }>;
    generateETag(filename: string): Promise<string>;
    sendFullFile(res: Response, filePath: string, filename: string, stats: Stats): Promise<void>;
    handleRangeRequest(res: Response, filename: string, filePath: string, rangeHeader: string, fileSize: number): Promise<void>;
    private parseRangeHeader;
    handleDownloadError(error: Error, res: Response): void;
}
