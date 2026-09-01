<div align="center">

# 💎 SubPrism

**现代化高性能代理节点与多协议订阅分发中枢** / Modern, high-performance proxy node management and multi-protocol subscription distribution hub

基于 Next.js 14 (App Router) + pnpm + Upstash Redis 构建 / Built with Next.js 14 (App Router) + pnpm + Upstash Redis

[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![Upstash Redis](https://img.shields.io/badge/Upstash-Redis-00E599.svg)](https://upstash.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC.svg)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**语言 / Language**: [简体中文](#chinese) · [English](#english)

</div>

---

<a id="chinese"></a>
## 🇨🇳 简体中文

### 项目简介

**SubPrism** 是一个基于 Next.js 14（App Router）构建的自托管代理节点管理与多协议订阅分发系统。它面向单管理员部署场景，提供从节点导入、解析到多客户端订阅分发的完整流程，并内置邮件与 Telegram 通知能力，帮助你在 Vercel 等无服务器平台上零成本搭建私有订阅服务。

### 功能说明

- 🚀 **多协议智能解析**
  - 支持 Base64 加密 Socks5 链接解析（自动解密为 `username:password`）。
  - 支持 Shadowsocks (SIP002 & Legacy)、VMess、VLESS、Trojan、HTTP/HTTPS。
  - 支持多行批量粘贴导入与实时可视化预览。
- 🔑 **确定性 16 位安全 Token**
  - 基于 HMAC-SHA256 结合用户名与密钥盐值，生成不可逆、防篡改且确定性的 16 位 URL Token（如 `/sub/7a8f9c0e2b1d3f4a`）。
- 🌈 **多客户端订阅分发 (`/sub/[token]`)**
  - **通用订阅 (Base64)**：兼容 Shadowrocket、Quantumult X、V2RayN 等客户端。
  - **Clash / Meta (YAML)**：自动生成完整代理组（自动测速、故障转移）与基础规则。
  - **V2Ray 节点列表**、**Shadowsocks 格式** 及 **JSON 原始数据**。
  - 自动识别客户端 User-Agent 智能协商输出格式。
- 📱 **二维码极速扫码**
  - 订阅弹窗集成动态二维码生成，一键切换各客户端格式，方便移动端扫码导入。
- 📬 **自动与手动通知系统**
  - **Resend 邮件推送**：发送美观的 HTML 响应式卡片邮件。
  - **Telegram 机器人推送**：发送 Markdown 格式专属订阅卡片。
- 🌍 **多语言国际化 (i18n)**
  - 支持简体中文（默认）、English、日本語，详见[国际化指南](#国际化指南)。
- 🛡️ **生产级安全防护**
  - 无默认弱密码，未配置密码时启动自动生成 16 位随机密码并打印日志。
  - 敏感凭据（Redis、Token、API Key）严格位于服务端，绝不暴露至前端。
  - 严格的 JWT Cookie 鉴权与中间件路由拦截。

### 技术栈

| 类别 | 技术 |
| --- | --- |
| 框架 | Next.js 14 (App Router) + React 18 + TypeScript 5.6 |
| 样式 | Tailwind CSS 3 + clsx + tailwind-merge + lucide-react |
| 数据存储 | Upstash Redis（无 Redis 环境变量时自动降级为内存模式） |
| 认证 | JWT Cookie 会话 + 中间件路由拦截 |
| 通知 | Resend (Email) + Telegram Bot |

### 环境变量配置

复制 `.env.example` 为 `.env.local`（本地开发）并按需配置：

```env
# 管理员登录凭据（默认用户名 admin；未配置密码时启动自动生成随机密码）
ADMIN_NAME=admin
ADMIN_PASSWORD=your_secure_password

# JWT 会话密钥
AUTH_SECRET=your_secret_jwt_key

# 订阅 16 位 Token 生成密钥盐值（强烈建议自定义）
SUB_TOKEN=your_custom_secret_salt

# Upstash Redis 数据库凭据（未配置时自动开启本地内存降级模式）
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=Axxxxxx...

# 邮件通知服务（Resend）
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=SubPrism <notifications@resend.dev>

# Telegram 机器人通知
TELEGRAM_BOT_TOKEN=123456789:ABCDefgh-xxxxxxxx

# 应用公网部署域名（用于生成订阅链接）
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### 部署指南

**本地开发**

```bash
pnpm install     # 安装依赖
pnpm dev         # 启动开发服务器 (http://localhost:3000)
```

**生产构建**

```bash
pnpm build       # 生产环境构建
pnpm start       # 生产环境启动
pnpm lint        # 代码检查
```

**部署到 Vercel**

1. 将此仓库导入 Vercel（自动识别为 Next.js 项目）。
2. 在项目 **Settings → Environment Variables** 中配置上述所有环境变量（务必配置 `AUTH_SECRET`、`SUB_TOKEN`，并设置 `ADMIN_PASSWORD`）。
3. 点击 **Deploy** 完成部署。
4. 部署后访问 `/admin`，使用配置的管理员凭据登录。

> 💡 **无服务器提示**：未配置 `UPSTASH_REDIS_REST_URL` 时使用进程内内存存储，重启后数据会丢失，生产环境请务必使用 Upstash Redis。

### 国际化指南

项目采用自定义的轻量级 i18n 方案（非 next-intl），翻译文件以 JSON 形式存放于 `locales/` 目录：

- `locales/zh-CN.json` — 简体中文（默认）🇨🇳
- `locales/en-US.json` — English 🇺🇸
- `locales/ja-JP.json` — 日本語 🇯🇵

**语言切换**：界面语言由 `components/LanguageSwitcher.tsx` 切换，选择结果持久化至 `localStorage` 与 Cookie（1 年），并兼顾 `navigator.language` 浏览器语言检测。

**新增一门语言**：

1. 在 `locales/` 下新建 JSON 文件，命名遵循 BCP-47 规范（如 `fr-FR.json`），并在文件内的 `_meta` 字段中声明 `code`、`name`、`flag`：
   ```jsonc
   {
     "_meta": { "code": "fr-FR", "name": "Français", "flag": "🇫🇷" },
     "dashboard": { "title": "Tableau de bord" }
   }
   ```
2. 服务端 `lib/i18n.ts` 会通过 `fs` 自动扫描并注册新语言，前端 `I18nProvider` 也会动态合并 `/api/locales` 返回的数据。

**使用方法**：在组件中通过 `useI18n()` 获取 `t(path, params)` 函数，采用点号路径查找并支持 `{var}` 插值，例如 `t('dashboard.title')`、`t('subs.selectedCount', { count: 5 })`。

---

<a id="english"></a>
## 🇺🇸 English

### Overview

**SubPrism** is a self-hosted proxy node management and multi-protocol subscription distribution system built on Next.js 14 (App Router). Designed for single-administrator deployments, it covers the full workflow from node import and parsing to multi-client subscription distribution, with built-in email and Telegram notification support — letting you stand up a private subscription service at zero cost on serverless platforms like Vercel.

### Features

- 🚀 **Multi-protocol smart parsing**
  - Parses Base64-encrypted SOCKS5 links (auto-decrypts to `username:password`).
  - Supports Shadowsocks (SIP002 & Legacy), VMess, VLESS, Trojan, HTTP/HTTPS.
  - Multi-line batch paste import with real-time visual preview.
- 🔑 **Deterministic 16-character secure token**
  - Generated via HMAC-SHA256 with username and salt — irreversible, tamper-proof, and deterministic (e.g. `/sub/7a8f9c0e2b1d3f4a`).
- 🌈 **Multi-client subscription distribution (`/sub/[token]`)**
  - **Universal (Base64)**: compatible with Shadowrocket, Quantumult X, V2RayN, and more.
  - **Clash / Meta (YAML)**: auto-generates complete proxy groups (auto speed-test, failover) and base rules.
  - **V2Ray node list**, **Shadowsocks format**, and **raw JSON**.
  - Auto-negotiates output format from the client's User-Agent.
- 📱 **QR code quick-scan**
  - Subscription modal generates dynamic QR codes and lets you switch client formats for mobile scan-and-import.
- 📬 **Automatic & manual notification system**
  - **Resend email**: sends polished HTML responsive card emails.
  - **Telegram bot**: sends Markdown-format dedicated subscription cards.
- 🌍 **Internationalization (i18n)**
  - Simplified Chinese (default), English, and Japanese — see [Internationalization Guide](#internationalization-guide).
- 🛡️ **Production-grade security**
  - No default weak password — a strong 16-char random password is auto-generated and logged at startup if unset.
  - Sensitive credentials (Redis, Token, API Key) stay strictly server-side, never exposed to the frontend.
  - Strict JWT cookie auth with middleware route interception.

### Tech Stack

| Category | Technology |
| --- | --- |
| Framework | Next.js 14 (App Router) + React 18 + TypeScript 5.6 |
| Styling | Tailwind CSS 3 + clsx + tailwind-merge + lucide-react |
| Data store | Upstash Redis (falls back to in-memory when Redis env vars absent) |
| Auth | JWT cookie sessions + middleware route interception |
| Notifications | Resend (Email) + Telegram Bot |

### Environment Variables

Copy `.env.example` to `.env.local` (local dev) and configure as needed:

```env
# Admin authentication (default username is "admin"; a random password is generated at startup if unset)
ADMIN_NAME=admin
ADMIN_PASSWORD=your_secure_password

# JWT session secret
AUTH_SECRET=your_secret_jwt_key

# Master salt for 16-char subscription token generation (strongly recommended to customize)
SUB_TOKEN=your_custom_secret_salt

# Upstash Redis credentials (falls back to local in-memory mode when unset)
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=Axxxxxx...

# Email notification service (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=SubPrism <notifications@resend.dev>

# Telegram bot notification
TELEGRAM_BOT_TOKEN=123456789:ABCDefgh-xxxxxxxx

# Public application URL (used to generate subscription links)
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### Deployment

**Local development**

```bash
pnpm install     # install dependencies
pnpm dev         # start dev server (http://localhost:3000)
```

**Production build**

```bash
pnpm build       # production build
pnpm start       # run production server
pnpm lint        # lint check
```

**Deploy to Vercel**

1. Import this repository into Vercel (auto-detected as a Next.js project).
2. In **Settings → Environment Variables**, configure all variables above (be sure to set `AUTH_SECRET`, `SUB_TOKEN`, and a strong `ADMIN_PASSWORD`).
3. Click **Deploy**.
4. After deploying, visit `/admin` and log in with your admin credentials.

> 💡 **Serverless note**: Without `UPSTASH_REDIS_REST_URL`, data is stored in process memory and lost on restart — always use Upstash Redis in production.

### Internationalization Guide

The project uses a custom lightweight i18n approach (not next-intl). Translation files are JSON placed in the `locales/` directory:

- `locales/zh-CN.json` — Simplified Chinese (default) 🇨🇳
- `locales/en-US.json` — English 🇺🇸
- `locales/ja-JP.json` — Japanese 🇯🇵

**Language switching**: The UI language is switched via `components/LanguageSwitcher.tsx`, persisted to `localStorage` and a cookie (1 year), and also considers the `navigator.language` browser locale.

**Adding a new language**:

1. Create a new JSON file in `locales/` following the BCP-47 naming convention (e.g. `fr-FR.json`), and declare `code`, `name`, and `flag` in its `_meta` block:
   ```jsonc
   {
     "_meta": { "code": "fr-FR", "name": "Français", "flag": "🇫🇷" },
     "dashboard": { "title": "Tableau de bord" }
   }
   ```
2. The server-side `lib/i18n.ts` scans and registers the new language automatically, and the client `I18nProvider` dynamically merges the data returned from `/api/locales`.

**Usage**: In components, call `useI18n()` to get the `t(path, params)` function, which uses dotted-path lookup with `{var}` interpolation, e.g. `t('dashboard.title')`, `t('subs.selectedCount', { count: 5 })`.

---

## 📄 License

本项目采用 **[MIT License](LICENSE)** 开源协议，欢迎自由使用、修改与分发。

This project is released under the **[MIT License](LICENSE)**. You are free to use, modify, and distribute it.