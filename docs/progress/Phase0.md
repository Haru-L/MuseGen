# Phase 0：基础设施（任务/进度/取消/错误）（实现方案 + 当前进展对比）

本文档聚焦 `plan/plan.md` 中 **Phase 0: 基础设施（任务/进度/取消/错误）** 的落地方案，并基于当前仓库实现给出进展与差距清单。**不包含任何编码实现**。

## 1. Phase 0 目标与范围

### 1.1 目标（Phase 0 交付物）

- 统一任务状态机：提供可复用的任务控制器（idle/queued/running/succeeded/failed/canceled）。
- 统一进度事件协议：所有长任务以统一结构上报阶段与百分比，UI 只依赖协议渲染。
- 支持取消/中断：UI 触发 → 主线程控制器终止 → Worker 尽快停止 → 资源释放。
- 统一错误模型与错误呈现：区分可恢复/不可恢复，提供稳定的错误码与用户文案口径。
- 进度指示器 UI：提供可复用的 ProcessingIndicator 组件，后续 Phase 2~6 复用。

### 1.2 非目标（Phase 0 不做）

- 不实现音高检测/节奏分析/三难度生成等业务算法（Phase 3/4 负责）。
- 不实现 IndexedDB 的乐谱库 CRUD 与音频/中间结果缓存（Phase 7 负责）。
- 不要求一次性把现有上传解析流程完全重构为"全新架构"；Phase 0 更强调"统一协议与控制面"，允许渐进迁移。

## 2. 当前实现状态概览（仓库快照）

### 2.1 已存在的相关能力（可复用资产）

- **统一任务状态机**：`TaskController` 已实现，支持完整状态流转（idle/queued/running/succeeded/failed/canceled），见 [TaskController.ts](file:///d:/Projects/MuseGen/src/services/processing/TaskController.ts)。
- **统一进度事件协议**：`ProgressEvent` 类型与 `reportProgress` 回调已定义，见 [TaskTypes.ts](file:///d:/Projects/MuseGen/src/services/processing/TaskTypes.ts)。
- **Worker 消息协议**：完整的 Worker 消息类型定义（start/cancel/progress/done/error/canceled），见 [WorkerProtocol.ts](file:///d:/Projects/MuseGen/src/services/processing/WorkerProtocol.ts)。
- **统一错误模型**：`TaskError` 类型与 `ERROR_CODES` 常量已定义，包含 `toTaskError` 转换函数，见 [ErrorModel.ts](file:///d:/Projects/MuseGen/src/services/processing/ErrorModel.ts)。
- **ProcessingIndicator 组件**：可复用的进度指示器 UI 组件，支持进度显示、取消按钮、错误展示与重试，见 [ProcessingIndicator.tsx](file:///d:/Projects/MuseGen/src/components/ProcessingIndicator/ProcessingIndicator.tsx)。
- **上传解析的进度与取消（局部）**：`useUploadStore` 已有状态枚举 `idle/dragging/validating/parsing/ready/error`，并提供 `cancelParsing()`（`FileReader.abort()` + `AudioContext.close()`），见 [uploadStore.ts](file:///d:/Projects/MuseGen/src/stores/uploadStore.ts)。
- **输入校验（与 `plan.md` 约束一致）**：最大 50MB、最大 10 分钟、类型限制（MP3/WAV）已在上传处理逻辑中实现，见 [audio.ts](file:///d:/Projects/MuseGen/src/utils/audio.ts)。
- **IndexedDB 基础设施**：轻量 KV 封装与 Zustand 存储适配已完成，见 [indexedDbKV.ts](file:///d:/Projects/MuseGen/src/utils/indexedDbKV.ts) 与 [zustandIdbStorage.ts](file:///d:/Projects/MuseGen/src/utils/zustandIdbStorage.ts)。

### 2.2 明显缺口/风险点

- 上传解析流程尚未完全迁移至统一 TaskController 架构（当前仍使用独立的 `useUploadStore` 状态管理）。
- Worker 侧的实际任务执行器尚未实现（仅定义了消息协议）。
- `score.types.ts` 已包含"处理状态/阶段进度"的类型草案，但当前未被使用，且与 Phase 0 目标的"任务状态机/进度事件协议"仍存在概念边界需要收敛（见 4.6）。

## 3. Phase 0 计划项对照（计划 vs 当前实现）

| Phase 0 计划项 | 目标描述（来自 plan.md） | 当前状态 | 说明/证据 |
|---|---|---|---|
| 1) 统一任务状态机 | idle/queued/running/succeeded/failed/canceled | ✅ 已实现 | [TaskController.ts](file:///d:/Projects/MuseGen/src/services/processing/TaskController.ts) 完整实现 |
| 2) 统一进度事件协议 | 阶段、百分比、耗时估计 | ✅ 已实现 | [TaskTypes.ts](file:///d:/Projects/MuseGen/src/services/processing/TaskTypes.ts) 定义 ProgressEvent |
| 3) 支持取消/中断 | UI → Worker 停止 → 资源释放 | ✅ 已实现 | TaskController.cancel() + WorkerProtocol 的 cancel 消息类型 |
| 4) 统一错误模型与呈现 | 可恢复/不可恢复、统一文案 | ✅ 已实现 | [ErrorModel.ts](file:///d:/Projects/MuseGen/src/services/processing/ErrorModel.ts) 完整定义 |
| 5) 进度指示器 UI | ProcessingIndicator 复用组件 | ✅ 已实现 | [ProcessingIndicator.tsx](file:///d:/Projects/MuseGen/src/components/ProcessingIndicator/ProcessingIndicator.tsx) |

## 4. Phase 0 详细实现方案（从当前仓库继续推进）

### 4.1 统一任务状态机：TaskController

目标：把"长任务的生命周期管理"从具体业务逻辑里剥离出来，形成可复用的控制面，后续音频分析/生成/导出等都复用同一套能力。

#### 4.1.1 状态与流转

- 状态枚举（严格对应 plan.md）：`idle | queued | running | succeeded | failed |canceled`
- 推荐流转：
  - `idle → queued → running → succeeded`
  - `idle → queued → canceled`
  - `running → failed`
  - `running → canceled`
- 约束：
  - 默认只允许"同一时刻 1 个主处理任务"运行（音频分析/生成是主任务）；上传解析可视为子任务或独立任务，但也走同一套协议以统一 UI。

#### 4.1.2 控制与订阅接口（建议）

- 创建/排队：`enqueue(taskSpec)` 返回 `taskId`
- 启动：`run(taskId)` 或 `runLatest()`（根据产品交互选择）
- 取消：`cancel(taskId)`（幂等）
- 订阅：`subscribe(listener)`，监听状态变更/进度事件/错误
- 取消机制：
  - 主线程用 `AbortController` 作为统一取消信号源
  - Worker 任务通过消息协议接收 `cancel` 并尽快退出

#### 4.1.3 目录与文件（与 plan.md 对齐）

- `src/services/processing/TaskController.ts` ✅ 已实现
- `src/services/processing/TaskTypes.ts` ✅ 已实现
- `src/services/processing/WorkerProtocol.ts` ✅ 已实现
- `src/services/processing/ErrorModel.ts` ✅ 已实现

### 4.2 统一进度事件协议：ProgressEvents

目标：让所有长任务以统一结构上报进度，避免 UI 与业务逻辑紧耦合、避免每个 Phase 都重新定义"进度如何算"。

#### 4.2.1 建议的进度事件字段

- `taskId: string`
- `phase: string`：阶段标识（建议从业务流程命名，如 `upload | decode | pitch | map | rhythm | generate | export`）
- `percent: number`：总体进度（0~100）
- `stagePercent?: number`：阶段内进度（0~100，可选）
- `message: string`：面向用户的短文案
- `etaMs?: number`：预估剩余耗时（可选，Phase 0 先定义字段，不要求全部阶段都提供）
- `updatedAt: number`：时间戳（用于 UI 去抖/排序）

#### 4.2.2 进度口径建议

- 总体进度：由 TaskController 管理（可按阶段权重折算），UI 不直接推断。
- 阶段进度：由每个阶段实现者上报，TaskController 只做整合。

### 4.3 取消/中断链路：UI → Controller → Worker → 资源释放

目标：把"取消"的语义与实现统一，避免出现"UI 显示取消了，但 Worker 还在跑/内存没有释放"的不一致。

#### 4.3.1 主线程侧（Controller）

- 调用 `abortController.abort()` 触发取消信号
- 立刻推送进度事件（例如 message="正在取消…"）并将任务状态设置为 `canceled`（或在文档中明确最终一致性：先提示取消中，最终进入 canceled）
- 清理资源引用（AudioBuffer、TypedArray、对象缓存等）

#### 4.3.2 Worker 侧（协议与检查点）

- 建议消息协议（示意）：
  - 主线程 → Worker：`start` / `cancel`
  - Worker → 主线程：`progress` / `done` / `error` / `canceled`
- Worker 内部必须在"分块处理点"检查取消标记（例如每 N 帧/每块 FFT 后），并尽快退出。

#### 4.3.3 资源释放清单（必须明确写入）

- `AudioContext` / `OfflineAudioContext`：及时 `close()`
- `AudioBuffer`：处理后立即解除引用，避免常驻内存
- Worker：必要时 `terminate()`（作为兜底，避免僵死任务）

### 4.4 统一错误模型与呈现：ErrorModel + UI 策略

目标：错误对用户是稳定可理解的，对开发是可诊断的，同时避免把底层异常直接透传到 UI。

#### 4.4.1 错误字段建议

- `code: string`：稳定错误码
- `userMessage: string`：面向用户的提示文案（短且可行动）
- `recoverable: boolean`：是否可恢复（UI 是否提供"重试/更换文件/恢复默认"）
- `debugMessage?: string`：开发诊断信息（默认不在 UI 显示）
- `cause?: unknown`：保留原始异常用于日志/调试

#### 4.4.2 建议的错误码（Phase 0 先定口径）

- 文件与解析：`UNSUPPORTED_TYPE` / `FILE_TOO_LARGE` / `DURATION_TOO_LONG` / `READ_FAILED` / `DECODE_FAILED`
- 任务与并发：`TASK_CONFLICT` / `TASK_TIMEOUT` / `CANCELED`
- Worker：`WORKER_CRASHED` / `WORKER_PROTOCOL_ERROR`
- 存储：`IDB_FAILED`（后续 Phase 7 会更系统化）

#### 4.4.3 UI 呈现策略

- 可恢复：显示 `userMessage` + 提供"重试/重新选择文件/清除缓存（后续）"
- 不可恢复：显示 `userMessage` + 提示刷新页面或降低输入规模

### 4.5 ProcessingIndicator：统一进度指示器组件

目标：把进度展示组件化，后续 Phase 2~6 不再重复实现"进度条 + 取消 + 错误提示"的 UI。

#### 4.5.1 最小功能

- 显示：
  - 当前阶段文案 `message`
  - 总体进度条 `percent`
  - 可选：阶段名、阶段内进度 `stagePercent`
- 操作：
  - 取消按钮（触发 TaskController.cancel）
- 错误态：
  - 展示错误摘要与可恢复操作（重试/清理）

#### 4.5.2 文件建议（与 plan.md 对齐）

- `src/components/ProcessingIndicator/` ✅ 已实现
  - `ProcessingIndicator.tsx`
  - `index.ts`

### 4.6 与现有类型的边界收敛（score.types.ts 的处理状态草案）

当前 [score.types.ts](file:///d:/Projects/MuseGen/src/types/score.types.ts) 已定义 `ProcessingState/StageProgress` 等类型，但 Phase 0 目标更偏"任务控制与事件协议"。建议在 Phase 0 文档中明确边界：

- TaskController/ProgressEvents：解决"任何长任务"的控制与上报（跨域复用）。
- ProcessingState（如保留）：更偏"音频分析流水线的业务状态"（属于 Phase 2~4 的业务域）。
- 迁移策略：Phase 0 先落 TaskController 与 ProgressEvents，后续 Phase 再决定是否让 ProcessingState 成为"任务事件的投影视图"。避免 Phase 0 就过早绑定到音频域细节。

## 5. 当前进展与未完成内容（按优先级）

### 5.1 已完成（核心基础设施）

- **统一任务状态机（TaskController）**：完整实现，支持 idle/queued/running/succeeded/failed/canceled 状态流转，见 [TaskController.ts](file:///d:/Projects/MuseGen/src/services/processing/TaskController.ts)。
- **统一进度事件协议（ProgressEvents）**：`ProgressEvent` 类型定义完整，包含 phase/percent/stagePercent/message/etaMs 等字段，见 [TaskTypes.ts](file:///d:/Projects/MuseGen/src/services/processing/TaskTypes.ts)。
- **Worker 消息协议**：完整的 Worker 双向消息类型定义（start/cancel/progress/done/error/canceled），见 [WorkerProtocol.ts](file:///d:/Projects/MuseGen/src/services/processing/WorkerProtocol.ts)。
- **统一错误模型（ErrorModel）**：`TaskError` 类型与 `ERROR_CODES` 常量完整定义，包含 `toTaskError` 转换函数，见 [ErrorModel.ts](file:///d:/Projects/MuseGen/src/services/processing/ErrorModel.ts)。
- **ProcessingIndicator 组件**：可复用的进度指示器 UI 组件，支持进度条、阶段文案、取消按钮、错误展示与重试，见 [ProcessingIndicator.tsx](file:///d:/Projects/MuseGen/src/components/ProcessingIndicator/ProcessingIndicator.tsx)。

### 5.2 已完成（可复用资产）

- 上传解析的进度与取消（局部）：`useUploadStore` 已有状态枚举 `idle/dragging/validating/parsing/ready/error`，并提供 `cancelParsing()`（`FileReader.abort()` + `AudioContext.close()`），见 [uploadStore.ts](file:///d:/Projects/MuseGen/src/stores/uploadStore.ts)。
- 输入校验（与 `plan.md` 约束一致）：最大 50MB、最大 10 分钟、类型限制（MP3/WAV）已在上传处理逻辑中实现，见 [audio.ts](file:///d:/Projects/MuseGen/src/utils/audio.ts)。
- 上传区文案已修正：AudioDropzone 提示文案已统一为 "大小不超过 50MB"，与实际校验一致，见 [AudioDropzone.tsx](file:///d:/Projects/MuseGen/src/components/Upload/AudioDropzone.tsx)。
- IndexedDB 基础设施已存在（对 Phase 0 非必须，但可作为错误/取消策略的一部分参考）：轻量 KV 封装与 Zustand 存储适配已完成，见 [indexedDbKV.ts](file:///d:/Projects/MuseGen/src/utils/indexedDbKV.ts) 与 [zustandIdbStorage.ts](file:///d:/Projects/MuseGen/src/utils/zustandIdbStorage.ts)。

### 5.3 未完成（Phase 0 后续工作）

- 上传解析流程完全迁移至 TaskController 架构（当前仍使用独立的 `useUploadStore`，建议作为 M0.3 示例接入）。
- Worker 侧的实际任务执行器实现（当前仅定义了消息协议，具体 Worker 实现为 Phase 3 铺路）。
- `score.types.ts` 中 `ProcessingState` 与 TaskController 的边界收敛（建议在后续 Phase 中决定是否让 ProcessingState 成为"任务事件的投影视图"）。

### 5.4 差异/风险（已解决）

- ~~上传文案仍写 20MB（与实际校验 50MB 不一致）~~ ✅ **已修复**：AudioDropzone 文案已统一为 50MB，见 [AudioDropzone.tsx](file:///d:/Projects/MuseGen/src/components/Upload/AudioDropzone.tsx) 第46行。

## 6. 里程碑拆分（建议 1~2 天可验收的粒度）

- ✅ **M0.1**：定义任务状态机与 TaskController API（含状态流转约束）—— **已完成**
- ✅ **M0.2**：定义 ProgressEvents 协议 + ProcessingIndicator 组件的最小 UI —— **已完成**
- **M0.3**：把"上传解析"作为示例接入统一进度协议（不要求完全重构 store，可作为 TaskController 的使用示例）
- ✅ **M0.4**：制定 Worker 消息协议与取消检查点规范（为 Phase 3 铺路）—— **已完成**

---

**文档更新日期**：2026-01-31
**状态**：Phase 0 核心基础设施已完成，M0.3（上传解析迁移示例）为可选优化项
