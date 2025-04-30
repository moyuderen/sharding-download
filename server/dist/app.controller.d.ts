import { Response } from 'express';
import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    index(): Promise<string>;
    getFileMetadata(filename: string, res: Response): Promise<void>;
    downloadFile(postData: {
        url: string;
        index: number;
    }, headers: Record<string, string>, res: Response, error: string): Promise<void>;
}
