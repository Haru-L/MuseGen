import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { KalimbaConfig } from '@/types/kalimba.types';
import { getDefaultKalimba, validateKalimbaConfig } from '@/utils/kalimbaPresets';
import { zustandIdbStorage } from '@/utils/zustandIdbStorage';

interface SettingsState {
  // 当前使用的卡林巴配置
  currentKalimba: KalimbaConfig;

  // 用户自定义的配置列表
  customKalimbas: KalimbaConfig[];

  // Actions
  setCurrentKalimba: (config: KalimbaConfig) => void;
  setCurrentByPresetId: (id: string) => void;
  addCustomKalimba: (config: KalimbaConfig) => void;
  updateCustomKalimba: (id: string, config: Partial<KalimbaConfig>) => void;
  deleteCustomKalimba: (id: string) => void;
  resetToDefault: () => void;

  // Selectors
  isCurrentValid: () => boolean;
}

/**
 * 设置状态管理
 * 使用 Zustand + persist 中间件持久化到 IndexedDB
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      currentKalimba: getDefaultKalimba(),
      customKalimbas: [],

      setCurrentKalimba: (config: KalimbaConfig) => {
        if (!validateKalimbaConfig(config)) {
          return;
        }

        set({ currentKalimba: config });
      },

      setCurrentByPresetId: (id: string) => {
        const preset = getDefaultKalimba();
        const { customKalimbas } = get();
        const found = customKalimbas.find(k => k.id === id);
        const next = found ?? (id === preset.id ? preset : undefined);
        if (next && validateKalimbaConfig(next)) {
          set({ currentKalimba: next });
        }
      },

      addCustomKalimba: (config: KalimbaConfig) => {
        if (!validateKalimbaConfig(config)) {
          return;
        }

        if (!config.isCustom) {
          return;
        }

        const { customKalimbas } = get();
        const exists = customKalimbas.some(k => k.id === config.id);

        if (exists) {
          return;
        }

        set({
          customKalimbas: [...customKalimbas, config]
        });
      },

      updateCustomKalimba: (id: string, updates: Partial<KalimbaConfig>) => {
        const { customKalimbas, currentKalimba } = get();
        const index = customKalimbas.findIndex(k => k.id === id);

        if (index === -1) {
          return;
        }

        const updated = {
          ...customKalimbas[index],
          ...updates,
          id, // 确保ID不被修改
          isCustom: true // 确保自定义标记
        };

        if (!validateKalimbaConfig(updated)) {
          return;
        }

        const newCustomKalimbas = [...customKalimbas];
        newCustomKalimbas[index] = updated;

        set({
          customKalimbas: newCustomKalimbas,
          // 如果更新的是当前配置，也更新 currentKalimba
          ...(currentKalimba.id === id ? { currentKalimba: updated } : {})
        });
      },

      deleteCustomKalimba: (id: string) => {
        const { customKalimbas, currentKalimba } = get();
        const filtered = customKalimbas.filter(k => k.id !== id);

        set({
          customKalimbas: filtered,
          // 如果删除的是当前配置，切换到默认配置
          ...(currentKalimba.id === id ? { currentKalimba: getDefaultKalimba() } : {})
        });
      },

      resetToDefault: () => {
        set({
          currentKalimba: getDefaultKalimba(),
          customKalimbas: []
        });
      },

      isCurrentValid: () => {
        const { currentKalimba } = get();
        return validateKalimbaConfig(currentKalimba);
      }
    }),
    {
      name: 'musegen-settings',
      storage: createJSONStorage(() => zustandIdbStorage),
      version: 1
    }
  )
);
