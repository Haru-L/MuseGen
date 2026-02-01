/**
 * 音频元数据编辑器类型定义
 */

import type { AudioSource } from '@/db/schema'
export type { AudioSource }

/**
 * 编辑器状态
 */
export type EditorMode = 'view' | 'edit'

/**
 * 表单数据
 */
export interface MetadataFormData {
  title: string
}

/**
 * 表单错误
 */
export interface MetadataFormErrors {
  title?: string
}

/**
 * 编辑器 Props
 */
export interface AudioMetadataEditorProps {
  /** 当前音频源数据 */
  audioSource: AudioSource | null
  /** 保存回调 */
  onSave: (updates: MetadataFormData) => Promise<void>
  /** 取消回调 */
  onCancel?: () => void
  /** 加载状态 */
  isLoading?: boolean
}

/**
 * Hook 返回类型
 */
export interface UseAudioMetadataReturn {
  /** 当前表单数据 */
  formData: MetadataFormData
  /** 表单错误 */
  errors: MetadataFormErrors
  /** 编辑模式 */
  mode: EditorMode
  /** 是否正在保存 */
  isSaving: boolean
  /** 设置编辑模式 */
  setMode: (mode: EditorMode) => void
  /** 更新表单字段 */
  updateField: (field: keyof MetadataFormData, value: string) => void
  /** 验证表单 */
  validate: () => boolean
  /** 提交表单 */
  submit: () => Promise<boolean>
  /** 重置表单 */
  reset: () => void
}

/**
 * Hook Props
 */
export interface UseAudioMetadataProps {
  /** 初始数据 */
  initialData: AudioSource | null
  /** 保存回调 */
  onSave: (updates: MetadataFormData) => Promise<void>
  /** 保存成功回调 */
  onSaveSuccess?: () => void
}

/**
 * 元数据字段展示项
 */
export interface MetadataDisplayItem {
  label: string
  value: string | number
  unit?: string
  icon?: string
}
