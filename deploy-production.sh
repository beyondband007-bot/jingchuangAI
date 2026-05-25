#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

DOCKER_BIN="${DOCKER_BIN:-}"
if [[ -z "$DOCKER_BIN" ]]; then
  if command -v docker >/dev/null 2>&1; then
    DOCKER_BIN="$(command -v docker)"
  elif [[ -x /snap/bin/docker ]]; then
    DOCKER_BIN="/snap/bin/docker"
  else
    echo "docker command not found"
    echo "Install Docker first. On Ubuntu Core: sudo snap install docker"
    exit 1
  fi
fi

if [[ ! -f .env ]]; then
  echo ".env is missing"
  echo "Create it from .env.production.example before deploying."
  exit 1
fi

if grep -Eq '^MYSQL_ROOT_PASSWORD=change_me_to_a_long_random_password$' .env; then
  if [[ ! -d /var/lib/docker/volumes/jingchuang_ai_mysql_data/_data ]] && [[ -z "$("$DOCKER_BIN" ps -aq -f name='^jingchuang-ai-mysql$' 2>/dev/null || true)" ]]; then
    echo "Refusing to deploy a new MySQL instance with the default MYSQL_ROOT_PASSWORD placeholder."
    exit 1
  fi
  echo "Warning: keeping existing MySQL password placeholder because the database is already initialized."
fi

"$DOCKER_BIN" compose up --build -d

echo "Waiting for backend to become healthy..."
for attempt in {1..30}; do
  status="$("$DOCKER_BIN" inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' jingchuang-ai-backend 2>/dev/null || true)"
  if [[ "$status" == "healthy" ]]; then
    break
  fi
  sleep 2
done

status="$("$DOCKER_BIN" inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' jingchuang-ai-backend 2>/dev/null || true)"
if [[ "$status" != "healthy" ]]; then
  echo "Backend did not reach healthy state."
  "$DOCKER_BIN" compose logs --tail=120 backend
  exit 1
fi

"$DOCKER_BIN" compose exec backend npm run db:init
"$DOCKER_BIN" compose ps

echo
echo "Deployment finished."
echo "Check local: http://127.0.0.1:${FRONTEND_PORT:-8088}/health"
echo "Check external after host nginx is configured: https://jc.getrueai.com/health"
