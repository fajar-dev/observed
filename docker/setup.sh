#!/bin/sh
set -eu

settings_file=${1:-.env.docker}
if [ -e "$settings_file" ]; then
  printf '%s\n' "$settings_file already exists; configuration unchanged."
  exit 0
fi
if ! command -v openssl >/dev/null 2>&1; then
  printf '%s\n' 'Install OpenSSL to generate container credentials.' >&2
  exit 1
fi
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
database_password=$(openssl rand -hex 32)
database_admin_password=$(openssl rand -hex 32)
encryption_key=$(openssl rand -base64 32)
umask 077
# Refuse to replace a file created concurrently by another setup process.
set -C
sed -e "s|^POSTGRES_PASSWORD=$|POSTGRES_PASSWORD=$database_password|" \
    -e "s|^POSTGRES_ADMIN_PASSWORD=$|POSTGRES_ADMIN_PASSWORD=$database_admin_password|" \
    -e "s|^OBSERVE_SECRET_KEY=$|OBSERVE_SECRET_KEY=$encryption_key|" \
    "$script_dir/.env.example" > "$settings_file"
printf '%s\n' "Created $settings_file with unique credentials. Keep this file with your database backups."
