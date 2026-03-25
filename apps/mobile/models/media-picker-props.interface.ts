import { MediaAsset } from './media-asset.interface';

export interface MediaPickerProps {
  visible: boolean;
  onSelect: (asset: MediaAsset) => void;
  onClose: () => void;
}
