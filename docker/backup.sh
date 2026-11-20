#!/bin/sh
set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$project_dir"
backup_file=${1:-backups/observed-$(date -u +%Y%m%dT%H%M%SZ).dump}
if [ -e "$backup_file" ] || [ -L "$backup_file" ]; then
  printf '%s\n' "Refusing to replace $backup_file." >&2
  exit 1
fi
umask 077
mkdir -p "$(dirname -- "$backup_file")"
backup_tmp=$(mktemp "$backup_file.tmp.XXXXXX")
trap 'rm -f "$backup_tmp"' EXIT HUP INT TERM
sh docker/compose.sh exec -T database sh -c \
  'exec pg_dump --format=custom --no-owner --no-acl --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' > "$backup_tmp"
# Publish only a complete backup, refusing to replace an existing destination.
ln "$backup_tmp" "$backup_file"
printf '%s\n' "Database backup written to $backup_file. Keep the matching encryption key separately."
