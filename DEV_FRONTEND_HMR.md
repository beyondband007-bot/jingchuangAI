# Frontend Hot Reload

Use the local Vite dev server for everyday frontend work. This avoids rebuilding or restarting the Docker frontend container after each code change.

## Recommended Local Workflow

Keep the existing Docker stack running for backend, database, and the production-like static preview:

```powershell
docker compose up -d mysql backend frontend
```

Start the frontend dev server locally:

```powershell
cd F:\jingchuangAI\frontend-app
npm run dev -- --port 5173
```

Open:

```text
http://127.0.0.1:5173
```

Frontend edits under `frontend-app/src` hot reload automatically in this dev entry.

## How Requests Are Proxied

The Vite dev server proxies these paths to the existing Docker frontend entry at `http://127.0.0.1:8088`:

- `/api`
- `/media`
- `/health`

The Docker frontend Nginx then forwards those requests to the backend service inside Docker. This keeps local frontend development working even when the backend port `3006` is not exposed directly to the host.

To override the proxy target:

```powershell
$env:VITE_DEV_PROXY_TARGET="http://127.0.0.1:3006"
npm run dev -- --port 5173
```

## Production-Like Preview

`http://127.0.0.1:8088` still serves compiled static files through Nginx. It is useful for previewing the Docker build, but it does not hot reload source changes.

Use it when you specifically need to verify the built output:

```powershell
cd F:\jingchuangAI\frontend-app
npm run build
```

Then rebuild or restart the Docker frontend service as needed.

## Optional Docker-Based HMR

If you want Vite itself to run inside Docker, use the dev compose override:

```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d mysql backend frontend-dev
```

Open:

```text
http://127.0.0.1:5173
```

Stop only the Docker dev frontend:

```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml stop frontend-dev
```

This is optional. The recommended path is the local Vite workflow above.
