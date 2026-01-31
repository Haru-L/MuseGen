# MuseGen - 卡林巴琴乐谱生成器

MuseGen 是一个纯前端的 Web 应用，允许用户上传 MP3 音频文件，自动分析并生成可演奏的卡林巴琴（拇指琴）乐谱。

## ✨ 核心特性

- 🎵 **自动转谱**：从 MP3 音频自动生成 17 键/21 键卡林巴乐谱。
- 📊 **多难度支持**：提供入门、普通、进阶三档难度选择。
- 🔒 **隐私安全**：所有处理均在本地浏览器完成，音频文件不上传服务器。
- 💾 **本地存储**：使用 IndexedDB 自动保存乐谱和设置。
- 🎹 **实时预览**：内置合成器，支持乐谱实时播放与预览。

## 🛠️ 技术栈

- **框架**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **语言**: [TypeScript](https://www.typescriptlang.org/)
- **样式**: [Tailwind CSS 4](https://tailwindcss.com/)
- **状态管理**: [Zustand](https://github.com/pmndrs/zustand)
- **音频处理**:
  - [Tone.js](https://tonejs.github.io/) (音频合成与播放)
  - [Essentia.js](https://mtg.github.io/essentia.js/) & [Meyda](https://meyda.js.org/) (音频特征提取)
- **存储**: IndexedDB (via `idb` pattern)

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 pnpm

### 安装

```bash
# 克隆项目
git clone https://github.com/yourusername/MuseGen.git

# 进入目录
cd MuseGen

# 安装依赖
npm install
```

### 开发

```bash
# 启动开发服务器
npm run dev
```

### 构建

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

### 测试

```bash
# 运行单元测试
npm test

# 查看覆盖率
npm run test:coverage
```

## 📂 项目结构

```
MuseGen/
├── docs/               # 项目文档 (PRD, 规划, 技术规格)
├── src/
│   ├── components/     # React 组件
│   ├── services/       # 核心业务逻辑 (音频处理, Worker)
│   ├── stores/         # Zustand 状态管理
│   ├── utils/          # 工具函数
│   ├── types/          # TypeScript 类型定义
│   └── ...
├── public/             # 静态资源
└── ...
```

## 📅 开发状态

当前处于 **Phase 2: 音频上传与预处理** 阶段。
详细规划请查看 [docs/planning](docs/planning/)。

## 📄 许可证

MIT
