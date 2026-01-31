# MuseGen - 卡林巴琴乐谱生成器实现计划

## 项目概述
构建一个纯前端的 Web 应用，允许用户上传 MP3 音频文件，自动分析并生成三档难度（入门/普通/进阶）的卡林巴琴乐谱，支持在查看器中切换难度，并支持播放合成的卡林巴音频。用户可以自定义卡林巴配置（17键/21键/自定义）。所有用户数据仅在本地缓存，不上传服务器、不做跨端同步；允许接入外部资源。

### 范围与约束（明确边界）
- **离线要求**：不要求完全离线可运行；允许加载外部资源，但用户上传音频与生成结果仅本地处理与缓存。
- **输入限制**：最大音频时长 10 分钟；最大文件大小 50MB；超出限制需明确提示并拒绝处理。
- **MVP 算法范围**：以主旋律（monophonic）提取为主；和弦/复音识别作为进阶目标放到最后里程碑。
- **存储策略**：统一使用 IndexedDB 存储（设置、乐谱、音频/中间结果），并提供轻量缓存层以降低重复计算。

## 技术栈
- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **状态管理**: Zustand
- **音频处理**: Web Audio API + Essentia.js/Meyda
- **本地存储**: IndexedDB
- **UI库**: Tailwind CSS + Framer Motion
- **导出功能**: html2canvas (PNG), @tonejs/midi (MIDI)
- **音频合成**: Tone.js
- **测试验证**：Vitest + React Testing Library

## 核心架构

### 样式要求
- UI 风格升级为 Mint/Lovable：薄玻璃质感、柔和渐变、胶囊按钮、软阴影与轻微动效
- 全局样式与主题：统一主色与 accent、阴影定义，背景渐变与组件胶囊化
- 布局与导航：头部透明叠加、全局 Lovable 渐变背景组件接入
- 首页美化：主标题渐变、图标微动效、卡片玻璃态统一

### 数据流
```
用户配置卡林巴 → MP3上传 → Web Audio解码 → 音高检测（主旋律） →
音符映射 → 节奏分析 → 三难度生成并缓存 → 乐谱渲染与难度切换 →
音频合成播放/离线渲染 → IndexedDB存储 → 导出(PNG/MIDI/WAV/MP3)
```

### 关键算法

#### 1. 音高检测 (Pitch Detection)
- 使用滑动窗口FFT分析
- YIN算法或自相关法提取基频
- 输出：时间戳 + 频率 + 置信度

#### 2. 音符映射 (Note Mapping)
- 频率转MIDI音符号：`MIDI = 69 + 12 × log2(freq / 440)`
- 映射到用户配置的卡林巴琴键（17键/21键/自定义）
- 过滤超出音域的音符
- 支持用户自定义每个琴键的音符

#### 3. 难度生成算法

**进阶版（Advanced）**:
- 保留原始音符（仅过滤超出音域）
- 和弦/复音识别作为进阶目标时：保留更多同时发声的音（非 MVP）
- 保留复杂节奏（在可控误差范围内）
- 音域：全部17键

**普通版（Normal）**:
- 音符密度：保留70%
- 和弦简化：最多保留2个音
- 节奏量化：最小8分音符
- 音域：13键（3-15号琴键）

**入门版（Beginner）**:
- 音符密度：保留40%（提取主旋律）
- 和弦转单音：只保留最高音
- 节奏量化：最小4分音符
- 音域：9键（5-13号琴键）
- 音符间隔：最快每秒2个音

**密度降低策略**:
按重要性评分保留音符：
- 力度越强越重要（30%权重）
- 拍点位置重要（40%权重）
- 音符时值长更重要（20%权重）
- 乐句首尾音符重要（10%权重，可用能量包络/静音段近似；不可得时权重置0）

## 项目结构

```
musegen/
├── src/
│   ├── components/
│   │   ├── AudioUploader/          # 文件上传组件
│   │   ├── DifficultySelector/     # 难度选择组件（生成前）
│   │   ├── ProcessingIndicator/    # 处理进度显示
│   │   ├── ScoreViewer/            # 乐谱查看器
│   │   │   ├── SheetDisplay/       # 乐谱渲染（数字+可视化）
│   │   │   ├── PlaybackControls/   # 播放控制
│   │   │   └── ExportMenu/         # 导出菜单
│   │   ├── ScoreLibrary/           # 本地乐谱库
│   │   └── SettingsPanel/          # ⭐ 卡林巴配置
│   │       ├── KalimbaPresets.tsx  # 预设配置（17/21键）
│   │       └── CustomTuning.tsx    # 自定义调音
│   ├── services/
│   │   ├── audio/
│   │   │   ├── AudioProcessor.ts      # Web Audio API封装
│   │   │   ├── PitchDetector.ts       # ⭐ 音高检测
│   │   │   ├── RhythmAnalyzer.ts      # 节奏分析
│   │   │   ├── NoteMapper.ts          # 音符映射
│   │   │   └── AudioSynthesizer.ts    # ⭐ 卡林巴音频合成
│   │   ├── generation/
│   │   │   ├── DifficultyGenerator.ts # ⭐ 难度生成算法
│   │   │   └── ScoreBuilder.ts        # 乐谱构建
│   │   ├── export/
│   │   │   ├── PNGExporter.ts         # PNG导出
│   │   │   └── MIDIExporter.ts        # MIDI导出
│   │   └── storage/
│   │       └── DatabaseService.ts     # ⭐ IndexedDB封装
│   ├── stores/
│   │   ├── audioStore.ts              # 音频状态管理
│   │   ├── scoreStore.ts              # 乐谱状态管理
│   │   └── settingsStore.ts           # ⭐ 设置状态管理
│   ├── types/
│   │   ├── score.types.ts             # ⭐ 核心数据结构
│   │   └── kalimba.types.ts           # 卡林巴配置
│   ├── utils/
│   │   ├── kalimbaPresets.ts          # 17/21键预设
│   │   └── musicTheory.ts             # 音乐理论工具
│   └── workers/
│       └── audioProcessor.worker.ts   # Web Worker处理音频
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 核心数据结构

```typescript
// 卡林巴配置
interface KalimbaConfig {
  id: string;
  name: string;                // "17键C大调", "21键", "自定义"
  keyCount: number;            // 键数
  tuning: TineConfig[];        // 每个琴键的配置
}

interface TineConfig {
  tineNumber: number;          // 琴键编号
  midiNote: number;            // MIDI音符号
  noteName: string;            // 音符名 "C4"
  frequency: number;           // 频率 Hz
}

type Difficulty = 'beginner' | 'normal' | 'advanced';

// 单个难度的卡林巴乐谱（作为变体）
interface KalimbaScoreVariant {
  difficulty: Difficulty;
  measures: Measure[];
  statistics: {
    totalNotes: number;
    chordsCount: number;
  };
}

// 一次处理生成的乐谱集合（同一来源，包含三档难度）
interface KalimbaScoreSet {
  id: string;
  title: string;
  duration: number;
  tempo: number;
  kalimbaConfig: KalimbaConfig;
  variants: Record<Difficulty, KalimbaScoreVariant>;
  statistics: {
    totalNotes: number;
    chordsCount: number;
  };
}

// 小节
interface Measure {
  number: number;
  notes: NoteEvent[];
}

// 音符事件
interface NoteEvent {
  tineNumber: number;      // 琴键编号
  midiNote: number;        // MIDI音符号
  startTime: number;       // 开始时间（四分音符）
  duration: number;        // 持续时间（四分音符）
  velocity: number;        // 力度 0-127
  isChord: boolean;        // 是否为和弦
  chordNotes?: number[];   // 和弦其他音
}
```

## 实现步骤

### Phase 0: 基础设施（任务/进度/取消/错误）
1. **处理任务基础设施模块**
   - 统一任务状态机（idle/queued/running/succeeded/failed/canceled）
   - 统一进度事件协议（阶段、百分比、耗时估计）
   - 支持取消/中断（UI 触发 → Worker 停止 → 资源释放）
   - 统一错误模型与错误呈现（可恢复/不可恢复、用户提示文案）

**关键文件（示例）**:
- `src/services/processing/TaskController.ts` ⭐
- `src/services/processing/ProgressEvents.ts`
- `src/components/ProcessingIndicator/`

### Phase 1: 项目初始化和设置功能
1. 初始化Vite + React + TypeScript项目
2. 配置Tailwind CSS
3. 创建基础组件结构和路由
4. 定义核心TypeScript类型

5. **卡林巴设置页面**
   - 创建17键/21键预设配置
   - 自定义琴键数量和调音界面
   - 每个琴键的音符配置UI
   - 预设保存到IndexedDB
   - 设置状态管理

**关键文件**:
- `package.json` - 依赖配置
- `vite.config.ts` - 构建配置
- `src/types/score.types.ts` - 数据结构
- `src/types/kalimba.types.ts` - 卡林巴配置
- `src/components/SettingsPanel/KalimbaPresets.tsx` ⭐
- `src/components/SettingsPanel/CustomTuning.tsx` ⭐
- `src/stores/settingsStore.ts` ⭐
- `src/utils/kalimbaPresets.ts`

### Phase 2: 音频上传与基础信息
1. 实现文件拖拽上传组件（react-dropzone）
2. 基础信息输入（标题/可选元数据）与默认展示难度选择（查看器内切换）
3. Web Audio API音频解码
4. 基础错误处理和文件验证
   - 最大时长 10 分钟
   - 最大文件 50MB
5. 进度指示器UI

**关键文件**:
- `src/components/AudioUploader/FileDropzone.tsx`
- `src/components/DifficultySelector/index.tsx` ⭐
- `src/services/audio/AudioProcessor.ts`
- `src/stores/audioStore.ts`

### Phase 3: 音频分析核心⭐ 最关键
1. **音高检测算法**
   - 集成Essentia.js或Meyda库
   - 实现滑动窗口FFT分析
   - 配置Web Worker避免UI阻塞
   - 以主旋律（monophonic）提取为目标，优先保证稳定性与速度
   - 测试不同音乐类型准确率

2. **音符映射（支持动态配置）**
   - 频率转MIDI
   - 根据用户配置的卡林巴映射音符
   - 支持17键/21键/自定义配置
   - 处理超出音域的音符

3. **节奏分析**
   - 检测节拍起始点
   - 估算BPM
   - 音符量化到音乐网格

**关键文件**:
- `src/services/audio/PitchDetector.ts` ⭐
- `src/services/audio/NoteMapper.ts` ⭐（需支持动态配置）
- `src/services/audio/RhythmAnalyzer.ts`
- `src/workers/audioProcessor.worker.ts`

### Phase 4: 难度生成算法⭐ 核心功能
1. **一次处理生成三难度并缓存**
   - 音符重要性评分算法
   - 分别对三档难度应用不同策略：
     - 入门：音符密度40%，和弦转单音，4分音符网格
     - 普通：音符密度70%，和弦最多2音，8分音符网格
     - 进阶：保留原始，仅过滤超出音域
   - 节奏简化和量化
   - 音域限制
   - 输出：`KalimbaScoreSet`（含三份变体）并写入 IndexedDB

2. **测试和调优**
   - 用不同风格音乐测试
   - 验证难度差异合理性
   - 性能优化

**关键文件**:
- `src/services/generation/DifficultyGenerator.ts` ⭐
- `src/services/generation/ScoreBuilder.ts`

### Phase 5: 乐谱渲染
1. **乐谱可视化**
   - SVG渲染系统
   - 数字记谱法（显示琴键编号）
   - 可视化布局（物理琴键位置）
   - 小节和拍子显示
   - 和弦标注

2. **交互功能**
   - 难度切换
   - 播放时高亮当前音符
   - 响应式设计

**关键文件**:
- `src/components/ScoreViewer/SheetDisplay/KalimbaNotation.tsx`
- `src/components/ScoreViewer/SheetDisplay/MeasureRenderer.tsx`
- `src/components/ScoreViewer/DifficultySelector.tsx`

### Phase 6: 音频合成和播放功能⭐ 新增功能
1. **卡林巴音色合成**
   - 使用Tone.js合成卡林巴音色
   - 实现逼真的音色模拟（基础音+泛音）
   - 支持力度变化（velocity映射到音量）
   - ADSR包络设置

2. **播放系统**
   - 音符调度器（精确时间控制）
   - 播放/暂停/停止控制
   - 进度条和时间显示
   - 速度调节（0.5x - 2x）
   - 播放时高亮当前音符

3. **导出**
   - PNG 导出（基于乐谱渲染结果，html2canvas）
   - MIDI 导出（基于乐谱数据，@tonejs/midi）
   - 音频导出（基于合成与调度，Offline AudioContext → WAV/MP3）
   - 说明：PNG/MIDI 导出依赖“乐谱渲染/乐谱数据”；音频导出依赖“合成/调度”。两者可并行推进，不互为前置。

**关键文件**:
- `src/services/audio/AudioSynthesizer.ts` ⭐ 新增
- `src/services/playback/NoteScheduler.ts` ⭐ 新增
- `src/components/ScoreViewer/PlaybackControls/` ⭐

### Phase 7: 本地存储⭐ 关键需求
1. **IndexedDB集成**
   - 乐谱CRUD操作
   - 音频缓存管理
   - 设置与预设存储（统一到 IndexedDB）
   - 轻量缓存层（避免重复分析、支持缓存命中统计）
   - 存储空间监控
   - 清理过期缓存

2. **乐谱库UI**
   - 列表显示
   - 搜索过滤
   - 删除确认

**关键文件**:
- `src/services/storage/DatabaseService.ts` ⭐
- `src/components/ScoreLibrary/ScoreList.tsx`
- `src/stores/scoreStore.ts`

### Phase 9: 优化和完善
1. 性能优化
   - Web Worker并行处理
   - 虚拟滚动（长乐谱）
   - React.memo优化渲染
2. UI/UX打磨
   - 加载动画
   - 错误提示优化
   - 帮助文档/教程
3. 测试
   - 各种音乐风格测试
   - 浏览器兼容性测试
   - 边界情况处理

## 关键依赖

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.4.0",
    "essentia.js": "^0.1.3",
    "meyda": "^5.6.1",
    "tone": "^14.8.49",
    "@tonejs/midi": "^2.0.28",
    "html2canvas": "^1.4.1",
    "react-dropzone": "^14.2.3",
    "framer-motion": "^10.16.4",
    "uuid": "^9.0.1",
    "lamejs": "^1.2.1"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "typescript": "^5.2.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "tailwindcss": "^3.4.0"
  }
}
```

## 技术难点和解决方案

### 1. 音高检测准确率
**挑战**: 真实音乐常包含复音/和弦与噪声，主旋律抽取易受干扰

**解决方案**:
- MVP 以主旋律（monophonic）提取为目标，优先选择可落地、性能可控的方案
- 后处理过滤离群值
- 置信度阈值过滤（>0.5）
- 保留UI手动修正接口

**进阶目标**:
- 和弦/复音识别与和弦标注

### 2. 性能问题
**挑战**: 长音频文件（5分钟+）处理可能卡顿

**解决方案**:
- Web Worker执行所有重计算
- 分块处理大音频
- 进度反馈
- 实现缓存避免重复处理

### 3. 内存管理
**挑战**: AudioBuffer占用大量内存

**解决方案**:
- 处理后立即释放AudioBuffer
- 使用TypedArray
- IndexedDB定期清理
- 监控内存使用

### 4. 节奏复杂性
**挑战**: 真实音乐有rubato、swing等不规则节奏

**解决方案**:
- 自适应量化（动态调整网格）
- 检测swing模式并保留
- 动态规划最优对齐
- UI提供速度微调

## 风险管理（登记表）

| 风险 | 触发信号 | 潜在影响 | 缓解/应对策略 | 降级方案 |
|---|---|---|---|---|
| 主旋律提取准确率不足 | 回归集指标下降、用户反馈“跑调/漏音” | 生成乐谱不可用，返工调参 | 标准音频集回归；置信度阈值+离群值滤波；可视化调参面板（内部） | 降低输出密度、提高量化网格、只输出高置信度音符 |
| 性能/卡顿（长音频） | 处理时间超阈值、页面无响应 | 体验差、浏览器崩溃 | Worker 分块处理；可取消；进度反馈；缓存避免重复处理 | 限制最大时长/采样降频；仅分析片段 |
| 内存占用过高 | 大音频解码后内存飙升 | 崩溃/标签页被杀 | 及时释放 AudioBuffer；TypedArray；分块；IndexedDB 中间结果落盘 | 更严格时长限制；提示用户拆分 |
| 浏览器兼容问题 | Safari/移动端音频API行为差异 | 部分用户不可用 | 早期兼容性冒烟测试；关键API做能力检测与兜底 | 降级关闭部分导出/可视化；提示最低版本 |
| MP3 导出不稳定/质量差 | 编码失败或音质差、体积过大 | 导出功能不可用 | WAV 作为可靠基线；MP3 作为增强；对外明确“实验性”标识（如需要） | 仅导出 WAV |
| IndexedDB 配额/异常 | 存储失败、配额不足提示 | 无法缓存、数据丢失感 | 存储空间监控；缓存清理策略；失败时提示与重试 | 仅内存缓存本次会话，不落盘 |
| 外部资源可用性 | CDN/第三方资源加载失败 | 页面功能受限 | 资源版本锁定与兜底镜像；加载失败提示与重试 | 提示用户刷新/更换网络；关闭对应功能 |
| 版权/合规（用户上传音乐） | 用户上传受版权保护内容 | 合规风险、用户误解“上传到服务器” | 明确本地处理说明；上传区加入免责声明与版权提示；不做跨端同步 | 在关键页面重复提示，提供“我已确认”勾选 |

### 产品提示与免责（放置位置建议）
- 上传区域：显示“音频仅在本地处理与缓存，不上传服务器；请确保你有权使用该音频进行分析与生成”
- 首次使用：弹窗或引导页勾选确认（可选）

## 验证计划

### 开发验证要求
- Dev: http://localhost:5173/ 正常运行（含 HMR）
- Preview: http://localhost:4173/ 加载最新产物，无错误
- 代码诊断无报错；样式入口与 Tailwind/PostCSS 配置完整

### 功能测试
1. **设置测试** 
   - [ ] 切换17键/21键预设
   - [ ] 自定义琴键数量
   - [ ] 修改每个琴键的音符
   - [ ] 保存和加载配置

2. **上传测试**
   - [ ] 上传各种大小的MP3文件（1MB - 50MB）
   - [ ] 测试错误格式处理
   - [ ] 测试取消上传
   - [ ] 超过 10 分钟或 50MB 的拒绝处理与提示文案

3. **难度选择测试** 
   - [ ] 选择入门难度生成
   - [ ] 选择普通难度生成
   - [ ] 选择进阶难度生成
   - [ ] 验证不同难度差异明显

4. **处理测试**
   - [ ] 测试不同音乐风格（流行、古典、民谣）
   - [ ] 检查音符准确性
   - [ ] 验证节奏量化合理
   - [ ] 测试自定义配置的音符映射

5. **存储测试**
   - [ ] 保存和加载乐谱
   - [ ] 删除乐谱
   - [ ] 验证缓存机制
   - [ ] 测试存储空间限制

6. **导出测试**
   - [ ] PNG分辨率和质量
   - [ ] MIDI播放正确性
   - [ ] 音频导出质量（WAV/MP3）

7. **播放测试** 
   - [ ] 播放/暂停/停止功能
   - [ ] 进度跳转
   - [ ] 速度调节（0.5x - 2x）
   - [ ] 音符高亮同步
   - [ ] 音色逼真度
   - [ ] 和弦播放正确性（进阶目标，最后里程碑）

### 回归测试（标准音频集）
- 维护一组短片段“标准测试音频”，每次里程碑验收与回归必须跑完整集合
- 以统计指标为主（音高/起音/节奏误差等），人工可演奏反馈作为辅助
- 建议指标口径（可按实现可行性裁剪）：
  - 音高：按时间帧/音符级别的 Top-1 命中率（允许 ±50 cent 容差）
  - 起音：Onset F1（容差窗口例如 ±50ms）
  - 速度：BPM 估计误差（|ΔBPM|）与量化误差分布（p50/p95）

### 里程碑验收机制
- 每个里程碑进行一次阶段性验收：可运行 Demo + 回归音频集 + 指标报告 + 已知问题清单

### 性能测试
- 30秒音频：处理时间 < 10秒
- 3分钟音频：处理时间 < 60秒
- 内存占用：< 500MB
- 首次加载：< 3秒

### 兼容性测试
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 部署

### 构建配置
- 代码分割（audio-processing、ui-components、export）
- 开启gzip压缩
- 优化chunk大小
- Service Worker缓存静态资源（可选，用于提升加载性能）

### 托管平台
- **Vercel**（指定平台）
- 纯静态托管，无需后端
- 自动HTTPS和CDN加速
- 零配置部署
- 支持预览部署和生产部署

**部署步骤**:
1. 连接GitHub仓库到Vercel
2. Vercel自动检测Vite项目配置
3. 构建命令：`npm run build`
4. 输出目录：`dist`
5. 环境变量：无需配置

### 浏览器要求
- 现代浏览器（Chrome/Firefox/Safari/Edge最新版）
- 必须支持：Web Audio API、IndexedDB、Web Workers
- 文档明确说明最低版本要求

## 里程碑

**Week 4**: 音频处理管道完成，能从MP3提取音符
**Week 7**: 三难度生成完成，能生成可用乐谱
**Week 10**: MVP完成，包含基础UI和存储
**Week 14**: 完整功能，优化和测试完成

## 周级时间线（单人，含依赖关系）

| 周次 | Phase | 目标输出 | 关键依赖 |
|---|---|---|---|
| Week 1-2 | Phase 0-1 | 项目脚手架、UI基础、设置功能、任务/进度/取消/错误基础设施 | 无 |
| Week 3 | Phase 2 | 上传与解码、输入校验（10分钟/50MB）、基础错误与进度展示 | Phase 0 |
| Week 4-6 | Phase 3 | 主旋律音高检测、音符映射、节奏分析（Worker化），可产出粗乐谱 | Phase 2 |
| Week 7 | Phase 4 | 一次生成三难度变体并缓存（`KalimbaScoreSet`） | Phase 3 |
| Week 8-9 | Phase 5 | 乐谱渲染、难度切换、播放高亮联动 | Phase 4 |
| Week 9-10 | Phase 7 | IndexedDB 存储（含设置/预设/乐谱集）+ 轻量缓存层 + 乐谱库 UI | Phase 4 |
| Week 9-11 | Phase 6 | 合成与调度、播放控件；导出（PNG/MIDI/WAV/MP3） | Phase 5（PNG）/ Phase 4（MIDI）/ Phase 6（WAV/MP3） |
| Week 12-14 | Phase 9 | 性能与兼容性、质量打磨、文档与帮助；进阶目标（和弦/复音） | 全链路可运行 |

---

## 最关键的文件

按优先级排序，这些是系统的核心：

### 核心配置和数据
1. **src/types/score.types.ts** - 数据结构基础
2. **src/types/kalimba.types.ts** - 卡林巴配置类型
3. **src/stores/settingsStore.ts** ⭐ - 设置状态管理（支持动态配置）

### 音频处理
4. **src/services/audio/PitchDetector.ts** ⭐ - 音频分析核心
5. **src/services/audio/NoteMapper.ts** ⭐ - 音符映射（支持动态配置）
6. **src/services/audio/AudioSynthesizer.ts** ⭐ - 卡林巴音频合成

### 生成和渲染
7. **src/services/generation/DifficultyGenerator.ts** ⭐ - 难度生成核心
8. **src/components/ScoreViewer/SheetDisplay/MeasureRenderer.tsx** - 渲染核心

### 设置界面
9. **src/components/SettingsPanel/KalimbaPresets.tsx** ⭐ - 卡林巴配置界面
10. **src/components/DifficultySelector/index.tsx** ⭐ - 难度选择界面

### 存储和导出
11. **src/services/storage/DatabaseService.ts** - 本地存储核心
12. **src/services/export/AudioExporter.ts** ⭐ - 音频导出
