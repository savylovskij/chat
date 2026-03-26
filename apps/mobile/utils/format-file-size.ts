const UNITS = ['B', 'KB', 'MB', 'GB'];

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / Math.pow(1024, unitIndex);
  return `${value.toFixed(unitIndex > 0 ? 1 : 0)} ${UNITS[unitIndex]}`;
}
