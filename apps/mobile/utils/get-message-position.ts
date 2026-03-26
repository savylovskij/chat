import { MessagePosition } from '../models/message-position.type';

interface MessageWithSenderAndTime {
  senderId: string;
  createdAt: string;
}

const GROUP_TIME_THRESHOLD_MS = 2 * 60 * 1000;

export function getMessagePosition(
  messages: MessageWithSenderAndTime[],
  index: number,
): MessagePosition {
  const current = messages[index];
  const prev = index > 0 ? messages[index - 1] : null;
  const next = index < messages.length - 1 ? messages[index + 1] : null;

  const isSameSenderAsPrev =
    prev !== null &&
    prev.senderId === current.senderId &&
    Math.abs(new Date(current.createdAt).getTime() - new Date(prev.createdAt).getTime()) <
      GROUP_TIME_THRESHOLD_MS;

  const isSameSenderAsNext =
    next !== null &&
    next.senderId === current.senderId &&
    Math.abs(new Date(current.createdAt).getTime() - new Date(next.createdAt).getTime()) <
      GROUP_TIME_THRESHOLD_MS;

  if (!isSameSenderAsPrev && !isSameSenderAsNext) return 'single';
  if (!isSameSenderAsPrev && isSameSenderAsNext) return 'first';
  if (isSameSenderAsPrev && isSameSenderAsNext) return 'middle';
  return 'last';
}
