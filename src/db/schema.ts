/**
 * IndexedDB Schema 定义
 * 
 * 数据库名称: musegen
 * 版本: 2 (从 1 升级，新增 audioSources 和 audioBlobs store)
 * 
 * 功能:
 * - 存储音频文件的元数据和 Blob 数据
 * - 支持大文件分片存储（单个 Blob 最大 50MB，可分片）
 * - 支持数据迁移和版本升级
 */

// ==================== 数据库配置 ====================

export const DB_NAME = 'musegen'
export const DB_VERSION = 2

// ==================== Store 名称 ====================

export const StoreNames = {
  /** Key-Value 存储（用于 Zustand 状态持久化） */
  KV: 'kv',
  /** 音频源元数据存储 */
  AUDIO_SOURCES: 'audioSources',
  /** 音频 Blob 数据存储 */
  AUDIO_BLOBS: 'audioBlobs',
} as const

export type StoreName = typeof StoreNames[keyof typeof StoreNames]

// ==================== 索引名称 ====================

export const IndexNames = {
  /** 音频源：按上传时间索引 */
  AUDIO_SOURCES_BY_UPLOAD_TIME: 'byUploadTime',
  /** 音频源：按标题索引 */
  AUDIO_SOURCES_BY_TITLE: 'byTitle',
  /** 音频 Blob：按音频源 ID 索引 */
  AUDIO_BLOBS_BY_SOURCE_ID: 'bySourceId',
} as const

// ==================== 数据模型 ====================

/**
 * 音频源数据模型
 * 
 * 对应 Phase2.md 中定义的 AudioSource 数据结构
 */
export interface AudioSource {
  /** 唯一标识符 (UUID) */
  id: string
  
  // ===== 基础信息 =====
  /** 用户可编辑的标题 */
  title: string
  /** 原始文件名 */
  fileName: string
  /** 上传时间戳 */
  uploadedAt: number
  /** 最后访问时间戳 */
  lastAccessedAt: number
  
  // ===== 技术参数 =====
  /** 文件大小（字节） */
  fileSize: number
  /** 音频时长（秒） */
  duration: number
  /** 格式 MIME type */
  mimeType: string
  /** 采样率 */
  sampleRate: number
  /** 声道数 */
  channels: number
  /** 比特率（如已知） */
  bitRate?: number
  
  // ===== 存储引用 =====
  /** 关联的 Blob 数据 ID */
  blobId: string
  
  // ===== 处理状态 =====
  /** 处理状态 */
  processingStatus: 'pending' | 'processing' | 'completed' | 'error'
  /** 关联的乐谱 ID（处理后填充） */
  scoreId?: string
}

/**
 * 音频 Blob 数据模型
 * 
 * 支持大文件分片存储：
 * - 小文件（< 5MB）：存储为单个 Blob
 * - 大文件（>= 5MB）：分片存储，每片约 5MB
 */
export interface AudioBlob {
  /** 唯一标识符（与 AudioSource.blobId 对应） */
  id: string
  
  // ===== 分片信息 =====
  /** 是否分片存储 */
  isChunked: boolean
  /** 总分片数（isChunked=true 时有效） */
  totalChunks?: number
  /** 当前片序号（isChunked=true 时有效，从 0 开始） */
  chunkIndex?: number
  
  // ===== 数据 =====
  /** Blob 数据 */
  data: Blob
  
  // ===== 元数据 =====
  /** 数据大小（字节） */
  size: number
  /** 存储时间戳 */
  storedAt: number
}

// ==================== Schema 版本历史 ====================

/**
 * Schema 版本历史记录
 * 
 * 用于数据库迁移时了解各版本的变更
 */
export const SchemaVersionHistory: Record<number, { description: string; changes: string[] }> = {
  1: {
    description: '初始版本',
    changes: [
      '创建 kv store，用于 Zustand 状态持久化',
    ],
  },
  2: {
    description: 'Phase 2 - 音频存储支持',
    changes: [
      '新增 audioSources store，存储音频元数据',
      '新增 audioBlobs store，存储音频 Blob 数据',
      '添加索引：byUploadTime, byTitle, bySourceId',
      '支持大文件分片存储',
    ],
  },
}


