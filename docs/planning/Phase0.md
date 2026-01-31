# Phase 0: 基础设施开发规划

## 1. 当前阶段目标
本阶段旨在构建应用的核心基础设施，为后续的音频处理、乐谱生成和导出功能提供统一的控制平面。核心业务价值在于解耦 UI 交互与后台长任务处理，确保系统具备稳定的任务管理、进度反馈、错误处理和资源释放能力。

**核心目标：**
- **统一任务控制**：建立标准化的任务状态机，统一管理所有异步长任务（上传、分析、生成）。
- **标准化协议**：定义统一的进度上报和 Worker 通信协议，消除模块间的耦合。
- **健壮性保障**：建立分级错误处理模型和可靠的取消/中断机制，防止资源泄漏。
- **UI 组件化**：沉淀通用的进度指示和状态反馈组件，提升开发效率。

## 2. 设计方案

### 2.1 系统架构
采用 **控制器模式 (Controller Pattern)** 作为核心架构。`TaskController` 作为单例服务运行在主线程，负责协调 UI 组件与后台任务（Workers）之间的状态同步。

```mermaid
graph TD
    UI[UI 组件] <--> Controller[TaskController]
    Controller <--> State[状态存储 (Zustand)]
    Controller -- 消息协议 --> Worker[Web Worker]
    Worker -- 进度/结果 --> Controller
```

### 2.2 模块划分
- **任务管理模块**: 负责任务的创建、排队、状态流转（Idle -> Queued -> Running -> Completed/Failed）和生命周期管理。
- **通信协议模块**: 定义主线程与 Worker 间的标准消息格式（Start, Cancel, Progress, Error）。
- **错误处理模块**: 提供统一的错误码定义、错误归一化处理和用户友好消息映射。
- **UI 组件库**: 提供 `ProcessingIndicator` 等复用组件，实现对协议的自动渲染。

### 2.3 核心接口定义 (抽象)
- **TaskSpec**: 定义任务的可执行逻辑、名称和参数规范。
- **ProgressEvent**: 标准化进度事件，包含 `phase` (阶段), `percent` (总进度), `message` (用户提示), `eta` (预估时间)。
- **TaskError**: 标准化错误对象，包含 `code` (错误码), `recoverable` (是否可恢复), `userMessage` (展示文案)。

### 2.4 数据模型
- **任务状态机**: 严格约束状态流转，确保任务在任意时刻处于确定状态 (`idle`, `queued`, `running`, `succeeded`, `failed`, `canceled`)。

## 3. 开发进度与状态

| 规划项 | 状态 | 进度 | 更新日期 | 负责人 | 备注 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. 统一任务状态机** | <span style="color:green">已完成</span> | 100% | 2026-02-01 | Tech Lead | 实现 TaskController，支持完整状态流转与订阅机制 |
| **2. 统一进度事件协议** | <span style="color:green">已完成</span> | 100% | 2026-02-01 | Tech Lead | 定义 ProgressEvent 类型，覆盖阶段与百分比 |
| **3. 统一错误模型** | <span style="color:green">已完成</span> | 100% | 2026-02-01 | Tech Lead | 定义 TaskError 与 ERROR_CODES，实现错误归一化 |
| **4. Worker 通信协议定义** | <span style="color:green">已完成</span> | 100% | 2026-02-01 | Tech Lead | 完成 WorkerProtocol 消息类型定义 |
| **5. 进度指示器 UI 组件** | <span style="color:green">已完成</span> | 100% | 2026-02-01 | Frontend | 实现 ProcessingIndicator，支持取消与重试交互 |
| **6. 上传流程接入示例** | <span style="color:green">已完成</span> | 100% | 2026-02-01 | Frontend | `UploadTask` 已实现并接入 `TaskController`，Store 与组件已重构 |

## 4. 交付物清单
- **核心代码**:
  - `TaskController` 服务类 (任务调度核心)
  - `TaskTypes` 类型定义 (协议规范)
  - `ErrorModel` 错误处理工具
  - `WorkerProtocol` 通信协议定义
  - `UploadTask` 示例任务规范
- **UI 组件**:
  - `ProcessingIndicator` 组件及测试用例
- **文档**:
  - 架构设计文档 (集成在技术规格书中)
  - 接口使用示例 (单元测试作为示例)

## 5. 验证标准
- **单元测试覆盖率**: 核心服务 (`TaskController`, `ErrorModel`) 单元测试覆盖率 > 90%。
- **状态流转测试**: 验证所有合法状态流转路径，确保非法流转被拦截。
- **取消机制验证**: 模拟长任务执行中触发取消，验证 `AbortSignal` 正确传递且状态最终变更为 `canceled`。
- **UI 交互验证**: 进度条能平滑跟随事件更新，错误态下正确展示重试/取消按钮。

## 6. 风险项清单

| 风险描述 | 严重程度 | 应对策略 | 状态 |
| :--- | :--- | :--- | :--- |
| **Worker 资源释放不彻底** | 高 | 需在 Phase 3 具体实现 Worker 时，严格遵循 `WorkerProtocol` 的取消信号检查，防止内存泄漏。 | 监控中 |
| **进度预估 (ETA) 准确性** | 低 | 初期仅作为保留字段，不强制实现精准算法，避免过度设计。 | 已接受 |
