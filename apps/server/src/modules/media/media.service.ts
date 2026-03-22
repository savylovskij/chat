import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  IMAGE_MIME_TYPES,
  VIDEO_MIME_TYPES,
  VOICE_MIME_TYPES,
} from './config/media-mime-types.config';
import { MEDIA_SIZE_LIMITS } from './config/media-size-limits.config';
import { PRESIGNED_URL_EXPIRY } from './config/presigned-url-expiry.config';
import { MediaEntity } from './entities/media.entity';
import { MediaStatus } from './enums/media-status.enum';
import { MediaType } from './enums/media-type.enum';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly bucket: string;

  constructor(
    @Inject('S3_CLIENT') private readonly s3Client: S3Client,
    @InjectRepository(MediaEntity)
    private readonly mediaRepository: Repository<MediaEntity>,
  ) {
    this.bucket = process.env.S3_BUCKET ?? '';
  }

  async requestUploadUrl(
    userId: string,
    fileName: string,
    mimeType: string,
    fileSize: number,
  ): Promise<Record<'uploadUrl' | 'mediaId' | 'mediaUrl', string>> {
    const mediaType = this.resolveMediaType(mimeType);
    this.validateFileSize(mediaType, fileSize);

    const media = this.mediaRepository.create({
      userId,
      fileName,
      mimeType,
      fileSize,
      type: mediaType,
      status: MediaStatus.PENDING,
      s3Key: `uploads/${userId}/${Date.now()}-${fileName}`,
    });

    const saved = await this.mediaRepository.save(media);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: saved.s3Key,
      ContentType: mimeType,
      ContentLength: fileSize,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: PRESIGNED_URL_EXPIRY.UPLOAD,
    });

    return {
      uploadUrl,
      mediaId: saved.id,
      mediaUrl: `/media/${saved.id}`,
    };
  }

  async confirmUpload(mediaId: string, userId: string): Promise<MediaEntity> {
    const media = await this.mediaRepository.findOne({
      where: { id: mediaId, userId },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    if (media.status === MediaStatus.UPLOADED) {
      return media;
    }

    await this.verifyS3Object(media.s3Key);

    if (this.isImage(media.mimeType)) {
      await this.generateThumbnail(media);
    }

    media.status = MediaStatus.UPLOADED;
    return this.mediaRepository.save(media);
  }

  async getDownloadUrl(mediaId: string): Promise<string> {
    const media = await this.mediaRepository.findOne({
      where: { id: mediaId },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    if (media.status !== MediaStatus.UPLOADED) {
      throw new BadRequestException('Media is not yet uploaded');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: media.s3Key,
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn: PRESIGNED_URL_EXPIRY.DOWNLOAD,
    });
  }

  async getThumbnailUrl(mediaId: string): Promise<string | null> {
    const media = await this.mediaRepository.findOne({
      where: { id: mediaId },
    });

    if (media?.thumbnailS3Key === undefined || media.thumbnailS3Key === null) {
      return null;
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: media.thumbnailS3Key,
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn: PRESIGNED_URL_EXPIRY.DOWNLOAD,
    });
  }

  private resolveMediaType(mimeType: string): MediaType {
    if (IMAGE_MIME_TYPES.includes(mimeType)) {
      return MediaType.IMAGE;
    }

    if (VIDEO_MIME_TYPES.includes(mimeType)) {
      return MediaType.VIDEO;
    }

    if (VOICE_MIME_TYPES.includes(mimeType)) {
      return MediaType.VOICE;
    }

    return MediaType.FILE;
  }

  private validateFileSize(type: MediaType, fileSize: number): void {
    const limits: Record<MediaType, number> = {
      [MediaType.IMAGE]: MEDIA_SIZE_LIMITS.IMAGE_MAX_SIZE,
      [MediaType.VIDEO]: MEDIA_SIZE_LIMITS.VIDEO_MAX_SIZE,
      [MediaType.FILE]: MEDIA_SIZE_LIMITS.FILE_MAX_SIZE,
      [MediaType.VOICE]: MEDIA_SIZE_LIMITS.FILE_MAX_SIZE,
    };

    const maxSize = limits[type];

    if (fileSize > maxSize) {
      const maxMb = Math.round(maxSize / (1024 * 1024));
      throw new BadRequestException(`File size exceeds ${maxMb}MB limit for ${type}`);
    }
  }

  private async verifyS3Object(s3Key: string): Promise<void> {
    try {
      await this.s3Client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: s3Key }));
    } catch {
      throw new BadRequestException('File has not been uploaded to storage');
    }
  }

  private isImage(mimeType: string): boolean {
    return IMAGE_MIME_TYPES.includes(mimeType);
  }

  private async generateThumbnail(media: MediaEntity): Promise<void> {
    try {
      const sharp = await import('sharp');

      const getCommand = new GetObjectCommand({
        Bucket: this.bucket,
        Key: media.s3Key,
      });

      const response = await this.s3Client.send(getCommand);
      const bodyStream = response.Body;

      if (!bodyStream) {
        return;
      }

      const chunks: Buffer[] = [];
      for await (const chunk of bodyStream as AsyncIterable<Buffer>) {
        chunks.push(chunk);
      }
      const imageBuffer = Buffer.concat(chunks);

      const thumbnailBuffer = await sharp
        .default(imageBuffer)
        .resize(200, 200, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toBuffer();

      const thumbnailKey = media.s3Key.replace('uploads/', 'thumbnails/') + '-thumb.jpg';

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: thumbnailKey,
          Body: thumbnailBuffer,
          ContentType: 'image/jpeg',
        }),
      );

      media.thumbnailS3Key = thumbnailKey;
    } catch (error) {
      this.logger.warn(`Failed to generate thumbnail for media ${media.id}`, error);
    }
  }
}
