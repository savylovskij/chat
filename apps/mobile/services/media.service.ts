import { MessageType } from '@shared/enums/message-type.enum';
import { createUploadTask, FileSystemUploadType } from 'expo-file-system/legacy';

import { MediaAsset } from '../models/media-asset.interface';
import { UploadProgress } from '../models/upload-progress.interface';
import { UploadResult } from '../models/upload-result.interface';

import { apiClient } from './api-client';

class MediaService {
  async requestUploadUrl(
    fileName: string,
    mimeType: string,
    fileSize: number,
  ): Promise<UploadResult> {
    return apiClient.post<UploadResult>('/media/upload-url', {
      fileName,
      mimeType,
      fileSize,
    });
  }

  async uploadFile(
    fileUri: string,
    uploadUrl: string,
    mimeType: string,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<void> {
    const uploadTask = createUploadTask(
      uploadUrl,
      fileUri,
      {
        httpMethod: 'PUT',
        headers: { 'Content-Type': mimeType },
        uploadType: FileSystemUploadType.BINARY_CONTENT,
      },
      (data) => {
        if (onProgress && data.totalBytesExpectedToSend > 0) {
          const percentage = Math.round(
            (data.totalBytesSent / data.totalBytesExpectedToSend) * 100,
          );
          onProgress({
            loaded: data.totalBytesSent,
            total: data.totalBytesExpectedToSend,
            percentage,
          });
        }
      },
    );

    await uploadTask.uploadAsync();
  }

  async uploadMediaAsset(
    asset: MediaAsset,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<string> {
    const { uploadUrl, fileUrl } = await this.requestUploadUrl(
      asset.fileName,
      asset.mimeType,
      asset.fileSize,
    );

    await this.uploadFile(asset.uri, uploadUrl, asset.mimeType, onProgress);

    return fileUrl;
  }

  getMessageTypeFromMime(mimeType: string): MessageType {
    if (mimeType.startsWith('image/')) {
      return MessageType.IMAGE;
    }

    if (mimeType.startsWith('video/')) {
      return MessageType.VIDEO;
    }

    if (mimeType.startsWith('audio/')) {
      return MessageType.VOICE;
    }

    return MessageType.FILE;
  }
}

export const mediaService = new MediaService();
