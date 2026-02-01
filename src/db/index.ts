/**
 * IndexedDB 存储模块
 * 
 * 提供音频数据的持久化存储支持
 * 
 * 主要功能：
 * - Schema 定义和版本管理
 * - 数据库连接和迁移
 * - 音频元数据和 Blob 存储
 * - 错误处理和存储空间管理
 * 
 * @example
 * ```typescript
 * import { saveAudio, getAudioWithBlob } from '@/db'
 * 
 * // 保存音频
 * const audioSource = await saveAudio(file, {
 *   duration: 180,
 *   sampleRate: 44100,
 *   channels: 2,
 * })
 * 
 * // 读取音频
 * const audio = await getAudioWithBlob(audioSource.id)
 * if (audio) {
 *   console.log(audio.source.title)
 *   // audio.blob 可以用于播放
 * }
 * ```
 */

// ==================== Schema 和类型 ====================

export {
  DB_NAME,
  DB_VERSION,
  StoreNames,
  IndexNames,
  SchemaVersionHistory,
  type StoreName,
} from './schema'

export type {
  AudioSource,
  AudioBlob,
} from './schema'

// ==================== 数据库管理 ====================

export {
  // 连接管理
  getDbConnection,
  closeDbConnection,
  resetDbConnection,
  deleteDatabase,
  
  // 工具函数
  isIndexedDBSupported,
  getStorageUsage,
  hasEnoughStorage,
  
  // 错误类型
  DatabaseError,
  QuotaExceededError,
  VersionError,
} from './dbManager'

// ==================== 音频仓库 ====================

export {
  // 核心 CRUD
  saveAudio,
  getAudioSource,
  getAudioWithBlob,
  updateAudioSource,
  deleteAudio,
  
  // 查询和搜索
  getAllAudioSources,
  searchAudioSources,
  
  // 常量和配置
  CHUNK_SIZE,
  MAX_FILE_SIZE,
  MAX_CHUNKS,
  
  // 错误类型
  AudioRepositoryError,
  FileTooLargeError,
  TooManyChunksError,
  AudioNotFoundError,
} from './audioRepository'
