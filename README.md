# Notification Manager

用于集中管理多个 AIO Dynamic Push 机器人，提供机器人生命周期、配置、日志、微博登录态和自动恢复能力。

## 功能

- 创建、启动、停止和重启机器人。
- 在网页中编辑每个机器人的独立 AIO 配置。
- 查看按时间倒序排列的机器人及后端日志。
- 持久化微博浏览器会话，定时同步 Cookie。
- 使用微博 App 扫码恢复登录。
- 查看 NapCat QQ 的真实在线/发送状态，并使用手机 QQ 扫码恢复登录。
- NapCat 连续离线时通过已启用的非 NapCat 通道限频告警。
- 为指定机器人开启“自动拉起”，异常退出或后端重启后自动恢复。
- 中英文界面和移动端适配。

## 运行架构

- 前端：React，默认访问 `http://localhost:10010`。
- 后端：Express/TypeScript，默认监听 `4000`。
- 机器人：后端通过 Python 启动相邻的 `aio-dynamic-push-master/main.py`。
- 微博会话：后端容器内的 Chromium 持久档案保存在 `data/weibo-profile/`。

项目默认要求目录结构如下：

```text
TeamWebsite/
├── aio-dynamic-push-master/
└── notification-manager/
```

## 启动

1. 创建本地环境文件：

   ```bash
   cp .env.example .env
   id -u
   id -g
   ```

2. 在 `.env` 中填写宿主机用户 UID/GID。

3. 首次运行时创建示例机器人管理配置：

   ```bash
   cp bots/bot-example/config.example.yml bots/bot-example/config.yml
   ```

4. 构建并启动：

   ```bash
   docker compose up -d --build
   ```

5. 打开 `http://localhost:10010`。

前后端容器使用 `restart: unless-stopped`。Docker 服务已启用时，宿主机重启后会自动恢复管理页面和 API。

## 机器人配置

每个运行时机器人位于 `bots/<bot-id>/`：

- `config.yml`：由 `config.example.yml` 创建的本地管理器配置，包含 `auto_start`。
- `aio-config.yml`：AIO 查询任务和推送通道配置，可能包含敏感 Cookie。

实际机器人实例和 `aio-config.yml` 不纳入 Git。新增机器人时，管理器以 `bot-example` 为骨架创建运行目录。

“自动拉起”开启后：

- 停止状态会立即启动。
- 后端每 15 秒检查一次。
- 后端或容器重启后约 2 秒恢复。
- 关闭开关不会停止当前机器人，只取消后续自动恢复。

## 微博登录态

- 默认每 4 小时访问微博并刷新持久会话。
- 登录有效时更新所有微博任务 Cookie。
- 登录失效时可在首页点击“扫码登录”，使用微博 App 扫码并确认。
- 只有核心登录凭据变化才重启运行中的机器人，短期 Cookie 轮换只更新配置文件。

浏览器档案和 Cookie 均属于敏感数据，不应复制到代码仓库或公开日志。

## NapCat QQ 管理

- 后端每 30 秒调用 OneBot `get_status`，仅当 `online` 和 `good` 都为 `true` 时判定为在线。
- 连续 3 次检测失败后确认离线，并通过机器人配置中已启用的非 `napcat_qq` 通道告警；相同接收端会去重，同类告警 6 小时内最多发送一次。
- QQ 离线时可在首页点击“扫码重新登录”。管理器调用 NapCat WebUI 的重启和登录接口，并在页面显示手机 QQ 二维码。
- NapCat 仍由宿主机现有的 `tmux` 会话 `napcat` 托管。WebUI 重启只重启其内部工作进程，不把 NapCat 移入后端容器。
- 后端以只读方式挂载 NapCat 的 `config/` 目录来读取 WebUI Token；Token 不写入项目配置或前端响应。

如果 NapCat 整个宿主进程或 `tmux` 会话已经退出，WebUI 也会不可用，此时需要先在宿主机恢复 `tmux:napcat`，之后才能从页面扫码。

## 日志与时区

- 日志页面默认最新记录在上。
- traceback 作为完整事件保留原始内部顺序。
- 容器和机器人统一使用 `Asia/Shanghai`。
- 运行日志保存在 `logs/`，不纳入 Git。

## 开发检查

```bash
cd backend && npm ci && npm run build
cd ../frontend && npm ci && npm run build
docker compose config --quiet
```

详细版本内容见 [CHANGELOG.md](./CHANGELOG.md)。
