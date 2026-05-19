#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

SQL_FILE="${1:-/home/www/jingchuang_ai.sql}"

if [[ ! -f "$SQL_FILE" ]]; then
  echo "SQL file not found: $SQL_FILE"
  exit 1
fi

if [[ ! -f .env ]]; then
  echo ".env is missing"
  exit 1
fi

DOCKER_BIN="${DOCKER_BIN:-}"
if [[ -z "$DOCKER_BIN" ]]; then
  if command -v docker >/dev/null 2>&1; then
    DOCKER_BIN="$(command -v docker)"
  elif [[ -x /snap/bin/docker ]]; then
    DOCKER_BIN="/snap/bin/docker"
  else
    echo "docker command not found"
    exit 1
  fi
fi

set -a
source .env
set +a

DB_NAME="${DB_NAME:-jingchuang_ai}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-}"
BACKUP_FILE="${ROOT_DIR}/backup-before-import-$(date +%Y%m%d-%H%M%S).sql"

if [[ -z "$MYSQL_ROOT_PASSWORD" ]]; then
  echo "MYSQL_ROOT_PASSWORD is empty in .env"
  exit 1
fi

echo "Starting Compose services..."
"$DOCKER_BIN" compose up -d

echo "Waiting for MySQL to become healthy..."
for attempt in {1..30}; do
  status="$("$DOCKER_BIN" compose ps --format json 2>/dev/null | grep -o '"health":"[^"]*"' | head -n 1 | cut -d: -f2 | tr -d '"')"
  if [[ "$status" == "healthy" ]]; then
    break
  fi
  sleep 2
done

echo "Backing up current $DB_NAME to $BACKUP_FILE ..."
"$DOCKER_BIN" compose exec -T mysql sh -c "mysqldump -uroot -p\"\$MYSQL_ROOT_PASSWORD\" \"$DB_NAME\"" > "$BACKUP_FILE" || true

echo "Recreating database $DB_NAME ..."
"$DOCKER_BIN" compose exec -T mysql sh -c "mysql -uroot -p\"\$MYSQL_ROOT_PASSWORD\" -e 'DROP DATABASE IF EXISTS \`$DB_NAME\`; CREATE DATABASE \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'"

echo "Importing $SQL_FILE into $DB_NAME..."
cat "$SQL_FILE" | "$DOCKER_BIN" compose exec -T mysql sh -c "mysql -uroot -p\"\$MYSQL_ROOT_PASSWORD\" \"$DB_NAME\""

echo "Running schema initialization..."
"$DOCKER_BIN" compose exec backend npm run db:init

echo "Done."
echo "Verify with: curl -i http://127.0.0.1:${FRONTEND_PORT:-8088}/api/auth/me"
