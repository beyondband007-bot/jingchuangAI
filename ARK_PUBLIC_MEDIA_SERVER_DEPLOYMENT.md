# Ark 公网媒体地址服务器部署专项说明

本文只处理一个场景：本地测试时使用 Cloudflare 临时隧道暴露素材，部署到服务器后改用正式公网域名，并保证虚拟资产入库、视频换脸和动作迁移链路正常工作。

## 1. 当前链路如何使用公网 URL

当前实现的调用顺序是：

1. 用户把图片或 15 秒以内的视频上传到本项目。
2. 文件保存到后端 `MEDIA_STORAGE_DIR`，Docker 部署时对应 `/app/storage`。
3. 后端将 `/media/...` 拼接为 `PUBLIC_MEDIA_BASE_URL` 下的完整 HTTPS URL。
4. 后端使用 `VOLC_ACCESS_KEY_ID` 和 `VOLC_SECRET_ACCESS_KEY` 调用火山 Ark OpenAPI，把该 URL 写入虚拟资产库。
5. 火山服务器从公网 URL 下载素材并处理为 `asset://...`。
6. 后端使用 `ARK_API_KEY` 和该 `asset://...` 调用 Seedance。
7. 后端主动轮询资产和视频任务状态。

因此，当前链路**不需要配置业务回调 URL**。正式域名在这里主要承担“火山服务器回源下载上传素材”的作用。

## 2. 服务器必须满足的条件

- 域名已经解析到服务器公网 IP。
- 公网 `443` 端口开放。
- 域名具有浏览器和公网服务均信任的 HTTPS 证书及完整证书链。
- `https://你的域名/media/...` 无需登录、Cookie、Referer 或临时签名即可访问。
- `/media` 不得被验证码、Cloudflare Challenge、防盗链、WAF 人机验证或 IP 白名单拦截。
- `/media` 不能重定向到登录页或前端 `index.html`。
- 上传后的文件必须立即可以通过公网 URL 获取。
- MySQL 和媒体存储必须持久化，不能随容器重建而丢失。
- Ark API Key、火山 AK/SK 和 `ARK_PROJECT_NAME` 必须属于能够互相访问资产的同一账号/项目命名空间。

公网 URL 只开放素材读取即可，不要把后端 `3006` 或 MySQL 端口直接暴露到公网。

## 3. 生产环境变量

在服务器仓库根目录的 `.env` 中配置以下内容。不要继续使用 `trycloudflare.com` 地址。

以当前正式域名 `jc.getrueai.com` 为例：

```dotenv
PUBLIC_BASE_URL=https://jc.getrueai.com
PUBLIC_MEDIA_BASE_URL=https://jc.getrueai.com/media

VITE_API_BASE_URL=
FRONTEND_BIND_ADDRESS=127.0.0.1
FRONTEND_PORT=8088

ARK_API_KEY=你的_Ark_视频生成_API_Key
ARK_API_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_VIDEO_MODEL=doubao-seedance-2-0-260128
ARK_PROJECT_NAME=jingchuang
ARK_VIRTUAL_ASSET_GROUP_NAME=jingchuang-ai-virtual-assets

VOLC_ACCESS_KEY_ID=你的_Access_Key_ID
VOLC_SECRET_ACCESS_KEY=你的_Secret_Access_Key
VOLC_REGION=cn-beijing
VOLC_OPENAPI_ENDPOINT=https://open.volcengineapi.com
```

注意：

- `PUBLIC_MEDIA_BASE_URL` 必须包含 `/media`，不要写成网站首页地址。
- 不要写成 `https://jc.getrueai.com/media/media`。
- `PUBLIC_BASE_URL` 已配置时，代码可以自动推导 `/media`；生产环境仍建议显式填写 `PUBLIC_MEDIA_BASE_URL`，便于排查。
- `VITE_API_BASE_URL` 保持为空，前端通过同源 `/api` 访问后端。
- 如果宿主机 Nginx 负责公网入口，`FRONTEND_BIND_ADDRESS` 使用 `127.0.0.1`。
- `.env` 不得提交到 Git，建议执行 `chmod 600 .env`。
- 调试期间使用过或对外发送过的生产密钥，建议上线前重新签发或轮换。

## 4. Nginx 必须保留的能力

仓库内的前端 Nginx 已经把 `/api` 和 `/media` 代理到后端，宿主机 Nginx 可以继续把整个域名代理到 `127.0.0.1:8088`。

虚拟资产首次入库可能轮询接近 180 秒。宿主机和容器内两层 Nginx 的 API 超时都建议设置为 300 秒，否则可能出现后端仍在处理、浏览器先收到 `504` 的情况。

宿主机 Nginx 示例：

```nginx
server {
    listen 80;
    server_name jc.getrueai.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name jc.getrueai.com;

    ssl_certificate /etc/letsencrypt/live/jc.getrueai.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/jc.getrueai.com/privkey.pem;

    client_max_body_size 250m;

    location / {
        proxy_pass http://127.0.0.1:8088;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 30s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

容器内 `frontend-app/nginx.conf` 的 `location /api/` 建议包含：

```nginx
location /api/ {
    proxy_pass $backend_upstream;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_connect_timeout 30s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
}
```

`location /media/` 必须继续代理到后端，不要被 SPA 的 `location /` 捕获并返回 `index.html`。

修改宿主机配置后执行：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 5. 部署步骤

### 5.1 本机提交前检查

本功能包含新增源码文件，不能只使用 `git commit -am`。提交前执行：

```bash
git status --short
git add \
  ARK_PUBLIC_MEDIA_SERVER_DEPLOYMENT.md \
  backend/src/modules/digital-human/arkVirtualAssets.repository.js \
  backend/src/modules/digital-human/arkVirtualAssets.service.js \
  backend/src/providers/volcengine/assets.js \
  backend/src/providers/volcengine/openapi.js \
  backend/src/providers/volcengine/videoGeneration.js \
  backend/src/shared/publicMedia.js
```

同时还需要把本次已经修改的 `.env.production.example`、`docker-compose.yml`、后端服务、前端页面和两份 Nginx 配置加入同一个提交。提交后再次执行：

```bash
git status --short
git show --stat --oneline HEAD
```

确认新增的 Ark 源码文件确实出现在提交中。不要提交根目录 `.env`。

### 5.2 服务器部署

在服务器仓库根目录执行：

```bash
git pull
cp .env.production.example .env
chmod 600 .env
```

如果服务器已经存在 `.env`，不要覆盖它，只补充或修改第 3 节列出的变量。

完成环境变量和 Nginx 配置后：

```bash
bash deploy-production.sh
```

该脚本会构建并启动容器、等待后端健康，并执行：

```bash
docker compose exec backend npm run db:init
```

`db:init` 必须成功，因为本链路依赖：

- `ark_virtual_asset_groups`
- `ark_virtual_assets`
- `face_swap_assets`
- `face_swap_tasks`
- `motion_transfer_assets`
- `motion_transfer_tasks`

检查容器：

```bash
docker compose ps
docker compose logs --tail=200 backend
curl -fsS https://jc.getrueai.com/health
```

## 6. 上线后验证

### 6.1 验证后端读取到正式配置

```bash
docker compose exec backend node -e "
import('./src/config/index.js').then(({config}) => console.log({
  publicMediaBaseUrl: config.media.publicBaseUrl,
  projectName: config.ark.projectName,
  arkApiKeyConfigured: Boolean(config.ark.apiKey),
  volcCredentialsConfigured: Boolean(config.ark.accessKeyId && config.ark.secretAccessKey)
}))"
```

预期：

```text
publicMediaBaseUrl: https://jc.getrueai.com/media
projectName: jingchuang
arkApiKeyConfigured: true
volcCredentialsConfigured: true
```

也可以检查功能配置接口：

```bash
curl -fsS https://jc.getrueai.com/api/face-swap/models
curl -fsS https://jc.getrueai.com/api/motion-transfer/models
```

响应中的模型应显示：

```json
"configured": true
```

### 6.2 验证公网媒体回源

先通过网页上传一张测试图片或一段 15 秒以内的视频，从上传接口响应中取得 `localUrl`，例如：

```text
/media/face-swap/videos/xxxxxxxx.mp4
```

使用完整公网 URL 检查：

```bash
curl -I https://jc.getrueai.com/media/face-swap/videos/xxxxxxxx.mp4
curl -r 0-1023 -o /dev/null -sS -w '%{http_code}\n' \
  https://jc.getrueai.com/media/face-swap/videos/xxxxxxxx.mp4
```

预期：

- 状态为 `200`；Range 请求通常为 `206`。
- `Content-Type` 为实际图片或视频类型。
- 返回的是媒体文件，不是 HTML。
- 没有跳转到登录页。
- HTTPS 证书校验成功，不能依赖 `curl -k`。

最好再用手机流量或另一台公网机器访问该 URL，排除服务器本机访问正常但公网防火墙、DNS 或 CDN 规则拦截的情况。

### 6.3 验证完整 Ark 链路

在前端分别执行一次视频换脸或动作迁移，素材视频必须不超过 15 秒。同时观察日志：

```bash
docker compose logs -f --tail=200 backend
```

随后检查最近的虚拟资产记录：

```bash
docker compose exec mysql sh -lc \
  'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "
  SELECT id, feature, status, public_url, asset_uri, error_message
  FROM ark_virtual_assets
  ORDER BY id DESC
  LIMIT 10;"'
```

成功标准：

1. `public_url` 使用正式域名，不再出现 `trycloudflare.com`。
2. 资产状态最终变为 `active`。
3. `asset_uri` 以 `asset://` 开头。
4. 视频任务获得 `provider_task_id`。
5. Seedance 任务进入生成状态并最终返回结果视频。

## 7. 本地数据迁移注意事项

如果只是把代码推到服务器，然后在服务器重新上传素材，不需要迁移本地 Cloudflare 测试记录。

如果同时迁移本地数据库和媒体文件，需要特别注意：

- `face_swap_assets.file_path` 和 `motion_transfer_assets.file_path` 可能保存 Windows 本地路径。
- `ark_virtual_assets.file_path` 也可能保存 Windows 本地路径。
- 旧记录的 `public_url` 可能仍然是已失效的 `trycloudflare.com`。
- 旧 `active` 资产通常已有 `asset://`，同一 Ark 项目下可能仍可使用。
- 旧 `processing` 资产仍可能依赖临时 URL，不应继续复用。
- 即使旧 `asset://` 可用，视频换脸和动作迁移创建任务前仍会从本地 `file_path` 读取源视频时长；Windows 路径在 Linux 服务器上会失败。

因此生产上线的推荐做法是：

1. 不复用本地测试产生的视频换脸或动作迁移素材 ID。
2. 在服务器正式页面重新上传图片和视频。
3. 让服务器重新生成永久公网 URL 和新的 `asset://`。
4. 不要通过 SQL 简单把旧 Cloudflare 域名替换为正式域名，除非对应媒体文件已经完整迁移且路径逐条验证过。

## 8. 常见故障定位

| 现象 | 重点检查 |
| --- | --- |
| 模型接口显示 `configured: false` | `ARK_API_KEY`、AK/SK、`PUBLIC_MEDIA_BASE_URL` 是否进入后端容器 |
| 提示缺少 `PUBLIC_MEDIA_BASE_URL` | `.env` 未设置，或修改后没有重建/重启后端容器 |
| Ark 创建资产失败或一直 Processing | 公网素材 URL、HTTPS 证书、WAF、防盗链、文件类型及公网访问能力 |
| 返回 `asset not found` | `ARK_API_KEY` 与 AK/SK 是否属于同一项目命名空间，`ARK_PROJECT_NAME` 是否为 `jingchuang` |
| 浏览器出现 `504 Gateway Timeout` | 宿主机或容器内 Nginx 的 `proxy_read_timeout` 仍是默认值 |
| 日志出现 `ENOENT` 或 Windows 盘符路径 | 正在复用本地数据库中的旧素材记录，应在服务器重新上传 |
| `/media/...` 返回网站首页 HTML | `/media` 被 SPA 路由捕获，检查两层 Nginx 代理顺序 |
| 视频上传返回 400 | 当前功能强制要求视频不超过 15 秒 |
| 素材被隐私或真人检测拦截 | 属于火山平台内容审核，不是公网 URL 配置问题 |

## 9. 上线前最终检查表

- [ ] `.env` 中不再存在 `trycloudflare.com`
- [ ] `PUBLIC_MEDIA_BASE_URL=https://正式域名/media`
- [ ] `ARK_PROJECT_NAME=jingchuang`
- [ ] Ark API Key 与火山 AK/SK 属于可共享资产的同一账号/项目
- [ ] 域名 DNS、HTTPS 证书和公网 `443` 正常
- [ ] `/media` 可匿名返回真实媒体文件
- [ ] 两层 Nginx 的 API 超时已提高到 300 秒
- [ ] `docker compose exec backend npm run db:init` 成功
- [ ] `jingchuang_ai_media` 数据卷存在且不会被 `down -v` 删除
- [ ] 模型接口返回 `configured: true`
- [ ] 新上传资产的 `public_url` 使用正式域名
- [ ] 新资产最终得到 `active` 状态和 `asset://`
- [ ] 视频换脸或动作迁移至少完成一次生产环境端到端测试
