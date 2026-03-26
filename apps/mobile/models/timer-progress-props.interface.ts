export interface TimerProgressProps {
  timerSeconds: number;
  createdAt: string;
  onExpired?: () => void;
}
