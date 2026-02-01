/**
 * IndexedDB 数据库管理器
 * 
 * 负责：
 * - 数据库连接管理
 * - Schema 版本迁移
 * - Store 创建和索引管理
 * - 错误处理和重试机制
 */

import {
  DB_NAME,
  DB_VERSION,
  StoreNames,
  IndexNames,
} from './schema'

// ==================== 错误类型 ====================

export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'DatabaseError'
  }
}

export class QuotaExceededError extends DatabaseError {
  constructor(cause?: unknown) {
    super('存储空间不足', 'QUOTA_EXCEEDED', cause)
    this.name = 'QuotaExceededError'
  }
}

export class VersionError extends DatabaseError {
  constructor(expected: number, actual: number) {
    super(
      `数据库版本不匹配: 期望 ${expected}, 实际 ${actual}`,
      'VERSION_MISMATCH'
    )
    this.name = 'VersionError'
  }
}

// ==================== 连接管理 ====================

interface DbConnection {
  db: IDBDatabase
  version: number
}

let connectionPromise: Promise<DbConnection> | null = null

/**
 * 打开数据库连接
 * 
 * 负责 Schema 迁移和 Store 创建
 */
async function openConnection(): Promise<DbConnection> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      const error = request.error
      console.error('[DB] Failed to open database:', error)
      
      if (error?.name === 'QuotaExceededError') {
        reject(new QuotaExceededError(error))
      } else {
        reject(new DatabaseError(
          error?.message || 'Failed to open database',
          'OPEN_FAILED',
          error
        ))
      }
    }

    request.onsuccess = () => {
      const db = request.result
      console.log(`[DB] Database opened successfully, version: ${db.version}`)
      resolve({ db, version: db.version })
    }

    request.onupgradeneeded = (event) => {
      const db = request.result
      const oldVersion = event.oldVersion
      const newVersion = event.newVersion || DB_VERSION

      console.log(`[DB] Upgrading database from version ${oldVersion} to ${newVersion}`)

      try {
        performMigration(db, oldVersion)
        console.log('[DB] Migration completed successfully')
      } catch (error) {
        console.error('[DB] Migration failed:', error)
        // 阻止事务完成，触发 onerror
        throw error
      }
    }
  })
}

/**
 * 执行数据库迁移
 */
function performMigration(db: IDBDatabase, oldVersion: number): void {
  // 版本 0 -> 1：创建 KV store
  if (oldVersion < 1) {
    migrateToV1(db)
  }
  
  // 版本 1 -> 2：添加音频存储支持
  if (oldVersion < 2) {
    migrateToV2(db)
  }
}

/**
 * 迁移到版本 1：创建 KV store
 */
function migrateToV1(db: IDBDatabase): void {
  console.log('[DB] Migrating to version 1: Creating KV store')
  
  if (!db.objectStoreNames.contains(StoreNames.KV)) {
    db.createObjectStore(StoreNames.KV)
    console.log('[DB] Created KV store')
  }
}

/**
 * 迁移到版本 2：添加音频存储
 */
function migrateToV2(db: IDBDatabase): void {
  console.log('[DB] Migrating to version 2: Adding audio storage')

  // 1. 创建 audioSources store
  if (!db.objectStoreNames.contains(StoreNames.AUDIO_SOURCES)) {
    const audioSourcesStore = db.createObjectStore(StoreNames.AUDIO_SOURCES, {
      keyPath: 'id',
    })

    // 创建索引
    audioSourcesStore.createIndex(
      IndexNames.AUDIO_SOURCES_BY_UPLOAD_TIME,
      'uploadedAt',
      { unique: false }
    )
    audioSourcesStore.createIndex(
      IndexNames.AUDIO_SOURCES_BY_TITLE,
      'title',
      { unique: false }
    )

    console.log('[DB] Created audioSources store with indexes')
  }

  // 2. 创建 audioBlobs store
  if (!db.objectStoreNames.contains(StoreNames.AUDIO_BLOBS)) {
    const audioBlobsStore = db.createObjectStore(StoreNames.AUDIO_BLOBS, {
      keyPath: 'id',
    })

    // 创建索引：按 sourceId 查询所有分片
    audioBlobsStore.createIndex(
      IndexNames.AUDIO_BLOBS_BY_SOURCE_ID,
      'sourceId',
      { unique: false }
    )

    console.log('[DB] Created audioBlobs store with indexes')
  }
}

/**
 * 获取数据库连接
 * 
 * 使用单例模式管理连接，避免重复打开
 */
export async function getDbConnection(): Promise<IDBDatabase> {
  if (!connectionPromise) {
    connectionPromise = openConnection()
  }
  
  const conn = await connectionPromise
  return conn.db
}

/**
 * 关闭数据库连接
 * 
 * 在应用卸载或需要释放资源时调用
 */
export async function closeDbConnection(): Promise<void> {
  if (connectionPromise) {
    const conn = await connectionPromise
    conn.db.close()
    console.log('[DB] Database connection closed')
    connectionPromise = null
  }
}

/**
 * 重置数据库连接
 * 
 * 在连接出错或版本变更后使用
 */
export function resetDbConnection(): void {
  connectionPromise = null
  console.log('[DB] Database connection reset')
}

/**
 * 删除数据库
 * 
 * ⚠️ 危险操作！会删除所有数据！
 * 仅在用户主动要求清除所有数据时使用
 */
export async function deleteDatabase(): Promise<void> {
  await closeDbConnection()
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    
    request.onsuccess = () => {
      console.log('[DB] Database deleted successfully')
      resolve()
    }
    
    request.onerror = () => {
      console.error('[DB] Failed to delete database:', request.error)
      reject(new DatabaseError(
        'Failed to delete database',
        'DELETE_FAILED',
        request.error
      ))
    }
    
    request.onblocked = () => {
      console.warn('[DB] Database deletion blocked')
      reject(new DatabaseError(
        'Database deletion blocked by other connections',
        'DELETE_BLOCKED'
      ))
    }
  })
}

// ==================== 工具函数 ====================

/**
 * 检查数据库是否支持
 */
export function isIndexedDBSupported(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window
}

/**
 * 获取存储空间使用情况
 * 
 * 返回已使用的字节数和配额（如果浏览器支持）
 */
export async function getStorageUsage(): Promise<{ used: number; quota?: number }> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.storage ||
    typeof navigator.storage.estimate !== 'function'
  ) {
    return { used: 0 }
  }
  
  try {
    const estimate = await navigator.storage.estimate()
    return {
      used: estimate.usage || 0,
      quota: estimate.quota,
    }
  } catch (error) {
    console.warn('[DB] Failed to get storage estimate:', error)
    return { used: 0 }
  }
}

/**
 * 检查存储空间是否充足
 * 
 * 如果剩余空间小于 requiredBytes，返回 false
 */
export async function hasEnoughStorage(requiredBytes: number): Promise<boolean> {
  const { used, quota } = await getStorageUsage()
  
  if (!quota) {
    // 无法获取配额，假设有足够空间
    return true
  }
  
  const available = quota - used
  return available >= requiredBytes
}
