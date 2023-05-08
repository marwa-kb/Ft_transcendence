#!/bin/bash
# wait-for-it.sh: Waits for PostgreSQL to be up and running

set -e

host="$1"
port="$2"
shift 2
cmd="$@"

until nc -z -v -w30 "$host" "$port"; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

>&2 echo "Postgres is up - executing command"
exec $cmd