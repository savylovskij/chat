import { ReactNode } from 'react';

export interface BlurHeaderProps {
  title: string;
  onBack?: () => void;
  rightContent?: ReactNode;
  leftContent?: ReactNode;
}
