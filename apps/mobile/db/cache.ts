import * as SQLite from 'expo-sqlite';

import { MediaCacheEntry } from '../models/media-cache-entry.interface';
import { MediaType } from '../models/media-type.type';

const DATABASE_NAME = 'media_cache.db';

let database: SQLite.SQLiteDatabase | null = null;

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (database) {
    return database;
  }

  database = await SQLite.openDatabaseAsync(DATABASE_NAME);

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS media_cache (
      id              TEXT PRIMARY KEY,
      chat_id         TEXT NOT NULL,
      message_id      TEXT NOT NULL,
      type            TEXT NOT NULL,
      local_path      TEXT NOT NULL,
      file_size       INTEGER NOT NULL,
      mime_type       TEXT,
      downloaded_at   INTEGER NOT NULL,
      last_accessed   INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_cache_chat ON media_cache(chat_id);
    CREATE INDEX IF NOT EXISTS idx_cache_type ON media_cache(type);
    CREATE INDEX IF NOT EXISTS idx_cache_accessed ON media_cache(last_accessed);
  `);

  return database;
}

export async function insertCacheEntry(entry: MediaCacheEntry): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `INSERT OR REPLACE INTO media_cache
     (id, chat_id, message_id, type, local_path, file_size, mime_type, downloaded_at, last_accessed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    entry.id,
    entry.chatId,
    entry.messageId,
    entry.type,
    entry.localPath,
    entry.fileSize,
    entry.mimeType ?? null,
    entry.downloadedAt,
    entry.lastAccessed,
  );
}

export async function getCacheEntry(mediaId: string): Promise<MediaCacheEntry | null> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM media_cache WHERE id = ?',
    mediaId,
  );

  return row ? mapRowToEntry(row) : null;
}

export async function deleteCacheEntry(mediaId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM media_cache WHERE id = ?', mediaId);
}

export async function deleteCacheByChat(chatId: string): Promise<string[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<{ local_path: string }>(
    'SELECT local_path FROM media_cache WHERE chat_id = ?',
    chatId,
  );

  await db.runAsync('DELETE FROM media_cache WHERE chat_id = ?', chatId);

  return rows.map((row) => row.local_path);
}

export async function deleteCacheByType(type: MediaType): Promise<string[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<{ local_path: string }>(
    'SELECT local_path FROM media_cache WHERE type = ?',
    type,
  );

  await db.runAsync('DELETE FROM media_cache WHERE type = ?', type);

  return rows.map((row) => row.local_path);
}

export async function deleteAllCache(): Promise<string[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<{ local_path: string }>('SELECT local_path FROM media_cache');

  await db.runAsync('DELETE FROM media_cache');

  return rows.map((row) => row.local_path);
}

export async function getTotalSizeByType(): Promise<Record<MediaType, number>> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<{ type: string; total: number }>(
    'SELECT type, COALESCE(SUM(file_size), 0) as total FROM media_cache GROUP BY type',
  );

  const result: Record<MediaType, number> = {
    photo: 0,
    video: 0,
    file: 0,
    voice: 0,
    other: 0,
  };

  for (const row of rows) {
    result[row.type as MediaType] = row.total;
  }

  return result;
}

export async function getSizeByChat(): Promise<Array<{ chatId: string; size: number }>> {
  const db = await getDatabase();

  return db.getAllAsync<{ chatId: string; size: number }>(
    `SELECT chat_id as chatId, COALESCE(SUM(file_size), 0) as size
     FROM media_cache
     GROUP BY chat_id
     ORDER BY size DESC`,
  );
}

export async function updateLastAccessed(mediaId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE media_cache SET last_accessed = ? WHERE id = ?', Date.now(), mediaId);
}

export async function deleteOlderThan(timestamp: number): Promise<string[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<{ local_path: string }>(
    'SELECT local_path FROM media_cache WHERE downloaded_at < ?',
    timestamp,
  );

  await db.runAsync('DELETE FROM media_cache WHERE downloaded_at < ?', timestamp);

  return rows.map((row) => row.local_path);
}

export async function deleteLeastRecentlyUsed(bytesToFree: number): Promise<string[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<{ id: string; local_path: string; file_size: number }>(
    'SELECT id, local_path, file_size FROM media_cache ORDER BY last_accessed ASC',
  );

  const pathsToDelete: string[] = [];
  const idsToDelete: string[] = [];
  let freed = 0;

  for (const row of rows) {
    if (freed >= bytesToFree) break;
    pathsToDelete.push(row.local_path);
    idsToDelete.push(row.id);
    freed += row.file_size;
  }

  if (idsToDelete.length > 0) {
    const placeholders = idsToDelete.map(() => '?').join(',');
    await db.runAsync(`DELETE FROM media_cache WHERE id IN (${placeholders})`, ...idsToDelete);
  }

  return pathsToDelete;
}

export async function getTotalCacheSize(): Promise<number> {
  const db = await getDatabase();

  const result = await db.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(file_size), 0) as total FROM media_cache',
  );

  return result?.total ?? 0;
}

function mapRowToEntry(row: Record<string, unknown>): MediaCacheEntry {
  return {
    id: row.id as string,
    chatId: row.chat_id as string,
    messageId: row.message_id as string,
    type: row.type as MediaType,
    localPath: row.local_path as string,
    fileSize: row.file_size as number,
    mimeType: (row.mime_type as string) ?? undefined,
    downloadedAt: row.downloaded_at as number,
    lastAccessed: row.last_accessed as number,
  };
}
