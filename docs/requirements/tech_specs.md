# MuseGen - 技术规格文档

## 1. 技术栈
- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **状态管理**: Zustand + Immer
- **音频处理**: Web Audio API + Essentia.js/Meyda (用于特征提取)
- **本地存储**: IndexedDB (存储大文件与中间结果)
- **UI系统**: Tailwind CSS + Framer Motion + Lucide React (Mint/Lovable 风格)
- **核心算法**: 运行于 Web Workers 中的音频分析与乐谱生成算法
- **测试验证**: Vitest + React Testing Library

## 2. 核心架构

### 2.1 设计理念
- **本地优先 (Local-First)**: 所有音频处理和生成逻辑在客户端完成，保护用户隐私。
- **计算隔离**: 耗时的音频分析和算法生成在 Web Worker 中运行，避免阻塞主线程 UI。
- **模块化**: 视图层、业务逻辑层与核心算法层分离，便于维护和测试。

### 2.2 数据流架构
```mermaid
graph TD
    User[用户配置/输入] --> Upload[音频上传模块]
    Upload --> Decode[Web Audio 解码]
    Decode --> Analysis[音频分析 Worker]
    Analysis --> Features[音高/节奏特征]
    Features --> Generation[生成算法 Worker]
    Generation --> Score[多难度乐谱数据]
    Score --> Store[状态管理 & IndexedDB]
    Store --> Render[乐谱渲染引擎]
    Store --> Export[导出模块 (MIDI/PNG/Audio)]
```

### 2.3 关键算法模块

#### 1. 音频分析模块 (Audio Analysis)
- **职责**: 提取音频的主旋律音高和节奏特征。
- **核心逻辑**:
  - 使用滑动窗口进行频域/时域分析 (FFT/YIN/ACF)。
  - 提取时间戳、频率和置信度。
  - 运行环境: 独立 Worker 线程。

#### 2. 音符映射模块 (Note Mapping)
- **职责**: 将检测到的频率映射到具体的卡林巴琴键。
- **核心逻辑**:
  - 频率转 MIDI 音符公式转换。
  - 根据目标卡林巴配置（键数、调式）进行量化映射。
  - 过滤超出音域的无效音符。

#### 3. 难度生成引擎 (Difficulty Engine)
- **职责**: 基于原始旋律生成不同难度的乐谱变体。
- **策略**:
  - **Advanced (进阶)**: 最大限度保留原始旋律和复杂节奏。
  - **Normal (标准)**: 适度简化节奏，限制和弦密度，保证流畅性。
  - **Beginner (入门)**: 仅保留骨干音，大幅简化节奏，确保新手可弹奏。
- **算法**: 基于音符重要性评分（力度、节拍位置、时值）进行动态筛选。

## 3. 系统模块划分

系统采用分层架构设计，避免对具体文件目录的强依赖。

### 3.1 表现层 (Presentation Layer)
- **布局容器 (Layouts)**: 处理全局布局、背景风格 (Mint/Lovable) 和响应式适配。
- **配置面板 (Configuration)**: 提供卡林巴参数设置（键数、调音）和预设管理。
- **上传组件 (Upload)**: 处理文件拖拽、格式校验和上传进度反馈。
- **乐谱查看器 (Score Viewer)**: 核心交互区域，负责乐谱的 Canvas/SVG 渲染、播放控制和可视化跟随。
- **进度指示 (Feedback)**: 展示后台任务的处理状态和进度。

### 3.2 业务逻辑层 (Application Layer)
- **任务控制器 (Task Controller)**: 管理复杂的异步流程，协调 UI 与 Worker 之间的通信。
- **状态管理 (State Store)**: 维护全局应用状态（配置、当前乐谱、播放状态等）。
- **存储服务 (Storage Service)**: 封装 IndexedDB 操作，管理持久化数据。

### 3.3 核心领域层 (Domain Layer)
- **音乐理论库 (Music Theory)**: 提供音高、频率、音程等基础计算工具。
- **音频处理 Worker**: 封装具体的音频解码和特征提取算法。
- **生成算法 Worker**: 封装乐谱生成的业务规则和难度降级逻辑。

## 4. 核心数据契约

系统各模块间通过稳定的接口契约通信，而非依赖具体实现类。

```typescript
// 1. 卡林巴乐器配置
interface KalimbaConfig {
  id: string;
  name: string;
  keyCount: number; // 键数 (17/21等)
  tuning: TineConfig[]; // 具体琴键定义
}

// 2. 乐谱数据结构 (核心实体)
interface KalimbaScore {
  metadata: {
    title: string;
    duration: number;
    tempo: number;
    sourceAudioId?: string;
  };
  variants: Record<DifficultyLevel, ScoreVariant>; // 多难度变体
}

// 3. 乐谱变体详情
interface ScoreVariant {
  level: 'beginner' | 'normal' | 'advanced';
  notes: NoteEvent[]; // 线性音符序列
  statistics: {
    noteCount: number;
    difficultyScore: number;
  };
}

// 4. 音符事件
interface NoteEvent {
  time: number;      // 绝对时间 (秒)
  duration: number;  // 持续时间
  pitch: {
    midi: number;
    frequency: number;
    tineIndex: number; // 对应琴键索引
  };
  velocity: number;  // 力度
}
```

## 5. 关键技术挑战与策略

### 1. 准确性 vs 实时性
- **策略**: 采用两阶段处理。上传时进行高精度的离线分析（非实时），播放时仅进行即时渲染。

### 2. 大文件内存管理
- **策略**: 避免将完整解码后的 AudioBuffer 长期驻留内存。分析完成后立即释放，仅保留提取后的特征数据。使用 IndexedDB 存储原始音频 Blob。

### 3. 复杂节奏量化
- **策略**: 实现自适应量化算法，检测音乐的 Swing 特征，避免机械化的“对齐网格”，保留演奏的人性化偏移。

## 6. 部署与交付
- **构建目标**: 纯静态单页应用 (SPA)。
- **运行环境**: 现代浏览器 (Chrome/Edge/Safari/Firefox)，需支持 Web Audio API 和 Web Workers。
- **分发方式**: 静态资源服务器 / CDN。
