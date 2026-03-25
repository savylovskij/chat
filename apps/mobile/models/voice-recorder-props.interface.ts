import { MediaAsset } from './media-asset.interface';

export interface VoiceRecorderProps {
  onRecordComplete: (asset: MediaAsset) => void;
}
