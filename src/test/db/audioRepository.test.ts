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
} from '../../db/audioRepository'
import { type AudioSource } from '../../db/schema'
import * as dbManager from '../../db/dbManager'

// Mock dbManager
vi.mock('../../db/dbManager', async () => {
  const actual = await vi.importActual('../../db/dbManager')
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
  let mockRequest: any
  let mockIndex: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mock request
    mockRequest = {
      onsuccess: null,
      onerror: null,
      result: null,
      error: null,
    }

    // Setup mock index
    mockIndex = {
      openCursor: vi.fn().mockReturnValue(mockRequest),
    }

    // Setup mock object store
    mockObjectStore = {
      get: vi.fn().mockReturnValue(mockRequest),
      put: vi.fn().mockReturnValue(mockRequest),
      delete: vi.fn().mockReturnValue(mockRequest),
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

      // Setup mock to trigger onsuccess
      mockObjectStore.get.mockImplementation(() => {
        setTimeout(() => {
          if (mockRequest.onsuccess) {
            mockRequest.result = mockSource
            mockRequest.onsuccess()
          }
        }, 0)
        return mockRequest
      })

      const result = await getAudioSource('test-id')

      expect(result).toEqual(mockSource)
    })

    it('should return null when not found', async () => {
      mockObjectStore.get.mockImplementation(() => {
        setTimeout(() => {
          if (mockRequest.onsuccess) {
            mockRequest.result = undefined
            mockRequest.onsuccess()
          }
        }, 0)
        return mockRequest
      })

      const result = await getAudioSource('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('updateAudioSource', () => {
    it('should throw AudioNotFoundError when audio does not exist', async () => {
      mockObjectStore.get.mockImplementation(() => {
        setTimeout(() => {
          if (mockRequest.onsuccess) {
            mockRequest.result = undefined
            mockRequest.onsuccess()
          }
        }, 0)
        return mockRequest
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
        setTimeout(() => {
          if (mockRequest.onsuccess) {
            mockRequest.result = mockSource
            mockRequest.onsuccess()
          }
        }, 0)
        return mockRequest
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
        setTimeout(() => {
          if (mockRequest.onsuccess) {
            mockRequest.result = undefined
            mockRequest.onsuccess()
          }
        }, 0)
        return mockRequest
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

      let cursorIndex = 0
      mockIndex.openCursor.mockImplementation(() => {
        const request = { ...mockRequest }
        setTimeout(() => {
          if (request.onsuccess) {
            if (cursorIndex < mockSources.length) {
              request.result = {
                value: mockSources[cursorIndex],
                continue: () => {
                  cursorIndex++
                  if (request.onsuccess) {
                    if (cursorIndex < mockSources.length) {
                      // @ts-expect-error - mocking cursor
                      request.result = {
                        value: mockSources[cursorIndex],
                        continue: () => {},
                      }
                    } else {
                      // @ts-expect-error - mocking cursor end
                      request.result = null
                    }
                    request.onsuccess()
                  }
                },
              }
            } else {
              request.result = null
            }
            cursorIndex++
            request.onsuccess()
          }
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

      let cursorIndex = 0
      mockIndex.openCursor.mockImplementation(() => {
        const request = { ...mockRequest }
        setTimeout(() => {
          if (request.onsuccess) {
            if (cursorIndex < mockSources.length) {
              request.result = {
                value: mockSources[cursorIndex],
                continue: () => {
                  cursorIndex++
                  // @ts-expect-error - mocking cursor end
                  request.result = null
                  if (request.onsuccess) {
                    request.onsuccess()
                  }
                },
              }
              cursorIndex++
            } else {
              request.result = null
            }
            request.onsuccess()
          }
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

      let cursorIndex = 0
      mockIndex.openCursor.mockImplementation(() => {
        const request = { ...mockRequest }
        setTimeout(() => {
          if (request.onsuccess) {
            if (cursorIndex < mockSources.length) {
              request.result = {
                value: mockSources[cursorIndex],
                continue: () => {
                  cursorIndex++
                  if (request.onsuccess) {
                    if (cursorIndex < mockSources.length) {
                      // @ts-expect-error - mocking cursor
                      request.result = {
                        value: mockSources[cursorIndex],
                        continue: () => {},
                      }
                    } else {
                      // @ts-expect-error - mocking cursor end
                      request.result = null
                    }
                    request.onsuccess()
                  }
                },
              }
            } else {
              request.result = null
            }
            cursorIndex++
            request.onsuccess()
          }
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
