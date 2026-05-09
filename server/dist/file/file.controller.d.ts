import { Response } from 'express';
import { FileService } from './file.service';
import { DownloadDto } from './file.dto';
export declare class FileController {
    private readonly fileService;
    private readonly logger;
    constructor(fileService: FileService);
    getFileMetadata(filename: string, res: Response): Promise<void>;
    downloadFile(postData: DownloadDto, headers: Record<string, string>, res: Response, error: string): Promise<void>;
    private handleControllerError;
}
