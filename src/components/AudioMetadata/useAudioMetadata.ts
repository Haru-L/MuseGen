/**
 * 音频元数据编辑 Hook
 *
 * 管理编辑状态、表单数据和保存操作
 */

import { useState, useCallback, useEffect } from 'react'
import type {
  AudioSource,
  MetadataFormData,
  MetadataFormErrors,
  EditorMode,
  UseAudioMetadataProps,
  UseAudioMetadataReturn,
} from './types'

/**
 * 从 AudioSource 提取表单初始值
 */
function extractInitialFormData(source: AudioSource | null): MetadataFormData {
  return {
    title: source?.title ?? '',
  }
}

/**
 * 验证表单数据
 */
function validateForm(data: MetadataFormData): MetadataFormErrors {
  const errors: MetadataFormErrors = {}

  if (!data.title.trim()) {
    errors.title = '标题不能为空'
  } else if (data.title.length > 200) {
    errors.title = '标题长度不能超过 200 个字符'
  }

  return errors
}

/**
 * 音频元数据编辑 Hook
 */
export function useAudioMetadata({
  initialData,
  onSave,
  onSaveSuccess,
}: UseAudioMetadataProps): UseAudioMetadataReturn {
  // ============ 状态 ============
  const [formData, setFormData] = useState<MetadataFormData>(() =>
    extractInitialFormData(initialData)
  )
  const [errors, setErrors] = useState<MetadataFormErrors>({})
  const [mode, setMode] = useState<EditorMode>('view')
  const [isSaving, setIsSaving] = useState(false)

  // ============ 副作用 ============
  // 当初始数据变化时重置表单
  useEffect(() => {
    setFormData(extractInitialFormData(initialData))
    setErrors({})
    setMode('view')
  }, [initialData?.id]) // 只当 ID 变化时重置（即切换音频源）

  // ============ 回调函数 ============
  const updateField = useCallback(
    (field: keyof MetadataFormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
      // 清除对应字段的错误
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }))
      }
    },
    [errors]
  )

  const validate = useCallback((): boolean => {
    const newErrors = validateForm(formData)
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const submit = useCallback(async (): Promise<boolean> => {
    // 1. 验证表单
    if (!validate()) {
      return false
    }

    // 2. 执行保存
    setIsSaving(true)
    try {
      await onSave(formData)
      setMode('view')
      onSaveSuccess?.()
      return true
    } catch (error) {
      console.error('Failed to save metadata:', error)
      setMode('edit') // 确保保持在编辑模式
      setErrors((prev) => ({
        ...prev,
        title: '保存失败，请重试',
      }))
      return false
    } finally {
      setIsSaving(false)
    }
  }, [formData, validate, onSave, onSaveSuccess])

  const reset = useCallback((): void => {
    setFormData(extractInitialFormData(initialData))
    setErrors({})
    setMode('view')
  }, [initialData])

  // ============ 返回值 ============
  return {
    formData,
    errors,
    mode,
    isSaving,
    setMode,
    updateField,
    validate,
    submit,
    reset,
  }
}
