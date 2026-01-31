import { describe, it, expect, vi, beforeEach } from 'vitest'
import { zustandIdbStorage } from '../utils/zustandIdbStorage'
import * as indexedDbKV from '../utils/indexedDbKV'

// Mock indexedDbKV
vi.mock('../utils/indexedDbKV', () => ({
  idbGet: vi.fn(),
  idbSet: vi.fn(),
  idbDel: vi.fn(),
}))

describe('zustandIdbStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('should get item from IndexedDB if it exists', async () => {
    const key = 'test-key'
    const value = 'test-value'
    vi.mocked(indexedDbKV.idbGet).mockResolvedValue(value)

    const result = await zustandIdbStorage.getItem(key)

    expect(result).toBe(value)
    expect(indexedDbKV.idbGet).toHaveBeenCalledWith(key)
    expect(localStorage.getItem(key)).toBeNull()
  })

  it('should migrate from LocalStorage if IndexedDB is empty', async () => {
    const key = 'migration-key'
    const value = 'legacy-value'
    
    // IndexedDB return null (empty)
    vi.mocked(indexedDbKV.idbGet).mockResolvedValue(null)
    // LocalStorage has value
    localStorage.setItem(key, value)

    const result = await zustandIdbStorage.getItem(key)

    // Should return value
    expect(result).toBe(value)
    // Should set to IDB
    expect(indexedDbKV.idbSet).toHaveBeenCalledWith(key, value)
    // Should remove from LocalStorage
    expect(localStorage.getItem(key)).toBeNull()
  })

  it('should return null if neither exists', async () => {
    const key = 'empty-key'
    vi.mocked(indexedDbKV.idbGet).mockResolvedValue(null)
    
    const result = await zustandIdbStorage.getItem(key)

    expect(result).toBeNull()
  })

  it('should handle migration error gracefully', async () => {
    const key = 'error-key'
    const value = 'value'
    
    vi.mocked(indexedDbKV.idbGet).mockResolvedValue(null)
    localStorage.setItem(key, value)
    
    // Simulate IDB error
    vi.mocked(indexedDbKV.idbSet).mockRejectedValue(new Error('IDB Error'))
    // Spy on console.warn
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await zustandIdbStorage.getItem(key)

    // Should still return value (fallback)
    expect(result).toBe(value)
    // Should NOT remove from LocalStorage (safe fallback)
    expect(localStorage.getItem(key)).toBe(value)
    expect(consoleSpy).toHaveBeenCalled()
  })
})
