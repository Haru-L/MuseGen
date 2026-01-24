import { describe, it, expect, beforeEach } from 'vitest'
import { useSettingsStore } from '@/stores/settingsStore'
import { KALIMBA_17_KEY_C, KALIMBA_21_KEY_C, createCustomKalimba } from '@/utils/kalimbaPresets'

describe('settingsStore', () => {
  beforeEach(() => {
    useSettingsStore.getState().resetToDefault()
  })

  it('initializes with default kalimba', () => {
    const state = useSettingsStore.getState()
    expect(state.currentKalimba.id).toBe(KALIMBA_17_KEY_C.id)
  })

  it('sets current kalimba to preset', () => {
    useSettingsStore.getState().setCurrentKalimba(KALIMBA_21_KEY_C)
    const state = useSettingsStore.getState()
    expect(state.currentKalimba.id).toBe(KALIMBA_21_KEY_C.id)
  })

  it('adds custom kalimba and selects it', () => {
    const custom = createCustomKalimba(12, 60)
    const s = useSettingsStore.getState()
    s.addCustomKalimba(custom)
    s.setCurrentKalimba(custom)
    const state = useSettingsStore.getState()
    expect(state.currentKalimba.id).toBe(custom.id)
    expect(state.customKalimbas.find(k => k.id === custom.id)).toBeTruthy()
  })

  it('validity selector returns true for valid config', () => {
    const valid = useSettingsStore.getState().isCurrentValid()
    expect(valid).toBe(true)
  })

  it('deletes custom kalimba and falls back if current', () => {
    const custom = createCustomKalimba(12, 60)
    const s = useSettingsStore.getState()
    s.addCustomKalimba(custom)
    s.setCurrentKalimba(custom)
    expect(useSettingsStore.getState().currentKalimba.id).toBe(custom.id)

    s.deleteCustomKalimba(custom.id)
    const state = useSettingsStore.getState()
    expect(state.customKalimbas.some(k => k.id === custom.id)).toBe(false)
    expect(state.currentKalimba.id).toBe(KALIMBA_17_KEY_C.id)
  })
})
