# CF-Mail 开发进度

## 当前状态

项目已经具备单用户“收件邮局”核心能力，并完成一轮安全与可用性补强。

## 已完成

### 核心收件
- [x] Email Workers 收件处理
- [x] D1 存储邮箱/邮件元数据
- [x] R2 存储原始 EML 与附件
- [x] MIME 解析
- [x] 验证码提取
- [x] 自动创建邮箱

### 后台能力
- [x] 登录 / 登出
- [x] 邮箱创建 / 删除
- [x] 邮件列表 / 详情 / 原始 EML 下载
- [x] 附件下载
- [x] 批量标记已读
- [x] 批量删除邮件
- [x] Telegram 通知

### 安全与稳定性
- [x] JWT 密钥自动初始化并持久化
- [x] 默认管理员密码强制修改
- [x] 设置接口敏感信息脱敏
- [x] 邮件 HTML 清洗 + `sandbox iframe` 渲染
- [x] 解析后的正文预存，避免详情页重复解析 EML

## 暂未做

- [ ] 拒收日志 / 拒收面板
- [ ] 独立的域名管理页
- [ ] 批量导出 EML
- [ ] 自动化测试

## API 概览

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /api/health | 健康检查 | ❌ |
| GET | /api/config | 公共配置（域名列表） | ❌ |
| GET | /api/session | 当前登录态 | ❌ |
| POST | /api/login | 登录 | ❌ |
| POST | /api/logout | 登出 | ✅ |
| POST | /api/change-password | 修改管理员密码 | ✅ |
| GET | /api/mailboxes | 邮箱列表 | ✅ |
| POST | /api/mailboxes | 创建邮箱 | ✅ |
| DELETE | /api/mailboxes/:id | 删除邮箱 | ✅ |
| DELETE | /api/mailboxes-auto-created | 删除全部自动创建邮箱 | ✅ |
| GET | /api/mailboxes/:id/messages | 邮件列表 | ✅ |
| GET | /api/messages/:id | 邮件详情 | ✅ |
| GET | /api/messages/:id/raw | 原始 EML | ✅ |
| DELETE | /api/messages/:id | 删除邮件 | ✅ |
| POST | /api/messages/batch-read | 批量标记已读 | ✅ |
| POST | /api/messages/batch-delete | 批量删除邮件 | ✅ |
| GET | /api/attachments/:id | 下载附件 | ✅ |
| GET | /api/settings | 获取设置（脱敏） | ✅ |
| PUT | /api/settings | 更新设置 | ✅ |

## 备注

- 当前域名来源于已创建邮箱；首次进入会提示先创建一个完整邮箱地址。
- 已保存的 Telegram Bot Token 不会再回显到前端。
