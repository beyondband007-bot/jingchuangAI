# 部署指南

本项目可以在本地用 Docker Compose 跑成接近服务器的形态。目标是让后续迁移到服务器时，主要只需要复制 `.env`、数据库数据和媒体存储数据。

## 服务组成

- `mysql`：MySQL 8.4，使用命名卷保存数据库数据。
- `backend`：Node/Express API，在 Compose 内部网络中监听 `3006` 端口。
- `frontend`：Nginx 托管 Vite 构建产物，并把 `/api`、`/media`、`/health` 代理到 `backend`。

## 本地准生产启动

在仓库根目录执行：

```powershell
Copy-Item .env.production.example .env
docker compose -f backend/docker-compose.yml down
docker compose up --build -d
docker compose exec backend npm run db:init
docker compose exec backend npm run db:check
```

打开 `http://127.0.0.1:8088`。

常用检查命令：

```powershell
docker compose ps
curl http://127.0.0.1:8088/health
```

前端镜像默认以 `VITE_API_BASE_URL=` 构建，浏览器请求会走同源地址。Nginx 会把 `/api` 和 `/media` 代理到后端容器。

## 日常本地开发

原有开发方式仍然可用：

```powershell
docker compose -f backend/docker-compose.yml up -d
cd backend
npm run dev
cd ..\frontend-app
npm run dev
```

在这种模式下，如果没有设置 `VITE_API_BASE_URL`，前端会回退请求 `http://<当前访问域名>:3006`。

## 环境变量

以 `.env.production.example` 作为服务器环境变量模板。复制为 `.env` 后，至少需要配置：

- `MYSQL_ROOT_PASSWORD`：改成长且随机的数据库 root 密码。
- 供应商密钥：例如 `KIE_API_KEY`、`MINIMAX_API_KEY`、`MINIMAX_GROUP_ID`、`QWEN_API_KEY`。
- `FRONTEND_BIND_ADDRESS=0.0.0.0`：服务器上如果要直接对外暴露前端服务，使用这个值。
- `VITE_API_BASE_URL=`：保持为空表示使用同源反向代理模式。

不要提交 `.env`。

## 持久化数据

Compose 使用命名卷保存持久化数据：

- `jingchuang_ai_mysql_data`：MySQL 数据。
- `jingchuang_ai_media`：上传文件和生成文件，通过 `/media` 对外访问。

重建容器不会删除这些卷。谨慎使用 `docker compose down -v`，它会删除数据卷。

## 数据库初始化

新数据库只需要初始化一次：

```powershell
docker compose exec backend npm run db:init
```

生产数据上不要执行破坏性重置命令。当前初始化脚本会创建缺失表，并执行兼容性的增量字段调整。

## 备份与恢复

备份数据库：

```powershell
docker compose exec mysql sh -c "mysqldump -uroot -p$MYSQL_ROOT_PASSWORD $MYSQL_DATABASE" > jingchuang_ai.sql
```

恢复数据库：

```powershell
Get-Content .\jingchuang_ai.sql | docker compose exec -T mysql sh -c "mysql -uroot -p$MYSQL_ROOT_PASSWORD $MYSQL_DATABASE"
```

备份媒体文件：

```powershell
docker run --rm -v jingchuang_ai_media:/data -v ${PWD}:/backup alpine tar czf /backup/jingchuang_ai_media.tgz -C /data .
```

恢复媒体文件：

```powershell
docker run --rm -v jingchuang_ai_media:/data -v ${PWD}:/backup alpine sh -c "tar xzf /backup/jingchuang_ai_media.tgz -C /data"
```

## 服务器迁移清单

1. 在服务器安装 Docker 和 Docker Compose。
2. 把仓库代码复制到服务器。
3. 复制 `.env.production.example` 为 `.env`，填写生产密钥和密码。
4. 执行 `docker compose up --build -d` 启动服务。
5. 如果是新数据库，执行 `docker compose exec backend npm run db:init`。
6. 如果迁移已有数据，恢复 MySQL 备份和媒体文件备份。
7. 将域名或外部反向代理指向前端服务。
8. 验证 `http://<服务器地址>:<FRONTEND_PORT>/health`、登录、生成历史、上传和 `/media` 播放。
