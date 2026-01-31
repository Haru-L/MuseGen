import type { StateStorage } from 'zustand/middleware'
import { idbDel, idbGet, idbSet } from '@/utils/indexedDbKV'

export const zustandIdbStorage: StateStorage = {
  getItem: async (name) => {
    // 优先从 IndexedDB 读取
    const value = await idbGet(name)
    if (value) {
      return value
    }

    // 迁移策略：如果 IDB 为空，尝试从 LocalStorage 读取
    // 这确保了从旧版本升级时用户的配置不丢失
    const localValue = localStorage.getItem(name)
    if (localValue) {
      try {
        // 迁移到 IndexedDB
        await idbSet(name, localValue)
        // 清理旧数据
        localStorage.removeItem(name)
        return localValue
      } catch (e) {
        console.warn('Failed to migrate data from localStorage to IndexedDB:', e)
        return localValue
      }
    }

    return null
  },
  setItem: async (name, value) => {
    await idbSet(name, value)
  },
  removeItem: async (name) => {
    await idbDel(name)
  }
}

