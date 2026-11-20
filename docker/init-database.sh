#!/bin/sh
set -eu

# The app owns its database but cannot create roles/databases or act as a superuser.
psql --set=ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=app_user="$OBSERVE_DB_USER" --set=app_password="$OBSERVE_DB_PASSWORD" --set=app_database="$OBSERVE_DB_NAME" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD %L', :'app_user', :'app_password') \gexec
SELECT format('ALTER DATABASE %I OWNER TO %I', :'app_database', :'app_user') \gexec
SQL
