import { Ionicons } from '@expo/vector-icons';

import { MediaType } from '../models/media-type.type';

export const CATEGORY_ICONS: Record<MediaType, keyof typeof Ionicons.glyphMap> = {
  photo: 'image-outline',
  video: 'videocam-outline',
  file: 'document-text-outline',
  voice: 'mic-outline',
  other: 'server-outline',
};
