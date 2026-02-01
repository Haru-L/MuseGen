/**
 * 音频元数据编辑器组件
 *
 * 提供音频元数据查看和编辑功能
 */

// 主组件
export { AudioMetadataEditor } from './AudioMetadataEditor'

// Hook
export { useAudioMetadata } from './useAudioMetadata'

// 类型
export type {
  EditorMode,
  MetadataFormData,
  MetadataFormErrors,
  AudioMetadataEditorProps,
  UseAudioMetadataReturn,
  UseAudioMetadataProps,
  MetadataDisplayItem,
} from './types'
