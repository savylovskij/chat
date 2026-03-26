import { KeepMediaDuration } from '../models/keep-media-duration.type';

export const KEEP_MEDIA_OPTIONS: Array<{ value: KeepMediaDuration; labelKey: string }> = [
  { value: 'forever', labelKey: 'storage.forever' },
  { value: '30d', labelKey: '30 days' },
  { value: '7d', labelKey: '7 days' },
  { value: '3d', labelKey: '3 days' },
];
