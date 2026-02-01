/**
 * 音频数据仓库
 * 
 * 提供音频元数据和 Blob 数据的高级存储操作
 * 
 * 功能：
 * - 音频源的 CRUD 操作
 * - 音频 Blob 的存储和读取（支持分片）
 * - 索引查询和搜索
 * - 事务支持和错误处理
 */

import {
  StoreNames,
  IndexNames,
  type AudioSource,
  type AudioBlob,
} from './schema'
import {
  getDbConnection,
  QuotaExceededError,
  hasEnoughStorage,
} from './dbManager'

// ==================== 配置常量 ====================

/** 分片大小：5MB */
export const CHUNK_SIZE = 5 * 1024 * 1024

/** 最大文件大小：50MB */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 最大分片数 */
export const MAX_CHUNKS = Math.ceil(MAX_FILE_SIZE / CHUNK_SIZE)

// ==================== 错误类型 ====================

export class AudioRepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'AudioRepositoryError'
  }
}

export class FileTooLargeError extends AudioRepositoryError {
  constructor(size: number, maxSize: number) {
    super(
      `文件过大: ${formatBytes(size)}, 最大允许: ${formatBytes(maxSize)}`,
      'FILE_TOO_LARGE'
    )
    this.name = 'FileTooLargeError'
  }
}

export class TooManyChunksError extends AudioRepositoryError {
  constructor(chunks: number, maxChunks: number) {
    super(
      `分片过多: ${chunks}, 最大允许: ${maxChunks}`,
      'TOO_MANY_CHUNKS'
    )
    this.name = 'TooManyChunksError'
  }
}

export class AudioNotFoundError extends AudioRepositoryError {
  constructor(id: string) {
    super(`音频不存在: ${id}`, 'NOT_FOUND')
    this.name = 'AudioNotFoundError'
  }
}

// ==================== 工具函数 ====================

/**
 * 格式化字节数为可读字符串
 */
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB']
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * 生成 UUID
 */
function generateUUID(): string {
  return crypto.randomUUID()
}

/**
 * 将 File/Blob 分片
 */
function createChunks(blob: Blob, chunkSize: number): Blob[] {
  const chunks: Blob[] = []
  let offset = 0
  
  while (offset < blob.size) {
    const chunk = blob.slice(offset, offset + chunkSize)
    chunks.push(chunk)
    offset += chunkSize
  }
  
  return chunks
}

// ==================== 仓库 API ====================

/**
 * 保存音频源元数据和 Blob 数据
 * 
 * 这是一个原子操作：要么全部成功，要么全部失败
 */
export async function saveAudio(
  file: File,
  meta: {
    title?: string
    duration: number
    sampleRate: number
    channels: number
    bitRate?: number
  }
): Promise<AudioSource> {
  // 1. 验证文件大小
  if (file.size > MAX_FILE_SIZE) {
    throw new FileTooLargeError(file.size, MAX_FILE_SIZE)
  }
  
  // 2. 检查存储空间
  const hasSpace = await hasEnoughStorage(file.size)
  if (!hasSpace) {
    throw new QuotaExceededError()
  }
  
  const db = await getDbConnection()
  const audioId = generateUUID()
  const blobId = generateUUID()
  const now = Date.now()
  
  // 3. 准备 AudioSource 数据
  const audioSource: AudioSource = {
    id: audioId,
    title: meta.title || file.name.replace(/\.[^/.]+$/, ''), // 默认使用文件名（不含扩展名）
    fileName: file.name,
    uploadedAt: now,
    lastAccessedAt: now,
    fileSize: file.size,
    duration: meta.duration,
    mimeType: file.type,
    sampleRate: meta.sampleRate,
    channels: meta.channels,
    bitRate: meta.bitRate,
    blobId: blobId,
    processingStatus: 'pending',
  }
  
  // 4. 准备 Blob 数据（支持分片）
  const isChunked = file.size > CHUNK_SIZE
  const chunks = isChunked ? createChunks(file, CHUNK_SIZE) : [file]
  
  if (chunks.length > MAX_CHUNKS) {
    throw new TooManyChunksError(chunks.length, MAX_CHUNKS)
  }
  
  // 5. 执行事务：同时保存元数据和 Blob
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [StoreNames.AUDIO_SOURCES, StoreNames.AUDIO_BLOBS],
      'readwrite'
    )
    
    // 错误处理
    transaction.onerror = () => {
      const error = transaction.error
      console.error('[AudioRepo] Transaction failed:', error)
      
      if (error?.name === 'QuotaExceededError') {
        reject(new QuotaExceededError(error))
      } else {
        reject(new AudioRepositoryError(
          'Failed to save audio',
          'TRANSACTION_FAILED',
          error
        ))
      }
    }
    
    transaction.oncomplete = () => {
      console.log(`[AudioRepo] Audio saved: ${audioSource.id}`)
      resolve(audioSource)
    }
    
    // 1. 保存 AudioSource
    const sourcesStore = transaction.objectStore(StoreNames.AUDIO_SOURCES)
    sourcesStore.put(audioSource)
    
    // 2. 保存 Blob（支持分片）
    const blobsStore = transaction.objectStore(StoreNames.AUDIO_BLOBS)
    
    chunks.forEach((chunk, index) => {
      const chunkId = isChunked ? `${blobId}_chunk_${index}` : blobId
      
      const blobData: AudioBlob = {
        id: chunkId,
        isChunked: isChunked,
        totalChunks: isChunked ? chunks.length : undefined,
        chunkIndex: isChunked ? index : undefined,
        data: chunk,
        size: chunk.size,
        storedAt: now,
      }
      
      blobsStore.put(blobData)
    })
  })
}

/**
 * 根据 ID 获取音频源元数据
 */
export async function getAudioSource(id: string): Promise<AudioSource | null> {
  const db = await getDbConnection()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(StoreNames.AUDIO_SOURCES, 'readonly')
    const store = transaction.objectStore(StoreNames.AUDIO_SOURCES)
    const request = store.get(id)
    
    request.onsuccess = () => {
      const result = request.result as AudioSource | undefined
      
      if (result) {
        // 更新最后访问时间
        updateLastAccessed(id).catch(console.error)
      }
      
      resolve(result || null)
    }
    
    request.onerror = () => {
      reject(new AudioRepositoryError(
        'Failed to get audio source',
        'GET_FAILED',
        request.error
      ))
    }
  })
}

/**
 * 获取音频 Blob 数据
 * 
 * 自动处理分片：如果数据是分片的，会自动合并返回完整的 Blob
 */
export async function getAudioBlob(blobId: string): Promise<Blob | null> {
  const db = await getDbConnection()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(StoreNames.AUDIO_BLOBS, 'readonly')
    const store = transaction.objectStore(StoreNames.AUDIO_BLOBS)
    
    // 首先尝试获取主记录
    const request = store.get(blobId)
    
    request.onsuccess = () => {
      const result = request.result as AudioBlob | undefined
      
      if (!result) {
        resolve(null)
        return
      }
      
      if (!result.isChunked) {
        // 未分片，直接返回
        resolve(result.data)
      } else {
        // 分片存储，需要获取所有分片并合并
        getChunkedBlob(store, blobId, result.totalChunks || 1)
          .then(resolve)
          .catch(reject)
      }
    }
    
    request.onerror = () => {
      reject(new AudioRepositoryError(
        'Failed to get audio blob',
        'GET_BLOB_FAILED',
        request.error
      ))
    }
  })
}

/**
 * 获取分片 Blob 并合并
 */
async function getChunkedBlob(
  store: IDBObjectStore,
  blobId: string,
  totalChunks: number
): Promise<Blob> {
  const chunks: Blob[] = []
  
  for (let i = 0; i < totalChunks; i++) {
    const chunkId = `${blobId}_chunk_${i}`
    const chunk = await getSingleBlob(store, chunkId)
    
    if (!chunk) {
      throw new AudioRepositoryError(
        `Missing blob chunk: ${chunkId}`,
        'MISSING_CHUNK'
      )
    }
    
    chunks.push(chunk)
  }
  
  // 合并所有分片
  return new Blob(chunks)
}

/**
 * 获取单个 Blob（内部使用）
 */
function getSingleBlob(store: IDBObjectStore, id: string): Promise<Blob | null> {
  return new Promise((resolve, reject) => {
    const request = store.get(id)
    
    request.onsuccess = () => {
      const result = request.result as AudioBlob | undefined
      resolve(result?.data || null)
    }
    
    request.onerror = () => {
      reject(request.error)
    }
  })
}

/**
 * 更新最后访问时间
 */
async function updateLastAccessed(id: string): Promise<void> {
  const db = await getDbConnection()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(StoreNames.AUDIO_SOURCES, 'readwrite')
    const store = transaction.objectStore(StoreNames.AUDIO_SOURCES)
    
    const getRequest = store.get(id)
    
    getRequest.onsuccess = () => {
      const data = getRequest.result as AudioSource | undefined
      
      if (data) {
        data.lastAccessedAt = Date.now()
        store.put(data)
      }
      
      resolve()
    }
    
    getRequest.onerror = () => {
      reject(getRequest.error)
    }
  })
}

/**
 * 获取所有音频源（按上传时间倒序）
 */
export async function getAllAudioSources(
  options: { limit?: number; offset?: number } = {}
): Promise<AudioSource[]> {
  const { limit, offset = 0 } = options
  const db = await getDbConnection()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(StoreNames.AUDIO_SOURCES, 'readonly')
    const store = transaction.objectStore(StoreNames.AUDIO_SOURCES)
    const index = store.index(IndexNames.AUDIO_SOURCES_BY_UPLOAD_TIME)
    
    const results: AudioSource[] = []
    let skipped = 0
    
    // 使用游标按时间倒序遍历
    const request = index.openCursor(null, 'prev')
    
    request.onsuccess = () => {
      const cursor = request.result
      
      if (!cursor) {
        // 遍历完成
        resolve(results)
        return
      }
      
      // 跳过 offset
      if (skipped < offset) {
        skipped++
        cursor.continue()
        return
      }
      
      // 收集结果
      results.push(cursor.value as AudioSource)
      
      // 检查 limit
      if (limit && results.length >= limit) {
        resolve(results)
        return
      }
      
      cursor.continue()
    }
    
    request.onerror = () => {
      reject(new AudioRepositoryError(
        'Failed to get audio sources',
        'LIST_FAILED',
        request.error
      ))
    }
  })
}

/**
 * 搜索音频源（按标题模糊匹配）
 */
export async function searchAudioSources(query: string): Promise<AudioSource[]> {
  if (!query.trim()) {
    return getAllAudioSources()
  }
  
  const lowerQuery = query.toLowerCase()
  const allSources = await getAllAudioSources()
  
  return allSources.filter(source => 
    source.title.toLowerCase().includes(lowerQuery) ||
    source.fileName.toLowerCase().includes(lowerQuery)
  )
}

/**
 * 更新音频源元数据
 */
export async function updateAudioSource(
  id: string,
  updates: Partial<Pick<AudioSource, 'title' | 'processingStatus' | 'scoreId'>>
): Promise<AudioSource> {
  const db = await getDbConnection()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(StoreNames.AUDIO_SOURCES, 'readwrite')
    const store = transaction.objectStore(StoreNames.AUDIO_SOURCES)
    
    // 1. 获取现有数据
    const getRequest = store.get(id)
    
    getRequest.onsuccess = () => {
      const existing = getRequest.result as AudioSource | undefined
      
      if (!existing) {
        reject(new AudioNotFoundError(id))
        return
      }
      
      // 2. 合并更新
      const updated: AudioSource = {
        ...existing,
        ...updates,
        // 确保 id 不会被覆盖
        id: existing.id,
        // 更新最后访问时间
        lastAccessedAt: Date.now(),
      }
      
      // 3. 保存
      const putRequest = store.put(updated)
      
      putRequest.onsuccess = () => {
        resolve(updated)
      }
      
      putRequest.onerror = () => {
        reject(new AudioRepositoryError(
          'Failed to update audio source',
          'UPDATE_FAILED',
          putRequest.error
        ))
      }
    }
    
    getRequest.onerror = () => {
      reject(new AudioRepositoryError(
        'Failed to get audio source for update',
        'GET_FOR_UPDATE_FAILED',
        getRequest.error
      ))
    }
  })
}

/**
 * 删除音频源及其 Blob 数据
 */
export async function deleteAudio(id: string): Promise<void> {
  const db = await getDbConnection()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [StoreNames.AUDIO_SOURCES, StoreNames.AUDIO_BLOBS],
      'readwrite'
    )
    
    transaction.oncomplete = () => {
      console.log(`[AudioRepo] Audio deleted: ${id}`)
      resolve()
    }
    
    transaction.onerror = () => {
      reject(new AudioRepositoryError(
        'Failed to delete audio',
        'DELETE_FAILED',
        transaction.error
      ))
    }
    
    // 1. 获取 AudioSource 以获取 blobId
    const sourcesStore = transaction.objectStore(StoreNames.AUDIO_SOURCES)
    const getRequest = sourcesStore.get(id)
    
    getRequest.onsuccess = () => {
      const source = getRequest.result as AudioSource | undefined
      
      if (!source) {
        // 音频不存在，也算成功
        console.warn(`[AudioRepo] Audio not found for deletion: ${id}`)
        return
      }
      
      // 2. 删除 AudioSource
      sourcesStore.delete(id)
      
      // 3. 删除所有关联的 Blob（包括分片）
      const blobsStore = transaction.objectStore(StoreNames.AUDIO_BLOBS)
      
      // 3.1 尝试删除主 Blob
      blobsStore.delete(source.blobId)
      
      // 3.2 尝试删除可能的分片
      for (let i = 0; i < MAX_CHUNKS; i++) {
        const chunkId = `${source.blobId}_chunk_${i}`
        blobsStore.delete(chunkId)
      }
    }
  })
}

/**
 * 获取音频完整数据（元数据 + Blob）
 */
export async function getAudioWithBlob(
  id: string
): Promise<{ source: AudioSource; blob: Blob } | null> {
  // 1. 获取元数据
  const source = await getAudioSource(id)
  if (!source) {
    return null
  }
  
  // 2. 获取 Blob
  const blob = await getAudioBlob(source.blobId)
  if (!blob) {
    console.warn(`[AudioRepo] Blob not found for audio: ${id}, blobId: ${source.blobId}`)
    return null
  }
  
  return { source, blob }
}
