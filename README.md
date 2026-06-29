
# Compass - AI 聊天与人生管理系统


[![GitHub Roast](https://githubroast.dev/api/card/amanmanlai-byte)](https://githubroast.dev/u/amanmanlai-byte)

> 一站式 AI 聊天与人生管理平台，支持 15 家 AI 提供商、40+ 模型，集成人生地图、目标管理、记忆系统、定期复盘和技能追踪。

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Prisma](https://img.shields.io/badge/Prisma-5-2D2D2D)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8)

---

## 功能概览

### AI 聊天
- **15 家 AI 提供商、40+ 模型**: OpenAI (GPT-4o/4o-mini/4/o1/o3)、Anthropic (Claude Opus/Sonnet/Haiku)、Google (Gemini 2.0/1.5)、DeepSeek (V4 Flash/V4 Pro)、Mistral、Groq、xAI (Grok)、Moonshot、通义千问、百川 AI、零一万物、智谱 GLM、Cohere、Perplexity、Together AI
- **本地模型**: Ollama 接入，支持 Qwen、Llama、Mistral、Phi-4、Gemma、DeepSeek R1 等，无需 API Key
- **SSE 流式输出**: 实时打字机效果
- **图片识别**: 上传/粘贴图片，AI 识别内容
- **联网搜索**: DuckDuckGo 搜索，获取实时信息
- **人物视角模拟**: 15 个预设视角（费曼、芒格、塔勒布、乔布斯、马斯克等），AI 以该人物思维框架回答
- **快捷指令**: /translate、/summarize、/optimize、/explain、/test、/email、/continue
- **Agent 工具系统**: 可注册和调用自定义工具，扩展 AI 能力

### 人生地图
可视化生命旅程图谱，用节点和分支连接人生重要事件、决策和里程碑。

### 目标管理
创建和追踪个人目标，拆解为多个里程碑，支持进度追踪和状态管理。

### 记忆系统
AI 自动记住用户关键信息（偏好、目标、决策、习惯等），跨对话保持上下文连贯。

### 定期复盘
日/周/月复盘记录，AI 自动分析完成情况、挑战和下一步计划。

### 技能追踪
追踪个人技能水平（1-10 级），记录成长证据。

### 签到打卡
每日签到，追踪连续活跃天数。

### 界面与交互
- 4 套对话气泡风格（现代、简约、终端、可爱）
- 5 套代码高亮主题
- 深浅色主题，支持跟随系统
- 动态环境背景效果
- 浮动操作按钮 (FAB)
- 弹窗式设置管理
- 移动端响应式适配
- 简体中文 / English 双语界面

### 安全
- API Key AES-256-GCM 加密存储
- SSRF 防护
- NextAuth 会话管理（邮箱密码 + Google OAuth）
- 路由保护中间件
- CSP 安全头配置

---

## 新电脑快速开始

> 以下是从零开始在一台全新电脑上运行 Compass 的完整步骤。

### 第一步：安装环境

#### 1. 安装 Node.js

访问 https://nodejs.org 下载 **LTS 版本**（18 或更高），安装完成后验证：

```bash
node -v    # 应显示 v18.x.x 或更高
npm -v     # 应显示 9.x.x 或更高
```

#### 2. 安装 Git

访问 https://git-scm.com 下载安装，默认选项即可。安装完成后验证：

```bash
git --version
```

### 第二步：克隆项目

```bash
git clone https://github.com/amanmanlai-byte/compass.git
cd compass
```

### 第三步：安装依赖

```bash
npm install
```

> 如果网络慢，可以使用淘宝镜像：
> ```bash
> npm config set registry https://registry.npmmirror.com
> npm install
> ```

### 第四步：配置环境变量

```bash
cp .env.example .env
```

然后用任意编辑器打开 `.env` 文件，填写以下内容：

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="这里填一个随机字符串"
NEXTAUTH_URL="http://localhost:3000"
ENCRYPTION_KEY="这里填另一个随机字符串"
```

**生成随机密钥的方法：**

Windows PowerShell:
```powershell
-join ((1..32) | ForEach-Object { "{0:x2}" -f (Get-Random -Maximum 256) })
```

macOS / Linux:
```bash
openssl rand -hex 32
```

> `NEXTAUTH_SECRET` 和 `ENCRYPTION_KEY` 是两个不同的值，分别生成。

#### Google OAuth（可选）

如果需要 Google 登录功能：

1. 访问 [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. 创建 OAuth 2.0 客户端 ID（Web 应用类型）
3. 添加授权重定向 URI：`http://localhost:3000/api/auth/callback/google`
4. 将 Client ID 和 Secret 填入 `.env`：
```env
GOOGLE_CLIENT_ID="你的Client ID"
GOOGLE_CLIENT_SECRET="你的Client Secret"
```

### 第五步：初始化数据库

```bash
npx prisma db push
```

这会在 `prisma/` 目录下创建 SQLite 数据库文件。

### 第六步：导入演示数据（可选）

```bash
npm run seed
```

这会创建一个演示账号：`demo@example.com` / `demo123456`

### 第七步：启动

```bash
npm run dev
```

打开浏览器访问 http://localhost:3000

> **Windows 用户注意：** 如果 `cd D:\path` 不生效，先运行 `D:` 切换盘符。

---

## 配置 AI 提供商

登录后进入 **设置 → 模型与 API Key**，找到对应提供商，输入 API Key，点击 **测试连接** 验证，然后保存。

所有 API Key 通过 Web UI 配置，系统会自动加密存储，**不要**写在 `.env` 文件中。

| 提供商 | API Key 获取地址 |
|--------|-----------------|
| OpenAI | https://platform.openai.com/api-keys |
| Anthropic | https://console.anthropic.com/keys |
| Google (Gemini) | https://aistudio.google.com/apikey |
| DeepSeek | https://platform.deepseek.com/api_keys |
| Mistral | https://console.mistral.ai/api-keys |
| Groq | https://console.groq.com/keys |
| xAI (Grok) | https://console.x.ai |
| Moonshot (Kimi) | https://platform.moonshot.cn/console/api-keys |
| 通义千问 (Qwen) | https://bailian.console.aliyun.com/ |
| 百川 AI | https://platform.baichuan-ai.com/console/apikey |
| 零一万物 (Yi) | https://platform.lingyiwanwu.com/apikeys |
| 智谱 AI (GLM) | https://open.bigmodel.cn/usercenter/apikeys |
| Cohere | https://dashboard.cohere.com/api-keys |
| Perplexity | https://www.perplexity.ai/settings/api |
| Together AI | https://api.together.xyz/settings/api-keys |

### 本地模型 (Ollama)

1. 安装 Ollama: https://ollama.com/download
2. 下载模型: `ollama pull qwen2.5`
3. 启动服务: `ollama serve`
4. 设置 → 本地模型，配置服务地址（默认 `http://localhost:11434`）
5. 测试连接
6. 聊天时选择 local 分组下的模型

---

## 项目结构

```
compass/
├── app/                        # Next.js App Router
│   ├── api/                    # 23 个 API 路由
│   │   ├── auth/               # NextAuth 认证 + 注册
│   │   ├── chat/               # SSE 流式对话
│   │   ├── conversations/      # 对话 CRUD
│   │   ├── goals/              # 目标 + 里程碑
│   │   ├── life-map/           # 人生地图
│   │   ├── memories/           # 记忆系统
│   │   ├── models/             # 模型列表
│   │   ├── perspectives/       # 人物视角
│   │   ├── profile/            # 用户档案
│   │   ├── reviews/            # 复盘
│   │   ├── search/             # 联网搜索
│   │   ├── settings/           # 设置 + API Key
│   │   ├── skills/             # 技能标签
│   │   └── checkins/           # 签到打卡
│   ├── (dashboard)/            # 11 个页面
│   │   ├── chat/               # 主聊天页
│   │   ├── goals/              # 目标管理
│   │   ├── history/            # 历史记录
│   │   ├── life-map/           # 人生地图
│   │   ├── memories/           # 记忆管理
│   │   ├── profile/            # 个人档案
│   │   ├── settings/           # 设置页
│   │   └── /                   # 首页仪表盘
│   ├── auth/                   # 登录/注册页
│   ├── globals.css             # 全局样式
│   └── layout.tsx              # 根布局
├── components/                 # React 组件
│   ├── effects/                # 粒子特效、玻璃覆盖层
│   ├── layout/                 # 侧边栏、头部、主题、背景
│   ├── life-map/               # 地图视图、节点卡片
│   ├── goals/                  # 目标编辑弹窗
│   ├── memories/               # 记忆编辑弹窗
│   ├── settings/               # 设置弹窗
│   └── ui/                     # shadcn/ui 基础组件
├── lib/                        # 核心逻辑
│   ├── models/                 # 15 家 AI 提供商适配器
│   ├── agent/                  # 工具注册系统
│   ├── db/                     # Prisma 客户端 + AES 加密
│   ├── store/                  # Zustand 状态管理
│   └── i18n/                   # 中英文双语
├── prisma/                     # 数据库
│   ├── schema.prisma           # 数据模型定义
│   └── seed.ts                 # 演示数据
├── types/                      # TypeScript 类型定义
├── public/                     # 静态资源
├── .env.example                # 环境变量模板
├── next.config.ts              # Next.js 配置（安全头）
├── proxy.ts                    # 路由保护中间件
└── package.json                # 项目依赖
```

---

## 数据库模型

19 个模型：User、Account、Session、ApiKey、Conversation、Message、UserSettings、PresetPrompt、SharedConversation、QuickCommand、UserProfile、Goal、Milestone、Review、Memory、SkillTag、CheckIn、LifeMap、LifeNode、LifeBranch。

---

## 常见问题

### npm install 很慢？

设置淘宝镜像：
```bash
npm config set registry https://registry.npmmirror.com
```

### 端口被占用？

```bash
npx next dev -p 3001
```

然后访问 http://localhost:3001

### 数据库出问题？

重新初始化：
```bash
rm prisma/dev.db
npx prisma db push
npm run seed    # 可选，导入演示数据
```

### Windows 上 cd 路径不生效？

Windows cmd 中跨盘符需要先切换盘符：
```cmd
D:
cd \hermes桌面端\compass-master
```

### 忘记了 .env 配置？

最简配置只需要三项：
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="任意随机字符串"
ENCRYPTION_KEY="另一个随机字符串"
```

---

## 部署

### Vercel（推荐）

1. Fork 本仓库到你的 GitHub
2. 登录 [Vercel](https://vercel.com)，导入项目
3. 修改 `prisma/schema.prisma` 中的 provider 为 `postgresql`
4. 配置环境变量（使用 Vercel Postgres 或 Supabase 的 PostgreSQL 连接串）
5. 部署

### Docker

```bash
docker build -t compass .
docker run -p 3000:3000 compass
```

---

## 环境要求

- Node.js 18+
- npm 9+
- Windows / macOS / Linux

---

## License

MIT
