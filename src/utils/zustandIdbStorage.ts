import type { StateStorage } from 'zustand/middleware'
import { idbDel, idbGet, idbSet } from '@/utils/indexedDbKV'

export const zustandIdbStorage: StateStorage = {
  getItem: async (name) => {
    return await idbGet(name)
  },
  setItem: async (name, value) => {
    await idbSet(name, value)
  },
  removeItem: async (name) => {
    await idbDel(name)
  }
}

