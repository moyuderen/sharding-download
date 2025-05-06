import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class DownloadDto {
  @ApiProperty({
    description: '文件obs地址，或者根据业务场景对应的文件对应参数',
    examples: ['htts://obs/downloader/711.jpg', 'hgsku-ssmks'],
  })
  @IsString()
  readonly url: string;
}
