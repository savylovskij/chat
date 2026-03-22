import { AllowedMimeType } from '@shared/core';

export const IMAGE_MIME_TYPES: string[] = [
  AllowedMimeType.IMAGE_JPEG,
  AllowedMimeType.IMAGE_PNG,
  AllowedMimeType.IMAGE_GIF,
  AllowedMimeType.IMAGE_WEBP,
];

export const VIDEO_MIME_TYPES: string[] = [
  AllowedMimeType.VIDEO_MP4,
  AllowedMimeType.VIDEO_QUICKTIME,
  AllowedMimeType.VIDEO_WEBM,
];

export const VOICE_MIME_TYPES: string[] = [
  AllowedMimeType.AUDIO_AAC,
  AllowedMimeType.AUDIO_OGG,
  AllowedMimeType.AUDIO_MP4,
  AllowedMimeType.AUDIO_MPEG,
  AllowedMimeType.AUDIO_WEBM,
];
