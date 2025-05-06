import { Response } from 'express';
import { FileService } from './file.service';
export declare class FileController {
    private readonly fileService;
    constructor(fileService: FileService);
    getFileMetadata(filename: string, res: Response): Promise<void>;
    downloadFile(postData: {
        url: string;
        index: number;
    }, headers: Record<string, string>, res: Response, error: string): Promise<void>;
}
