# CF-Mail 设计文档

## 定位

CF-Mail 是一个部署在 Cloudflare Workers 上的单用户收件邮局，重点场景是：

- 接收站点注册 / 登录验证码
- 查看原始邮件内容
- 下载邮件附件
- 通过 Telegram 接收提醒

不做发件，不做多用户系统。

## 技术栈

- 后端：TypeScript + Hono
- 前端：单页 `public/index.html`（Tailwind CDN + Alpine.js）
- 数据库：Cloudflare D1
- 对象存储：Cloudflare R2
- 邮件入口：Cloudflare Email Workers

## 运行结构

```text
src/
├── index.ts               # Worker 入口（HTTP + Email）
├── db/init.ts             # 自动建表与轻量 schema upgrade
├── middleware/auth.ts     # Cookie/JWT 鉴权、默认密码强制改密
├── routes/
│   ├── auth.ts            # 登录、会话、改密
│   ├── mailbox.ts         # 邮箱管理
│   ├── message.ts         # 邮件详情、附件下载、批量操作
│   └── settings.ts        # 设置读取与更新（脱敏）
├── services/
│   ├── email.ts           # 收件、入库、Telegram 通知
│   ├── parser.ts          # MIME 解析
│   └── verification.ts    # 验证码提取
└── utils/
    ├── jwt.ts             # JWT 签发与校验
    └── password.ts        # 密码哈希、校验、默认密码检测
```

## 数据模型

### mailboxes

```sql
CREATE TABLE mailboxes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  address TEXT NOT NULL UNIQUE,
  local_part TEXT NOT NULL,
  domain TEXT NOT NULL,
  is_auto_created INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### messages

```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mailbox_id INTEGER NOT NULL,
  sender TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview TEXT,
  verification_code TEXT,
  text_content TEXT,
  html_content TEXT,
  r2_key TEXT NOT NULL,
  received_at TEXT DEFAULT CURRENT_TIMESTAMP,
  is_read INTEGER DEFAULT 0,
  FOREIGN KEY (mailbox_id) REFERENCES mailboxes(id) ON DELETE CASCADE
);
```

### attachments

```sql
CREATE TABLE attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT,
  size INTEGER,
  hash TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);
```

### settings

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

## 收件链路

1. Email Worker 收到邮件
2. 校验邮箱是否存在；若开启自动创建则按规则尝试补建
3. 读取原始 EML
4. MIME 解析正文 / HTML / 附件
5. 提取验证码、生成预览
6. 原始 EML 写入 R2
7. 邮件元数据 + 预存正文写入 D1
8. 附件按哈希去重后写入 R2，并建立引用记录
9. 若已配置 Telegram，则发送通知

## 为什么要“预存正文”

详情页如果每次都去 R2 读取 EML 再解析，会重复消耗 CPU 和 IO。  
所以现在在收件时直接把 `text_content` / `html_content` 预存到 `messages` 表：

- 打开邮件详情时优先直接读 D1
- 旧邮件若没有预存字段，则首次查看时回源 R2 解析，并回填到 D1

这样可以减少重复解析，也为后续搜索正文打基础。

## 安全设计

### 1. 默认密码强制修改

- 若仍使用默认 `ADMIN_PASSWORD`
- 登录后只能访问会话、登出、改密等少量接口
- 修改完成后才允许继续使用系统

### 2. 设置接口脱敏

前端设置接口不返回以下敏感值：

- `jwt_secret`
- `admin_password_hash`
- `tg_bot_token`

其中 Telegram Token 仅支持“覆盖更新”，不再回显。

### 3. 邮件 HTML 安全渲染

邮件详情中的 HTML 会在前端：

- 删除脚本、表单、嵌入对象、事件属性
- 拦截远程图片
- 放入 `sandbox iframe` 中渲染

目标是降低恶意邮件内容对后台页面的影响。

## 首次使用引导

系统没有单独的“域名管理表”，域名来源于已创建邮箱：

- 第一次创建邮箱时输入完整地址，如 `admin@example.com`
- 创建后自动记住 `example.com`
- 后续再建邮箱时就可以直接在该域名下生成地址

前端在首次进入且没有任何邮箱时，会显示这套引导。
