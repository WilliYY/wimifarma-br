#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf 'Uso: bash %s AAAAMMDDTHHMMSSZ\n' "$0"
  printf 'Configure RESTIC_REPOSITORY ou RESTIC_REPOSITORY_FILE para o repositorio externo ja inicializado.\n'
}

if [[ $# == 1 && ( $1 == -h || $1 == --help ) ]]; then
  usage
  exit 0
fi

if [[ $# != 1 || ! $1 =~ ^[0-9]{8}T[0-9]{6}Z$ ]]; then
  usage >&2
  exit 2
fi

if [[ -z ${RESTIC_REPOSITORY:-} && -z ${RESTIC_REPOSITORY_FILE:-} ]]; then
  usage >&2
  exit 2
fi

for executable in restic mktemp ln; do
  if ! command -v "$executable" >/dev/null; then
    printf 'Comando necessario: %s\n' "$executable" >&2
    exit 2
  fi
done

backup_root=${BACKUP_ROOT:-/home/ubuntu/backups/wimifarma-br/daily}
backup_dir="$backup_root/$1"
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)

if [[ ! -d $backup_dir || -L $backup_dir ]]; then
  printf 'Diretorio de backup concluido indisponivel: %s\n' "$backup_dir" >&2
  exit 1
fi

files=(database.dump uploads.tar.gz app.env SHA256SUMS)
stage_dir=
cleanup() {
  local status=$?
  if [[ -n $stage_dir ]]; then
    if ! (cd -- "$stage_dir" && rm -f -- "${files[@]}") || ! rmdir -- "$stage_dir"; then
      printf 'Falha ao remover a preparacao local: %s\n' "$stage_dir" >&2
      if [[ $status == 0 ]]; then
        status=1
      fi
    fi
  fi
  exit "$status"
}

umask 077
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
stage_dir=$(mktemp -d -- "$backup_root/.offsite-XXXXXXXX")

# A retencao remove apenas diretorios com timestamp. Links completos mantem os
# arquivos disponiveis durante a verificacao e a copia, mesmo apos a remocao local.
for file_name in "${files[@]}"; do
  path="$backup_dir/$file_name"
  if [[ ! -f $path || -L $path ]]; then
    printf 'Arquivo de backup regular indisponivel: %s\n' "$file_name" >&2
    exit 1
  fi
  ln -P -- "$path" "$stage_dir/$file_name"
done

bash "$script_dir/verify-wimifarma-br-backup.sh" "$stage_dir"

if (cd -- "$stage_dir" && restic backup --tag wimifarma-br --tag "$1" -- "${files[@]}"); then
  printf 'Copia cifrada concluida para o backup %s.\n' "$1"
else
  status=$?
  if [[ $status == 3 ]]; then
    printf 'O Restic registrou um snapshot incompleto para o backup %s.\n' "$1" >&2
  else
    printf 'Falha na copia cifrada do backup %s (Restic %s).\n' "$1" "$status" >&2
  fi
  exit "$status"
fi
