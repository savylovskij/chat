import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { createS3Client } from '../../config/s3.config';

import { MediaEntity } from './entities/media.entity';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [TypeOrmModule.forFeature([MediaEntity])],
  controllers: [MediaController],
  providers: [
    {
      provide: 'S3_CLIENT',
      useFactory: () => createS3Client(),
    },
    MediaService,
  ],
  exports: [MediaService],
})
export class MediaModule {}
