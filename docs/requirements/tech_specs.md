# MuseGen - 技术规格文档

## 1. 技术栈
- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **状态管理**: Zustand + Immer
- **音频处理**: Web Audio API + Essentia.js/Meyda
- **本地存储**: IndexedDB
- **UI库**: Tailwind CSS + Framer Motion + Lucide React
- **导出功能**: html2canvas (PNG), @tonejs/midi (MIDI)
- **音频合成**: Tone.js
- **测试验证**: Vitest + React Testing Library

## 2. 核心架构

### 2.1 样式系统
- **风格**: Mint/Lovable（薄玻璃质感、柔和渐变、胶囊按钮）。
- **主题**: 统一主色与 accent，全局 Lovable 渐变背景。
- **布局**: 头部透明叠加，组件胶囊化。

### 2.2 数据流
```
用户配置卡林巴 → MP3上传 → Web Audio解码 → 音高检测（主旋律） →
音符映射 → 节奏分析 → 三难度生成并缓存 → 乐谱渲染与难度切换 →
音频合成播放/离线渲染 → IndexedDB存储 → 导出(PNG/MIDI/WAV/MP3)
```

### 2.3 关键算法

#### 1. 音高检测 (Pitch Detection)
- **方法**: 滑动窗口 FFT 分析 + YIN 算法/自相关法。
- **输出**: 时间戳 + 频率 + 置信度。
- **运行环境**: Web Worker（Comlink 或原生消息传递）。

#### 2. 音符映射 (Note Mapping)
- **公式**: `MIDI = 69 + 12 × log2(freq / 440)`
- **逻辑**: 映射到用户配置的卡林巴琴键（17/21/自定义），过滤超出音域音符。

#### 3. 难度生成算法 (Difficulty Generation)
- **进阶版 (Advanced)**: 保留原始音符（仅过滤超音域），保留复杂节奏，全17键。
- **普通版 (Normal)**: 密度 70%，和弦简化（max 2音），8分音符量化，13键（3-15）。
- **入门版 (Beginner)**: 密度 40%，单音（最高音），4分音符量化，9键（5-13），最快2音/秒。
- **密度降低策略**: 基于重要性评分（力度 30% + 拍点 40% + 时值 20% + 乐句位置 10%）。

## 3. 项目结构

```
musegen/
├── src/
│   ├── components/
│   │   ├── AudioUploader/          # 文件上传
│   │   ├── DifficultySelector/     # 难度选择
│   │   ├── ProcessingIndicator/    # 进度显示
│   │   ├── ScoreViewer/            # 乐谱查看器
│   │   │   ├── SheetDisplay/       # 渲染核心
│   │   │   ├── PlaybackControls/   # 播放控制
│   │   │   └── ExportMenu/         # 导出菜单
│   │   ├── ScoreLibrary/           # 乐谱库 UI
│   │   └── SettingsPanel/          # 卡林巴配置 UI
│   ├── services/
│   │   ├── audio/                  # 音频处理服务
│   │   │   ├── AudioProcessor.ts
│   │   │   ├── PitchDetector.ts
│   │   │   ├── RhythmAnalyzer.ts
│   │   │   ├── NoteMapper.ts
│   │   │   └── AudioSynthesizer.ts
│   │   ├── generation/             # 生成算法服务
│   │   │   ├── DifficultyGenerator.ts
│   │   │   └── ScoreBuilder.ts
│   │   ├── export/                 # 导出服务
│   │   ├── storage/                # 存储服务
│   │   └── processing/             # 任务控制服务
│   ├── stores/                     # Zustand Stores
│   ├── types/                      # TypeScript 类型
│   ├── utils/                      # 工具函数
│   └── workers/                    # Web Workers
└── ...
```

## 4. 核心数据结构

```typescript
// 卡林巴配置
interface KalimbaConfig {
  id: string;
  name: string;
  keyCount: number;
  tuning: TineConfig[]; // 琴键配置
}

// 难度枚举
type Difficulty = 'beginner' | 'normal' | 'advanced';

// 乐谱集合（包含三档难度）
interface KalimbaScoreSet {
  id: string;
  title: string;
  duration: number;
  tempo: number;
  kalimbaConfig: KalimbaConfig;
  variants: Record<Difficulty, KalimbaScoreVariant>;
  statistics: { totalNotes: number; chordsCount: number; };
}

// 单个难度乐谱
interface KalimbaScoreVariant {
  difficulty: Difficulty;
  measures: Measure[];
  statistics: { totalNotes: number; chordsCount: number; };
}

// 小节与音符
interface Measure {
  number: number;
  notes: NoteEvent[];
}

interface NoteEvent {
  tineNumber: number;
  midiNote: number;
  startTime: number;
  duration: number;
  velocity: number;
  isChord: boolean;
  chordNotes?: number[];
}
```

## 5. 技术难点与解决方案

### 1. 音高检测准确率
- **挑战**: 噪声与复音干扰。
- **方案**: 优先 MVP 主旋律提取；后处理过滤离群值；置信度阈值 > 0.5；提供手动修正 UI（进阶）。

### 2. 性能问题 (长音频)
- **挑战**: 5分钟+ 音频导致卡顿。
- **方案**: 全面 Worker 化；分块处理；实现中间结果缓存。

### 3. 内存管理
- **挑战**: AudioBuffer 占用高。
- **方案**: 即时释放 AudioBuffer；使用 TypedArray；IndexedDB 落盘中间结果。

### 4. 节奏复杂性
- **挑战**: Rubato/Swing 等不规则节奏。
- **方案**: 自适应量化；Swing 模式检测；动态规划对齐。

### 5. 存储与隐私
- **存储方案**: 使用 IndexedDB 存储大文件（音频/乐谱），LocalStorage 仅存轻量配置。
- **清理策略**: 提供 API 清理指定前缀的 IndexedDB 数据库；版本升级时自动迁移或清理旧缓存。

## 6. 部署
- **平台**: Vercel (纯静态托管)。
- **构建**: Vite build (`npm run build`) -> `dist`。
- **环境**: 无需后端，无需环境变量。
- **浏览器要求**: 支持 Web Audio API, IndexedDB, Web Workers 的现代浏览器。

## 7. 最关键文件清单
1. `src/types/score.types.ts`
2. `src/types/kalimba.types.ts`
3. `src/stores/settingsStore.ts`
4. `src/services/audio/PitchDetector.ts`
5. `src/services/audio/NoteMapper.ts`
6. `src/services/audio/AudioSynthesizer.ts`
7. `src/services/generation/DifficultyGenerator.ts`
8. `src/components/ScoreViewer/SheetDisplay/MeasureRenderer.tsx`
9. `src/components/SettingsPanel/KalimbaPresets.tsx`
10. `src/components/DifficultySelector/index.tsx`
11. `src/services/storage/DatabaseService.ts`
12. `src/services/export/AudioExporter.ts`
