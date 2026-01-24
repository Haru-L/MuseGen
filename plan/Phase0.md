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
- 不要求一次性把现有上传解析流程完全重构为“全新架构”；Phase 0 更强调“统一协议与控制面”，允许渐进迁移。

## 2. 当前实现状态概览（仓库快照）

### 2.1 已存在的相关能力（可复用资产）

- “上传/解析”局部状态与取消：
  - `useUploadStore` 已有状态枚举 `idle/dragging/validating/parsing/ready/error`，并提供 `cancelParsing()`（`FileReader.abort()` + `AudioContext.close()`），见 [uploadStore.ts](file:///d:/Projects/MuseGen/src/stores/uploadStore.ts)。
  - 上传解析进度条与“取消解析”按钮已接入首页，见 [HomePage.tsx](file:///d:/Projects/MuseGen/src/pages/HomePage.tsx)。
- 输入校验（与 `plan.md` 约束一致）：
  - 最大 50MB、最大 10 分钟、类型限制（MP3/WAV）已在上传处理逻辑中实现，见 [audio.ts](file:///d:/Projects/MuseGen/src/utils/audio.ts)。
- IndexedDB 基础设施已存在（对 Phase 0 非必须，但可作为错误/取消策略的一部分参考）：
  - 轻量 KV 封装与 Zustand 存储适配已完成，见 [indexedDbKV.ts](file:///d:/Projects/MuseGen/src/utils/indexedDbKV.ts) 与 [zustandIdbStorage.ts](file:///d:/Projects/MuseGen/src/utils/zustandIdbStorage.ts)。

### 2.2 明显缺口/风险点

- 尚未出现 Phase 0 计划中的“统一任务状态机/统一进度事件协议/统一错误模型/统一取消链路/ProcessingIndicator 组件”。
- 尚未引入 Worker 处理框架与 Worker 侧的取消协议（后续 Phase 3 会强依赖）。
- 发现 1 处文案不一致：上传区提示仍写“大小不超过 20MB”，但实际校验为 50MB，见 [AudioDropzone.tsx](file:///d:/Projects/MuseGen/src/components/Upload/AudioDropzone.tsx) 与 [audio.ts](file:///d:/Projects/MuseGen/src/utils/audio.ts)。
- `score.types.ts` 已包含“处理状态/阶段进度”的类型草案，但当前未被使用，且与 Phase 0 目标的“任务状态机/进度事件协议”仍存在概念边界需要收敛（见 4.6）。

## 3. Phase 0 计划项对照（计划 vs 当前实现）

| Phase 0 计划项 | 目标描述（来自 plan.md） | 当前状态 | 说明/证据 |
|---|---|---|---|
| 1) 统一任务状态机 | idle/queued/running/succeeded/failed/canceled | ❌ 未实现 | 尚无 `TaskController` 或等价模块 |
| 2) 统一进度事件协议 | 阶段、百分比、耗时估计 | ❌ 未实现 | 仅有上传解析的局部 `progress`（0~100） |
| 3) 支持取消/中断 | UI → Worker 停止 → 资源释放 | ⚠️ 部分实现 | 上传解析支持取消；Worker 与全链路取消未实现 |
| 4) 统一错误模型与呈现 | 可恢复/不可恢复、统一文案 | ❌ 未实现 | 当前多为字符串错误；未形成错误码与分级 |
| 5) 进度指示器 UI | ProcessingIndicator 复用组件 | ❌ 未实现 | 当前进度 UI 只覆盖上传解析，且与 store 强耦合 |

## 4. Phase 0 详细实现方案（从当前仓库继续推进）

### 4.1 统一任务状态机：TaskController

目标：把“长任务的生命周期管理”从具体业务逻辑里剥离出来，形成可复用的控制面，后续音频分析/生成/导出等都复用同一套能力。

#### 4.1.1 状态与流转

- 状态枚举（严格对应 plan.md）：`idle | queued | running | succeeded | failed | canceled`
- 推荐流转：
  - `idle → queued → running → succeeded`
  - `idle → queued → canceled`
  - `running → failed`
  - `running → canceled`
- 约束：
  - 默认只允许“同一时刻 1 个主处理任务”运行（音频分析/生成是主任务）；上传解析可视为子任务或独立任务，但也走同一套协议以统一 UI。

#### 4.1.2 控制与订阅接口（建议）

- 创建/排队：`enqueue(taskSpec)` 返回 `taskId`
- 启动：`run(taskId)` 或 `runLatest()`（根据产品交互选择）
- 取消：`cancel(taskId)`（幂等）
- 订阅：`subscribe(listener)`，监听状态变更/进度事件/错误
- 取消机制：
  - 主线程用 `AbortController` 作为统一取消信号源
  - Worker 任务通过消息协议接收 `cancel` 并尽快退出

#### 4.1.3 目录与文件（与 plan.md 对齐）

- `src/services/processing/TaskController.ts`
- `src/services/processing/ProgressEvents.ts`（见 4.2）
- `src/services/processing/ErrorModel.ts`（见 4.4）

### 4.2 统一进度事件协议：ProgressEvents

目标：让所有长任务以统一结构上报进度，避免 UI 与业务逻辑紧耦合、避免每个 Phase 都重新定义“进度如何算”。

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

目标：把“取消”的语义与实现统一，避免出现“UI 显示取消了，但 Worker 还在跑/内存没有释放”的不一致。

#### 4.3.1 主线程侧（Controller）

- 调用 `abortController.abort()` 触发取消信号
- 立刻推送进度事件（例如 message=“正在取消…”）并将任务状态设置为 `canceled`（或在文档中明确最终一致性：先提示取消中，最终进入 canceled）
- 清理资源引用（AudioBuffer、TypedArray、对象缓存等）

#### 4.3.2 Worker 侧（协议与检查点）

- 建议消息协议（示意）：
  - 主线程 → Worker：`start` / `cancel`
  - Worker → 主线程：`progress` / `done` / `error` / `canceled`
- Worker 内部必须在“分块处理点”检查取消标记（例如每 N 帧/每块 FFT 后），并尽快退出。

#### 4.3.3 资源释放清单（必须明确写入）

- `AudioContext` / `OfflineAudioContext`：及时 `close()`
- `AudioBuffer`：处理后立即解除引用，避免常驻内存
- Worker：必要时 `terminate()`（作为兜底，避免僵死任务）

### 4.4 统一错误模型与呈现：ErrorModel + UI 策略

目标：错误对用户是稳定可理解的，对开发是可诊断的，同时避免把底层异常直接透传到 UI。

#### 4.4.1 错误字段建议

- `code: string`：稳定错误码
- `userMessage: string`：面向用户的提示文案（短且可行动）
- `recoverable: boolean`：是否可恢复（UI 是否提供“重试/更换文件/恢复默认”）
- `debugMessage?: string`：开发诊断信息（默认不在 UI 显示）
- `cause?: unknown`：保留原始异常用于日志/调试

#### 4.4.2 建议的错误码（Phase 0 先定口径）

- 文件与解析：`UNSUPPORTED_TYPE` / `FILE_TOO_LARGE` / `DURATION_TOO_LONG` / `READ_FAILED` / `DECODE_FAILED`
- 任务与并发：`TASK_CONFLICT` / `TASK_TIMEOUT` / `CANCELED`
- Worker：`WORKER_CRASHED` / `WORKER_PROTOCOL_ERROR`
- 存储：`IDB_FAILED`（后续 Phase 7 会更系统化）

#### 4.4.3 UI 呈现策略

- 可恢复：显示 `userMessage` + 提供“重试/重新选择文件/清除缓存（后续）”
- 不可恢复：显示 `userMessage` + 提示刷新页面或降低输入规模

### 4.5 ProcessingIndicator：统一进度指示器组件

目标：把进度展示组件化，后续 Phase 2~6 不再重复实现“进度条 + 取消 + 错误提示”的 UI。

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

- `src/components/ProcessingIndicator/`（入口组件 + 子组件拆分）

### 4.6 与现有类型的边界收敛（score.types.ts 的处理状态草案）

当前 [score.types.ts](file:///d:/Projects/MuseGen/src/types/score.types.ts) 已定义 `ProcessingState/StageProgress` 等类型，但 Phase 0 目标更偏“任务控制与事件协议”。建议在 Phase 0 文档中明确边界：

- TaskController/ProgressEvents：解决“任何长任务”的控制与上报（跨域复用）。
- ProcessingState（如保留）：更偏“音频分析流水线的业务状态”（属于 Phase 2~4 的业务域）。
- 迁移策略：Phase 0 先落 TaskController 与 ProgressEvents，后续 Phase 再决定是否让 ProcessingState 成为“任务事件的投影视图”。避免 Phase 0 就过早绑定到音频域细节。

## 5. 当前进展与未完成内容（按优先级）

### 5.1 已完成（可复用资产）

- 上传解析的进度与取消（局部）：[uploadStore.ts](file:///d:/Projects/MuseGen/src/stores/uploadStore.ts)、[HomePage.tsx](file:///d:/Projects/MuseGen/src/pages/HomePage.tsx)、[audio.ts](file:///d:/Projects/MuseGen/src/utils/audio.ts)。
- 输入限制与提示口径（逻辑层）：50MB、10 分钟、MP3/WAV。
- IndexedDB KV 与 Zustand 适配（可供后续错误/清理策略参考）：[indexedDbKV.ts](file:///d:/Projects/MuseGen/src/utils/indexedDbKV.ts)、[zustandIdbStorage.ts](file:///d:/Projects/MuseGen/src/utils/zustandIdbStorage.ts)。

### 5.2 未完成（Phase 0 核心）

- 统一任务状态机（TaskController）
- 统一进度事件协议（ProgressEvents）
- 统一取消链路（含 Worker 协议与释放清单）
- 统一错误模型与错误呈现（ErrorModel + UI 策略）
- ProcessingIndicator 组件（用于替换当前上传解析专用 UI）

### 5.3 差异/风险（建议 Phase 0 文档中登记）

- 上传文案仍写 20MB（与实际校验 50MB 不一致），见 [AudioDropzone.tsx](file:///d:/Projects/MuseGen/src/components/Upload/AudioDropzone.tsx)。
- `settingsStore.ts` 注释描述与真实存储实现存在偏差（注释仍提 LocalStorage，但当前使用 IndexedDB 存储适配），见 [settingsStore.ts](file:///d:/Projects/MuseGen/src/stores/settingsStore.ts)。

## 6. 里程碑拆分（建议 1~2 天可验收的粒度）

- M0.1：定义任务状态机与 TaskController API（含状态流转约束）
- M0.2：定义 ProgressEvents 协议 + ProcessingIndicator 组件的最小 UI
- M0.3：把“上传解析”作为示例接入统一进度协议（不要求完全重构 store）
- M0.4：制定 Worker 消息协议与取消检查点规范（为 Phase 3 铺路）

