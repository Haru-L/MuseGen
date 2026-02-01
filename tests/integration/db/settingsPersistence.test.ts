import { describe, it, expect, beforeEach, vi } from 'vitest'
import { KALIMBA_21_KEY_C, createCustomKalimba } from '@/utils/kalimbaPresets'
import { idbDel, idbGet } from '@/utils/indexedDbKV'

async function waitFor<T>(fn: () => Promise<T>, predicate: (v: T) => boolean) {
  const timeoutMs = 2500
  const start = Date.now()
  while (true) {
    const v = await fn()
    if (predicate(v)) {
      return v
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error('waitFor timed out')
    }
    await new Promise(r => setTimeout(r, 25))
  }
}

describe('settingsStore persistence (IndexedDB)', () => {
  beforeEach(async () => {
    try { localStorage.clear() } catch { /* ignore */ }
    await idbDel('musegen-settings')
    vi.resetModules()
  })

  it('rehydrates state from IndexedDB', async () => {
    const mod1 = await import('@/stores/settingsStore')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store1 = mod1.useSettingsStore as any
    if (store1.persist?.rehydrate) {
      await store1.persist.rehydrate()
    }

    const custom = createCustomKalimba(12, 60)
    const s = store1.getState()
    s.addCustomKalimba(custom)
    s.setCurrentKalimba(KALIMBA_21_KEY_C)
    s.setCurrentKalimba(custom)

    await waitFor(() => idbGet('musegen-settings'), (v) => typeof v === 'string' && v.length > 0)

    vi.resetModules()
    const mod2 = await import('@/stores/settingsStore')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store2 = mod2.useSettingsStore as any
    if (store2.persist?.rehydrate) {
      await store2.persist.rehydrate()
    }

    const state2 = store2.getState()
    expect(state2.currentKalimba.id).toBe(custom.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(state2.customKalimbas.some((k: any) => k.id === custom.id)).toBe(true)
  })
})

