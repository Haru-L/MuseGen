# Phase 1：项目初始化与设置功能（实现方案 + 当前进展对比）

本文档聚焦 `plan/plan.md` 中 **Phase 1: 项目初始化和设置功能** 的落地方案，并基于当前仓库实现给出进展与差距清单。**不包含任何编码实现**。

## 1. Phase 1 目标与范围

### 1.1 目标（Phase 1 交付物）

- 项目可以在本地正常运行：`npm run dev` 可启动并可访问主要页面。
- 完成基础路由与页面骨架：至少包含 `/`（上传/首页）与 `/settings`（设置）。
- 完成“卡林巴配置”能力：
  - 预设：17 键 / 21 键可切换。
  - 自定义：可创建自定义键数与调音（每个琴键的音符设置）。
  - 预览：在页面上展示所有键位对应的音符设置，并支持显示模式切换（`1` / `C` / `哆`）。
  - 校验：配置合法性校验与明确的错误提示（键数范围、调音数组一致性、MIDI 范围等）。
- 持久化：配置（当前配置 + 自定义配置列表）可在刷新后恢复。

### 1.2 非目标（Phase 1 不做）

- 不做音频分析主流程（Pitch/Rhythm/生成三难度），这些属于后续 Phase。
- 不做 IndexedDB 的“乐谱库 CRUD”和“音频/中间结果缓存”，只覆盖设置相关数据。
- 不做导出/播放/乐谱渲染等功能。

## 2. 当前实现状态概览（仓库快照）

### 2.1 已存在的基础设施

- Vite + React 18 + TypeScript：已初始化完成（见 `package.json`）。
- Tailwind：已接入并有 Mint/Lovable 风格的基础组件样式（`src/index.css`、`tailwind.config.js`）。
- 路由：已接入 `react-router-dom`，存在 `Layout`、`HomePage`、`SettingsPage`（`src/components/Layout/index.tsx`、`src/pages/HomePage.tsx`、`src/pages/SettingsPage.tsx`）。
- 核心类型：已有 `kalimba.types.ts` 与 `score.types.ts`（见 `src/types/`）。
- 卡林巴预设与自定义模型：已有 17/21 键预设、`createCustomKalimba`、`validateKalimbaConfig`（`src/utils/kalimbaPresets.ts`）。
- 设置状态管理：已有 `useSettingsStore`（Zustand + persist，当前落到 LocalStorage）（`src/stores/settingsStore.ts`）。
- 设置页面核心 UI：预设选择、自定义创建、调音编辑、预览模式切换、配置预览（`src/components/SettingsPanel/*` + `src/pages/SettingsPage.tsx`）。
- 物理键位顺序：已实现 `sortTuningPhysicalLeftToRight` 并用于调音编辑/预览（`src/utils/kalimbaLayout.ts`）。
- 配置预览增强：预览已升级为 SVG 音阶示意图（可缩放），并支持点击琴键试听（Tone.js 动态加载）。
- 交互组织：创建自定义配置 / 调音编辑 已改为折叠面板（可展开/收起）。
- 单元测试框架：Vitest + Testing Library 已接入，覆盖 `settingsStore`、工具函数与预览组件（`src/test/*`）。

### 2.2 当前明显缺口/风险点

- Phase 1 计划要求“统一使用 IndexedDB 存储（设置/预设）”，但当前设置与上传信息均使用 `zustand/persist` 的 LocalStorage。
- 上传限制与计划不一致：当前最大文件 `20MB`（`src/utils/audio.ts`），计划为 `50MB`。

## 3. Phase 1 计划项对照（计划 vs 当前实现）

| Phase 1 计划项 | 目标描述（来自 plan.md） | 当前状态 | 说明/证据 |
|---|---|---|---|
| 1) 初始化项目 | Vite + React + TS | ✅ 已完成 | `package.json`、`vite.config.ts` |
| 2) 配置 Tailwind | Tailwind CSS | ✅ 已完成 | `tailwind.config.js`、`postcss.config.js`、`src/index.css` |
| 3) 基础组件结构与路由 | 基础页面骨架 | ✅ 已完成 | `Layout`/`HomePage`/`SettingsPage` 已就绪并可访问 |
| 4) 定义核心 TS 类型 | `score.types.ts` / `kalimba.types.ts` | ✅ 已完成（可优化） | 类型已存在；与 `plan.md` 中 `KalimbaScoreSet` 结构略有不同（后续 Phase 可统一） |
| 5) 卡林巴设置页面 | 预设/自定义/编辑/持久化/状态管理 | ✅ 已完成（仍有差异） | 预设/自定义/编辑/预览与 LocalStorage 持久化已完成；IndexedDB 仍未按计划落地 |

## 4. Phase 1 详细实现方案（从当前仓库继续推进）

### 4.1 路由与页面骨架（补齐可运行性）

目标：让 `App` 路由闭环可运行，并给“设置”留出稳定承载页面。

- 新增页面：`src/pages/SettingsPage.tsx`
  - 展示卡林巴配置（当前配置摘要 + 编辑入口）。
  - 组合 SettingsPanel 相关组件（4.2 节）。
  - 页面级错误呈现：如“当前配置不合法”的提示与修复引导。
- 校验 `Layout` 与导航：
  - `/settings` 导航已存在（`src/components/Layout/index.tsx`），页面补齐后应可正常访问。

验收：
- `npm run dev` 可启动；`/` 与 `/settings` 都能渲染，无白屏。

### 4.2 “卡林巴设置”UI 模块拆分

目标：实现预设切换、自定义配置创建、调音编辑与“配置预览”，并与 `useSettingsStore` 对接。

建议目录（与现有结构兼容，同时贴近 `plan.md` 命名）：

- `src/components/SettingsPanel/`
  - `PresetSelector.tsx`：选择 17/21 键预设 + 选择已保存自定义配置
  - `CustomKalimbaBuilder.tsx`：创建自定义配置（键数、起始音/或模板）
  - `TuningEditor.tsx`：琴键列表编辑（每键 noteName/midi 选择）
  - `TineRow.tsx`：单个琴键行（编号、音名输入、校验提示）
  - `KalimbaPreview.tsx`：配置结果预览（展示所有键位，支持 `1`/`C`/`哆` 切换）
  - `PreviewModeToggle.tsx`：预览显示模式切换控件

关键交互定义：

1) 预设切换
- 数据源：`KALIMBA_PRESETS` + `customKalimbas`
- 行为：选择后调用 `setCurrentKalimba` 或 `setCurrentByPresetId`
- 反馈：立即更新“当前配置摘要”（键数/音域）

2) 创建自定义配置
- 输入：键数（范围建议沿用当前工具函数 8~30）
- 可选输入：起始音（默认 C4 / MIDI 60）
- 行为：调用 `createCustomKalimba` 生成配置 → `addCustomKalimba` → `setCurrentKalimba`
- 反馈：创建后自动切换到新配置，并聚焦到调音编辑器

3) 调音编辑（核心）
- 展示：按 `tineNumber` 递增渲染 `tuning[]`
- 编辑方式建议：
  - 主输入为 `noteName`（如 `C4`、`D#5`），由 `musicTheory` 转换得到 MIDI/频率
  - 同时显示 `midiNote` 与 `frequency`（只读）
- 校验：
  - `noteName` 必须可解析为合法 MIDI
  - `midiNote` 必须在 0~127
  - `keyCount === tuning.length`
  - `tineNumber` 连续且唯一
- 提交：
  - 允许“编辑即保存”：每次修改触发 `updateCustomKalimba`（对自定义配置）
  - 对预设配置：建议“复制为自定义”后再编辑，避免直接改预设

4) 配置摘要与防错
- 显示当前配置的：`name`、`keyCount`、最低/最高音（可由 tuning 计算）
- `isCurrentValid()` 为 false 时：
  - 显示不可用提示
  - 提供一键恢复默认 `resetToDefault()`

5) 配置预览（新增）

目的：让用户在“编辑配置”时能直观看到最终每个琴键会显示成什么标记，避免只看输入框难以验证。

- 展示内容
  - 固定展示全部琴键（按 `tineNumber` 递增），每个键至少显示：
    - 琴键编号：`tineNumber`（建议始终显示，作为定位锚点）
    - 音高标记：根据预览模式显示 `1` / `C` / `哆`
    - 可选补充：`noteName`（如当前模式不是 `C`，可用较弱样式显示作为辅助）

- 预览模式
  - `C`：显示西方音名（来自 `tuning[].noteName`，例如 `C4`、`D#5`）
  - `1`：显示数字唱名（使用 12 平均律的半音映射，避免“调号/音阶”前置复杂度）
    - 示例映射（按半音）：`C=1, C#=#1, D=2, D#=#2, E=3, F=4, F#=#4, G=5, G#=#5, A=6, A#=#6, B=7`
    - 八度：可选以较小字号显示（如 `·` 或直接显示 `4`），但 Phase 1 可先不做复杂排版
  - `哆`：显示中文唱名（同样按半音映射）
    - 示例映射：`C=哆, C#=哆♯, D=来, D#=来♯, E=咪, F=发, F#=发♯, G=嗦, G#=嗦♯, A=啦, A#=啦♯, B=西`

- 交互
  - `PreviewModeToggle` 三态切换（`1` / `C` / `哆`），默认建议为 `C`（最不易歧义）
  - 切换时只影响预览展示，不影响 `tuning` 数据本身

- 边界与降级策略
  - 若 `noteName` 不可解析/为空：预览该键显示占位符（如 `—`）并在该行标红提示
  - 若未来引入“调号/音阶/移调”：数字唱名可升级为“按调号的级数”，但 Phase 1 暂按半音映射保证确定性

6) 物理键位顺序（新增，适用于调音编辑与预览）

目的：确保页面展示的键位顺序与真实卡林巴琴“从左到右”的物理排列一致，减少用户对照成本。

- 依据（行业通用布局）
  - 17 键 C 调卡林巴的典型布局为：最低音在中间，随后音高按“左右交替”向外扩展（例如中心 C4，左侧 D4，右侧 E4，左侧 F4……）。
- 落地规则（建议）
  - 将 `tuning` 按 `midiNote` 从低到高排序，模拟“从中心向两侧交替展开”的排列，并最终转换为“物理从左到右”的顺序展示。
  - 说明：这是对常见 17 键/21 键卡林巴的通用假设。若后续支持特定品牌/型号的官方布局，可在配置中引入显式的 `physicalOrder`（或类似字段）以覆盖该默认规则。

### 4.3 设置数据持久化：从 LocalStorage 过渡到 IndexedDB（仅设置域）

计划要求“统一使用 IndexedDB 存储（设置、乐谱、音频/中间结果）”。Phase 1 先覆盖设置域，后续 Phase 再扩展其它数据。

#### 4.3.1 目标与约束

- 目标：刷新/重开页面可恢复 `currentKalimba` 与 `customKalimbas`
- 约束：尽量不引入重量级依赖；可使用原生 IndexedDB 或轻量库（如 `idb`）

#### 4.3.2 存储模型

数据库：`musegen`

- ObjectStore: `settings`
  - key: `key`（固定字符串）
  - value: `{ key: 'settings', currentKalimbaId: string, currentKalimbaSnapshot?: KalimbaConfig, customKalimbas: KalimbaConfig[], version: number, updatedAt: number }`

说明：
- 方案：存 `currentKalimbaSnapshot`（快照），避免“当前配置指向一个已被删除的自定义项”产生歧义。

#### 4.3.3 与 `useSettingsStore` 的集成方式

- 将 settings 的持久化抽象为 `SettingsRepository` + `DatabaseService`
  - store actions 内部调用 repository 保存
  - 优点：更清晰的边界与可测性

#### 4.3.4 迁移策略

- 直接清理 LocalStorage 数据

### 4.4 类型与命名一致性（Phase 1 收敛到“设置域最小闭环”）

目前 `score.types.ts` 已包含很多 Phase 2/3 的“处理进度”相关类型。Phase 1 不强制调整，但建议记录两点：

- `DifficultyLevel` vs `plan.md` 的 `Difficulty` 命名差异：后续统一即可。
- `KalimbaScore` vs `KalimbaScoreSet`：如果后续要一次生成三难度，建议引入 `KalimbaScoreSet` 并把当前 `KalimbaScore` 作为 variant 或扁平视图。

### 4.5 测试与验收用例（Phase 1 应补齐的测试）

已有：`settingsStore` / `uploadStore` / `musicTheory` / `previewNotation` / `kalimbaLayout` / `kalimbaPreview` 的基础测试（`src/test/*`）。

建议新增（Phase 1 范围内）：

- 组件测试：
  - `PresetSelector` 切换预设会更新 `currentKalimba`
  - 创建自定义配置后 `customKalimbas` 增加，且 `currentKalimba` 指向新配置
  - 调音编辑时输入非法 `noteName` 会产生可见错误提示且不写入 store
  - 配置预览：切换 `1`/`C`/`哆` 模式会更新预览文本，且不修改 store 中的 `tuning`
- 持久化测试（如果 Phase 1 引入 IndexedDB）：
  - 启动时能从 DB 恢复设置

## 5. 当前进展与未完成内容（按优先级）

### 5.1 已完成（可复用资产）

- 预设与自定义配置模型：`src/utils/kalimbaPresets.ts`
- 设置 store：`src/stores/settingsStore.ts`
- Mint/Lovable 全局样式：`src/index.css`、`tailwind.config.js`
- Layout / Home 基础页面：`src/components/Layout/index.tsx`、`src/pages/HomePage.tsx`
- Settings 页面与核心 UI：`src/pages/SettingsPage.tsx`、`src/components/SettingsPanel/*`
- 配置预览：SVG 音阶示意图 + 预览模式切换（`1`/`C`/`哆`），并支持点击琴键试听
- 物理键位顺序：`src/utils/kalimbaLayout.ts`（用于调音编辑与预览）
- 交互组织：折叠面板用于“创建自定义配置/调音编辑”模块
- 测试：Vitest 用例已覆盖 store / 工具函数 / 预览组件（`src/test/*`）

### 5.2 未完成（阻塞项）

- 无明显阻塞项（路由闭环与设置页已可运行）

### 5.3 未完成（Phase 1 核心功能）

- IndexedDB 持久化（至少覆盖设置域）

### 5.4 与计划不一致点（建议在 Phase 1 内顺手修正或记录）

- 上传文件大小限制：当前 `20MB`，计划 `50MB`（`src/utils/audio.ts`）
- 存储策略：当前大量使用 LocalStorage persist，计划中强调 IndexedDB 统一

## 6. 里程碑拆分（建议 2~3 天可验收的粒度）

- M1：补齐 `SettingsPage`，项目可运行且路由闭环（不含设置编辑 UI）✅
- M2：完成设置 UI（预设切换 + 自定义创建 + 调音编辑 + 配置预览 + 校验）✅
- M3：引入 IndexedDB（设置域）
