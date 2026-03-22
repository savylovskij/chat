import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Redirect,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequestUploadUrlDto } from '@shared/core';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import { MediaService } from './media.service';

@ApiTags('Media')
@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Get presigned upload URL' })
  async requestUploadUrl(
    @CurrentUser() user: { userId: string },
    @Body() dto: RequestUploadUrlDto,
  ) {
    const result = await this.mediaService.requestUploadUrl(
      user.userId,
      dto.fileName,
      dto.mimeType,
      dto.fileSize,
    );
    return { data: result };
  }

  @Post(':mediaId/confirm')
  @ApiOperation({ summary: 'Confirm file upload and generate thumbnail' })
  async confirmUpload(
    @CurrentUser() user: { userId: string },
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
  ) {
    const result = await this.mediaService.confirmUpload(mediaId, user.userId);
    return { data: { mediaId: result.id, status: result.status } };
  }

  @Get(':mediaId')
  @Redirect()
  @ApiOperation({ summary: 'Get presigned download URL (redirect)' })
  async getMedia(@Param('mediaId', ParseUUIDPipe) mediaId: string) {
    const downloadUrl = await this.mediaService.getDownloadUrl(mediaId);
    return { url: downloadUrl, statusCode: 302 };
  }

  @Get(':mediaId/thumbnail')
  @Redirect()
  @ApiOperation({ summary: 'Get thumbnail download URL (redirect)' })
  async getThumbnail(@Param('mediaId', ParseUUIDPipe) mediaId: string) {
    const thumbnailUrl = await this.mediaService.getThumbnailUrl(mediaId);

    if (thumbnailUrl === null || thumbnailUrl === undefined) {
      return { url: '', statusCode: 404 };
    }

    return { url: thumbnailUrl, statusCode: 302 };
  }
}
