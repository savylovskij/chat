export const MAX_CACHE_OPTIONS: Array<{ value: number | null; label: string }> = [
  { value: null, label: 'storage.noLimit' },
  { value: 1 * 1024 * 1024 * 1024, label: '1 GB' },
  { value: 2 * 1024 * 1024 * 1024, label: '2 GB' },
  { value: 5 * 1024 * 1024 * 1024, label: '5 GB' },
];
