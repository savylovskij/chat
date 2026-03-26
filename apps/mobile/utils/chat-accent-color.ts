const ACCENT_HUES = [165, 200, 260, 310, 30, 55, 120, 180, 220, 280];

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
}

export function getChatAccentColor(chatId: string, isDark: boolean): string {
  const hash = hashString(chatId);
  const hue = ACCENT_HUES[hash % ACCENT_HUES.length];

  if (isDark) {
    return `hsl(${hue}, 40%, 25%)`;
  }

  return `hsl(${hue}, 50%, 85%)`;
}
