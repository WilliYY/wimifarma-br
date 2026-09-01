#!/usr/bin/env bash
set -Eeuo pipefail

backup_dir="${1:-}"

if [[ -z "$backup_dir" || ! -d "$backup_dir" ]]; then
  echo "Uso: $0 /home/ubuntu/backups/wimifarma-br/daily/AAAAmmddTHHMMSSZ" >&2
  exit 1
fi

for file_name in database.dump uploads.tar.gz app.env SHA256SUMS; do
  test -s "$backup_dir/$file_name" || {
    echo "Arquivo ausente ou vazio: $file_name" >&2
    exit 1
  }
done

(
  cd "$backup_dir"
  sha256sum --check SHA256SUMS
)

docker run --rm \
  -v "$backup_dir:/backup:ro" \
  postgres:17-alpine \
  pg_restore --list /backup/database.dump >/dev/null

docker run --rm \
  -v "$backup_dir:/backup:ro" \
  postgres:17-alpine \
  tar -tzf /backup/uploads.tar.gz >/dev/null

echo "Backup valido: $backup_dir"
