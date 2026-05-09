import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { FileModule } from './file/file.module';

@Module({
  imports: [FileModule],
  controllers: [AppController],
})
export class AppModule {}
