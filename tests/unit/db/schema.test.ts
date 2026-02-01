import { describe, it, expect } from 'vitest'
import {
  DB_NAME,
  DB_VERSION,
  StoreNames,
  IndexNames,
  SchemaVersionHistory,
  type AudioSource,
  type AudioBlob,
} from '@/db/schema'

describe('DB Schema', () => {
  describe('Configuration', () => {
    it('should have correct database name', () => {
      expect(DB_NAME).toBe('musegen')
    })

    it('should have correct version (Phase 2)', () => {
      expect(DB_VERSION).toBe(2)
    })
  })

  describe('Store Names', () => {
    it('should define all required stores', () => {
      expect(StoreNames.KV).toBe('kv')
      expect(StoreNames.AUDIO_SOURCES).toBe('audioSources')
      expect(StoreNames.AUDIO_BLOBS).toBe('audioBlobs')
    })
  })

  describe('Index Names', () => {
    it('should define all required indexes', () => {
      expect(IndexNames.AUDIO_SOURCES_BY_UPLOAD_TIME).toBe('byUploadTime')
      expect(IndexNames.AUDIO_SOURCES_BY_TITLE).toBe('byTitle')
      expect(IndexNames.AUDIO_BLOBS_BY_SOURCE_ID).toBe('bySourceId')
    })
  })

  describe('Version History', () => {
    it('should have version 1 defined', () => {
      expect(SchemaVersionHistory[1]).toBeDefined()
      expect(SchemaVersionHistory[1].description).toBe('初始版本')
      expect(SchemaVersionHistory[1].changes).toContain('创建 kv store，用于 Zustand 状态持久化')
    })

    it('should have version 2 defined (Phase 2)', () => {
      expect(SchemaVersionHistory[2]).toBeDefined()
      expect(SchemaVersionHistory[2].description).toBe('Phase 2 - 音频存储支持')
      expect(SchemaVersionHistory[2].changes).toContain('新增 audioSources store，存储音频元数据')
      expect(SchemaVersionHistory[2].changes).toContain('新增 audioBlobs store，存储音频 Blob 数据')
      expect(SchemaVersionHistory[2].changes).toContain('添加索引：byUploadTime, byTitle, bySourceId')
      expect(SchemaVersionHistory[2].changes).toContain('支持大文件分片存储')
    })
  })

  describe('Type Definitions', () => {
    it('should have correct AudioSource structure', () => {
      const mockSource: AudioSource = {
        id: 'test-id',
        title: 'Test Audio',
        fileName: 'test.mp3',
        uploadedAt: Date.now(),
        lastAccessedAt: Date.now(),
        fileSize: 1024,
        duration: 60,
        mimeType: 'audio/mpeg',
        sampleRate: 44100,
        channels: 2,
        blobId: 'blob-id',
        processingStatus: 'pending',
      }

      expect(mockSource.id).toBe('test-id')
      expect(mockSource.title).toBe('Test Audio')
      expect(mockSource.processingStatus).toBe('pending')
    })

    it('should have correct AudioBlob structure for single chunk', () => {
      const mockBlob: AudioBlob = {
        id: 'blob-id',
        isChunked: false,
        data: new Blob(['test']),
        size: 4,
        storedAt: Date.now(),
      }

      expect(mockBlob.id).toBe('blob-id')
      expect(mockBlob.isChunked).toBe(false)
      expect(mockBlob.size).toBe(4)
    })

    it('should have correct AudioBlob structure for chunked', () => {
      const mockBlob: AudioBlob = {
        id: 'blob-id_chunk_0',
        isChunked: true,
        totalChunks: 3,
        chunkIndex: 0,
        data: new Blob(['test']),
        size: 4,
        storedAt: Date.now(),
      }

      expect(mockBlob.id).toBe('blob-id_chunk_0')
      expect(mockBlob.isChunked).toBe(true)
      expect(mockBlob.totalChunks).toBe(3)
      expect(mockBlob.chunkIndex).toBe(0)
    })
  })
})
