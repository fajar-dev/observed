#!/bin/sh
set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$project_dir"
settings_file=${OBSERVE_ENV_FILE:-.env.docker}
if [ ! -f "$settings_file" ]; then
  printf '%s\n' "Missing $settings_file. Run sh docker/setup.sh first." >&2
  exit 1
fi
exec docker compose --env-file "$settings_file" -f compose.yaml "$@"
