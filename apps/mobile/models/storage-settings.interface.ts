import { AutoDownloadOption } from './auto-download-option.type';
import { KeepMediaDuration } from './keep-media-duration.type';

export interface StorageSettings {
  keepMediaDuration: KeepMediaDuration;
  maxCacheSize: number | null;
  autoDownloadPhoto: AutoDownloadOption;
  autoDownloadVideo: 'wifi' | 'never';
  autoDownloadFile: 'wifi' | 'never';
}
