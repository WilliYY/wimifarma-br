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

declare -A checksum_files=()
checksum_count=0
checksum_pattern='^[0-9a-f]{64}  (database\.dump|uploads\.tar\.gz|app\.env)$'
while IFS= read -r checksum || [[ -n $checksum ]]; do
  if [[ ! $checksum =~ $checksum_pattern ]]; then
    echo 'Entrada invalida em SHA256SUMS.' >&2
    exit 1
  fi
  file_name="${BASH_REMATCH[1]}"
  if [[ ${checksum_files[$file_name]+present} ]]; then
    echo "Entrada duplicada em SHA256SUMS: $file_name" >&2
    exit 1
  fi
  checksum_files[$file_name]=1
  ((checksum_count += 1))
done < "$backup_dir/SHA256SUMS"

if ((checksum_count != 3)); then
  echo 'SHA256SUMS deve conter os tres arquivos do backup.' >&2
  exit 1
fi

(
  cd "$backup_dir"
  sha256sum --check --strict SHA256SUMS
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
