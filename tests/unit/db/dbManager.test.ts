import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getDbConnection,
  closeDbConnection,
  resetDbConnection,
  deleteDatabase,
  isIndexedDBSupported,
  getStorageUsage,
  hasEnoughStorage,
  DatabaseError,
} from '@/db/dbManager'
import { DB_NAME, DB_VERSION } from '@/db/schema'

// Declare global for TypeScript
declare const global: typeof globalThis

// Mock indexedDB
const mockIndexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
}

Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
})

Object.defineProperty(global, 'navigator', {
  value: {
    storage: {
      estimate: vi.fn(),
    },
  },
  writable: true,
})

describe('dbManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetDbConnection()
  })

  afterEach(() => {
    resetDbConnection()
  })

  describe('isIndexedDBSupported', () => {
    it('should return true when indexedDB is available', () => {
      expect(isIndexedDBSupported()).toBe(true)
    })

    it('should return false when window is undefined', () => {
      const originalWindow = global.window
      // @ts-expect-error - testing undefined window
      global.window = undefined
      expect(isIndexedDBSupported()).toBe(false)
      global.window = originalWindow
    })
  })

  describe('getDbConnection', () => {
    it('should open database with correct name and version', async () => {
      const mockDB = {
        version: DB_VERSION,
        objectStoreNames: {
          contains: vi.fn().mockReturnValue(false),
        },
        createObjectStore: vi.fn(),
        close: vi.fn(),
      }

      mockIndexedDB.open.mockReturnValue({
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        result: mockDB,
        error: null,
      })

      // Simulate async open
      setTimeout(() => {
        const request = mockIndexedDB.open.mock.results[0].value
        if (request.onsuccess) {
          request.onsuccess()
        }
      }, 0)

      await getDbConnection()

      expect(mockIndexedDB.open).toHaveBeenCalledWith(DB_NAME, DB_VERSION)
    })

    it('should throw DatabaseError when open fails', async () => {
      const error = new Error('Open failed')

      mockIndexedDB.open.mockReturnValue({
        onsuccess: null,
        onerror: null,
        result: null,
        error,
      })

      setTimeout(() => {
        const request = mockIndexedDB.open.mock.results[0].value
        if (request.onerror) {
          request.onerror()
        }
      }, 0)

      await expect(getDbConnection()).rejects.toThrow(DatabaseError)
    })
  })

  describe('closeDbConnection', () => {
    it('should close database connection', async () => {
      const mockClose = vi.fn()
      const mockDB = {
        version: DB_VERSION,
        objectStoreNames: {
          contains: vi.fn().mockReturnValue(true),
        },
        close: mockClose,
      }

      mockIndexedDB.open.mockReturnValue({
        onsuccess: null,
        onerror: null,
        result: mockDB,
        error: null,
      })

      setTimeout(() => {
        const request = mockIndexedDB.open.mock.results[0].value
        if (request.onsuccess) {
          request.onsuccess()
        }
      }, 0)

      await getDbConnection()
      await closeDbConnection()

      expect(mockClose).toHaveBeenCalled()
    })
  })

  describe('resetDbConnection', () => {
    it('should reset connection promise', () => {
      resetDbConnection()
      // Should not throw and should allow new connection
      expect(() => resetDbConnection()).not.toThrow()
    })
  })

  describe('deleteDatabase', () => {
    it('should delete database successfully', async () => {
      mockIndexedDB.deleteDatabase.mockReturnValue({
        onsuccess: null,
        onerror: null,
        onblocked: null,
      })

      setTimeout(() => {
        const request = mockIndexedDB.deleteDatabase.mock.results[0].value
        if (request.onsuccess) {
          request.onsuccess()
        }
      }, 0)

      await expect(deleteDatabase()).resolves.not.toThrow()
      expect(mockIndexedDB.deleteDatabase).toHaveBeenCalledWith(DB_NAME)
    })

    it('should throw DatabaseError when deletion fails', async () => {
      const error = new Error('Delete failed')

      mockIndexedDB.deleteDatabase.mockReturnValue({
        onsuccess: null,
        onerror: null,
        onblocked: null,
        error,
      })

      setTimeout(() => {
        const request = mockIndexedDB.deleteDatabase.mock.results[0].value
        if (request.onerror) {
          request.onerror()
        }
      }, 0)

      await expect(deleteDatabase()).rejects.toThrow(DatabaseError)
    })

    it('should throw DatabaseError when deletion is blocked', async () => {
      mockIndexedDB.deleteDatabase.mockReturnValue({
        onsuccess: null,
        onerror: null,
        onblocked: null,
      })

      setTimeout(() => {
        const request = mockIndexedDB.deleteDatabase.mock.results[0].value
        if (request.onblocked) {
          request.onblocked()
        }
      }, 0)

      await expect(deleteDatabase()).rejects.toThrow('blocked')
    })
  })

  describe('getStorageUsage', () => {
    it('should return usage and quota when available', async () => {
      const mockEstimate = vi.fn().mockResolvedValue({
        usage: 1000,
        quota: 5000,
      })

      Object.defineProperty(global.navigator, 'storage', {
        value: {
          estimate: mockEstimate,
        },
        writable: true,
      })

      const result = await getStorageUsage()

      expect(result).toEqual({ used: 1000, quota: 5000 })
    })

    it('should return default values when storage API is unavailable', async () => {
      Object.defineProperty(global.navigator, 'storage', {
        value: undefined,
        writable: true,
      })

      const result = await getStorageUsage()

      expect(result).toEqual({ used: 0 })
    })

    it('should handle estimate errors gracefully', async () => {
      const mockEstimate = vi.fn().mockRejectedValue(new Error('Estimate failed'))

      Object.defineProperty(global.navigator, 'storage', {
        value: {
          estimate: mockEstimate,
        },
        writable: true,
      })

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await getStorageUsage()

      expect(result).toEqual({ used: 0 })
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('hasEnoughStorage', () => {
    it('should return true when quota is undefined', async () => {
      const mockEstimate = vi.fn().mockResolvedValue({
        usage: 1000,
        quota: undefined,
      })

      Object.defineProperty(global.navigator, 'storage', {
        value: {
          estimate: mockEstimate,
        },
        writable: true,
      })

      const result = await hasEnoughStorage(1000000)

      expect(result).toBe(true)
    })

    it('should return true when enough space available', async () => {
      const mockEstimate = vi.fn().mockResolvedValue({
        usage: 1000,
        quota: 5000,
      })

      Object.defineProperty(global.navigator, 'storage', {
        value: {
          estimate: mockEstimate,
        },
        writable: true,
      })

      const result = await hasEnoughStorage(1000)

      expect(result).toBe(true)
    })

    it('should return false when not enough space', async () => {
      const mockEstimate = vi.fn().mockResolvedValue({
        usage: 4000,
        quota: 5000,
      })

      Object.defineProperty(global.navigator, 'storage', {
        value: {
          estimate: mockEstimate,
        },
        writable: true,
      })

      const result = await hasEnoughStorage(2000)

      expect(result).toBe(false)
    })
  })
})
