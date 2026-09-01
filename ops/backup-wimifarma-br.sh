#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="${PROJECT_DIR:-/home/ubuntu/projetos/wimifarma-br}"
BACKUP_ROOT="${BACKUP_ROOT:-/home/ubuntu/backups/wimifarma-br/daily}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-wimifarma-br-postgres}"
UPLOADS_VOLUME="${UPLOADS_VOLUME:-wimifarma-br-uploads}"
LOCK_FILE="${LOCK_FILE:-/run/lock/wimifarma-br-backup.lock}"

case "$BACKUP_ROOT" in
  /home/ubuntu/backups/wimifarma-br/*) ;;
  *)
    echo "BACKUP_ROOT fora do diretorio permitido: $BACKUP_ROOT" >&2
    exit 1
    ;;
esac

for command_name in docker flock sha256sum; do
  command -v "$command_name" >/dev/null || {
    echo "Comando obrigatorio ausente: $command_name" >&2
    exit 1
  }
done

test -f "$PROJECT_DIR/.env" || {
  echo "Arquivo .env nao encontrado em $PROJECT_DIR" >&2
  exit 1
}

docker inspect "$POSTGRES_CONTAINER" >/dev/null
docker volume inspect "$UPLOADS_VOLUME" >/dev/null

umask 077
mkdir -p "$BACKUP_ROOT" "$(dirname "$LOCK_FILE")"
chmod 700 "$BACKUP_ROOT"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Outro backup da Wimifarma BR ja esta em execucao."
  exit 0
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
partial_dir="$BACKUP_ROOT/.partial-$timestamp"
backup_dir="$BACKUP_ROOT/$timestamp"

cleanup() {
  rm -rf -- "$partial_dir"
}
trap cleanup ERR INT TERM

mkdir "$partial_dir"

docker exec "$POSTGRES_CONTAINER" sh -c \
  'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --compress=6' \
  > "$partial_dir/database.dump"

docker run --rm \
  -v "$UPLOADS_VOLUME:/source:ro" \
  -v "$partial_dir:/backup" \
  postgres:17-alpine \
  sh -c 'tar -czf /backup/uploads.tar.gz -C /source . && chmod 600 /backup/uploads.tar.gz'

install -m 600 "$PROJECT_DIR/.env" "$partial_dir/app.env"

docker run --rm \
  -v "$partial_dir:/backup:ro" \
  postgres:17-alpine \
  pg_restore --list /backup/database.dump >/dev/null

docker run --rm \
  -v "$partial_dir:/backup:ro" \
  postgres:17-alpine \
  tar -tzf /backup/uploads.tar.gz >/dev/null

(
  cd "$partial_dir"
  sha256sum database.dump uploads.tar.gz app.env > SHA256SUMS
)

mv "$partial_dir" "$backup_dir"
trap - ERR INT TERM

find "$BACKUP_ROOT" \
  -mindepth 1 \
  -maxdepth 1 \
  -type d \
  -name '20??????T??????Z' \
  -mtime "+$RETENTION_DAYS" \
  -exec rm -rf -- {} +

echo "Backup concluido: $backup_dir"
