import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  saveAudio,
  getAudioSource,
  updateAudioSource,
  deleteAudio,
  getAllAudioSources,
  searchAudioSources,
  CHUNK_SIZE,
  MAX_FILE_SIZE,
  MAX_CHUNKS,
  FileTooLargeError,
  AudioNotFoundError,
  AudioRepositoryError,
} from '@/db/audioRepository'
import { type AudioSource } from '@/db/schema'
import * as dbManager from '@/db/dbManager'

// Declare global for TypeScript
declare const global: typeof globalThis

// Mock dbManager
vi.mock('@/db/dbManager', async () => {
  const actual = await vi.importActual<typeof import('@/db/dbManager')>('@/db/dbManager')
  return {
    ...actual,
    getDbConnection: vi.fn(),
    hasEnoughStorage: vi.fn(),
  }
})

describe('audioRepository', () => {
  let mockDB: any
  let mockTransaction: any
  let mockObjectStore: any
  let mockIndex: any

  // Helper to create a fresh mock request
  const createMockRequest = () => ({
    onsuccess: null as (() => void) | null,
    onerror: null as (() => void) | null,
    result: null as any,
    error: null as any,
  })

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mock index with default implementation
    mockIndex = {
      openCursor: vi.fn().mockImplementation(() => createMockRequest()),
    }

    // Setup mock object store with default implementation
    mockObjectStore = {
      get: vi.fn().mockImplementation(() => createMockRequest()),
      put: vi.fn().mockImplementation(() => createMockRequest()),
      delete: vi.fn().mockImplementation(() => createMockRequest()),
      index: vi.fn().mockReturnValue(mockIndex),
    }

    // Setup mock transaction
    mockTransaction = {
      objectStore: vi.fn().mockReturnValue(mockObjectStore),
      oncomplete: null,
      onerror: null,
      onabort: null,
    }

    // Setup mock database
    mockDB = {
      transaction: vi.fn().mockReturnValue(mockTransaction),
    }

    // Mock getDbConnection
    vi.mocked(dbManager.getDbConnection).mockResolvedValue(mockDB)
    vi.mocked(dbManager.hasEnoughStorage).mockResolvedValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Configuration Constants', () => {
    it('should have correct CHUNK_SIZE (5MB)', () => {
      expect(CHUNK_SIZE).toBe(5 * 1024 * 1024)
    })

    it('should have correct MAX_FILE_SIZE (50MB)', () => {
      expect(MAX_FILE_SIZE).toBe(50 * 1024 * 1024)
    })

    it('should have correct MAX_CHUNKS', () => {
      expect(MAX_CHUNKS).toBe(Math.ceil(MAX_FILE_SIZE / CHUNK_SIZE))
    })
  })

  describe('saveAudio', () => {
    it('should throw FileTooLargeError when file exceeds MAX_FILE_SIZE', async () => {
      const largeFile = new File(['x'], 'large.mp3', { type: 'audio/mpeg' })
      Object.defineProperty(largeFile, 'size', { value: MAX_FILE_SIZE + 1 })

      await expect(
        saveAudio(largeFile, {
          duration: 60,
          sampleRate: 44100,
          channels: 2,
        })
      ).rejects.toThrow(FileTooLargeError)
    })

    it('should throw error when storage space is insufficient', async () => {
      vi.mocked(dbManager.hasEnoughStorage).mockResolvedValue(false)

      const file = new File(['test'], 'test.mp3', { type: 'audio/mpeg' })

      await expect(
        saveAudio(file, {
          duration: 60,
          sampleRate: 44100,
          channels: 2,
        })
      ).rejects.toThrow()
    })
  })

  describe('getAudioSource', () => {
    it('should return AudioSource when found', async () => {
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

      mockObjectStore.get.mockImplementation(() => {
        const request = createMockRequest()
        setTimeout(() => {
          if (request.onsuccess) {
            request.result = mockSource
            request.onsuccess()
          }
        }, 0)
        return request
      })

      const result = await getAudioSource('test-id')

      expect(result).toEqual(mockSource)
    })

    it('should return null when not found', async () => {
      mockObjectStore.get.mockImplementation(() => {
        const request = createMockRequest()
        setTimeout(() => {
          if (request.onsuccess) {
            request.result = undefined
            request.onsuccess()
          }
        }, 0)
        return request
      })

      const result = await getAudioSource('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('updateAudioSource', () => {
    it('should throw AudioNotFoundError when audio does not exist', async () => {
      mockObjectStore.get.mockImplementation(() => {
        const request = createMockRequest()
        setTimeout(() => {
          if (request.onsuccess) {
            request.result = undefined
            request.onsuccess()
          }
        }, 0)
        return request
      })

      await expect(
        updateAudioSource('non-existent', { title: 'New Title' })
      ).rejects.toThrow(AudioNotFoundError)
    })
  })

  describe('deleteAudio', () => {
    it('should complete successfully when audio exists', async () => {
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

      mockObjectStore.get.mockImplementation(() => {
        const request = createMockRequest()
        setTimeout(() => {
          if (request.onsuccess) {
            request.result = mockSource
            request.onsuccess()
          }
        }, 0)
        return request
      })

      // Mock transaction complete
      setTimeout(() => {
        if (mockTransaction.oncomplete) {
          mockTransaction.oncomplete()
        }
      }, 10)

      await expect(deleteAudio('test-id')).resolves.not.toThrow()
    })

    it('should complete successfully when audio does not exist', async () => {
      mockObjectStore.get.mockImplementation(() => {
        const request = createMockRequest()
        setTimeout(() => {
          if (request.onsuccess) {
            request.result = undefined
            request.onsuccess()
          }
        }, 0)
        return request
      })

      // Mock transaction complete
      setTimeout(() => {
        if (mockTransaction.oncomplete) {
          mockTransaction.oncomplete()
        }
      }, 10)

      await expect(deleteAudio('non-existent')).resolves.not.toThrow()
    })
  })

  describe('getAllAudioSources', () => {
    it('should return paginated results', async () => {
      const mockSources: AudioSource[] = [
        {
          id: '1',
          title: 'Audio 1',
          fileName: '1.mp3',
          uploadedAt: 1000,
          lastAccessedAt: 1000,
          fileSize: 1024,
          duration: 60,
          mimeType: 'audio/mpeg',
          sampleRate: 44100,
          channels: 2,
          blobId: 'blob-1',
          processingStatus: 'pending',
        },
        {
          id: '2',
          title: 'Audio 2',
          fileName: '2.mp3',
          uploadedAt: 2000,
          lastAccessedAt: 2000,
          fileSize: 2048,
          duration: 120,
          mimeType: 'audio/mpeg',
          sampleRate: 44100,
          channels: 2,
          blobId: 'blob-2',
          processingStatus: 'completed',
        },
      ]

      mockIndex.openCursor.mockImplementation(() => {
        const request = createMockRequest()
        let cursorIndex = 0

        setTimeout(() => {
          if (!request.onsuccess) return

          const advanceCursor = () => {
            if (cursorIndex < mockSources.length) {
              request.result = {
                value: mockSources[cursorIndex],
                continue: () => {
                  cursorIndex++
                  setTimeout(advanceCursor, 0)
                },
              }
            } else {
              request.result = null
            }
            if (request.onsuccess) {
              request.onsuccess()
            }
          }

          advanceCursor()
        }, 0)

        return request
      })

      const results = await getAllAudioSources({ limit: 10, offset: 0 })

      expect(results).toHaveLength(2)
      expect(results[0].id).toBe('1')
      expect(results[1].id).toBe('2')
    })
  })

  describe('searchAudioSources', () => {
    it('should return all sources when query is empty', async () => {
      const mockSources: AudioSource[] = [
        {
          id: '1',
          title: 'Audio 1',
          fileName: '1.mp3',
          uploadedAt: 1000,
          lastAccessedAt: 1000,
          fileSize: 1024,
          duration: 60,
          mimeType: 'audio/mpeg',
          sampleRate: 44100,
          channels: 2,
          blobId: 'blob-1',
          processingStatus: 'pending',
        },
      ]

      mockIndex.openCursor.mockImplementation(() => {
        const request = createMockRequest()
        let cursorIndex = 0

        setTimeout(() => {
          if (!request.onsuccess) return

          const advanceCursor = () => {
            if (cursorIndex < mockSources.length) {
              request.result = {
                value: mockSources[cursorIndex],
                continue: () => {
                  cursorIndex++
                  setTimeout(advanceCursor, 0)
                },
              }
            } else {
              request.result = null
            }
            if (request.onsuccess) {
              request.onsuccess()
            }
          }

          advanceCursor()
        }, 0)

        return request
      })

      const results = await searchAudioSources('')

      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('1')
    })

    it('should filter sources by query', async () => {
      const mockSources: AudioSource[] = [
        {
          id: '1',
          title: 'Test Audio',
          fileName: 'test.mp3',
          uploadedAt: 1000,
          lastAccessedAt: 1000,
          fileSize: 1024,
          duration: 60,
          mimeType: 'audio/mpeg',
          sampleRate: 44100,
          channels: 2,
          blobId: 'blob-1',
          processingStatus: 'pending',
        },
        {
          id: '2',
          title: 'Another Song',
          fileName: 'another.mp3',
          uploadedAt: 2000,
          lastAccessedAt: 2000,
          fileSize: 2048,
          duration: 120,
          mimeType: 'audio/mpeg',
          sampleRate: 44100,
          channels: 2,
          blobId: 'blob-2',
          processingStatus: 'completed',
        },
      ]

      mockIndex.openCursor.mockImplementation(() => {
        const request = createMockRequest()
        let cursorIndex = 0

        setTimeout(() => {
          if (!request.onsuccess) return

          const advanceCursor = () => {
            if (cursorIndex < mockSources.length) {
              request.result = {
                value: mockSources[cursorIndex],
                continue: () => {
                  cursorIndex++
                  setTimeout(advanceCursor, 0)
                },
              }
            } else {
              request.result = null
            }
            if (request.onsuccess) {
              request.onsuccess()
            }
          }

          advanceCursor()
        }, 0)

        return request
      })

      const results = await searchAudioSources('test')

      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('1')
      expect(results[0].title).toBe('Test Audio')
    })
  })

  describe('Error Classes', () => {
    it('should create FileTooLargeError with correct message', () => {
      const error = new FileTooLargeError(100 * 1024 * 1024, 50 * 1024 * 1024)
      expect(error.message).toContain('文件过大')
      expect(error.code).toBe('FILE_TOO_LARGE')
    })

    it('should create AudioNotFoundError with correct message', () => {
      const error = new AudioNotFoundError('test-id')
      expect(error.message).toContain('test-id')
      expect(error.code).toBe('NOT_FOUND')
    })

    it('should create AudioRepositoryError with cause', () => {
      const cause = new Error('Original error')
      const error = new AudioRepositoryError('Failed', 'FAILED', cause)
      expect(error.message).toBe('Failed')
      expect(error.code).toBe('FAILED')
      expect(error.cause).toBe(cause)
    })
  })
})
