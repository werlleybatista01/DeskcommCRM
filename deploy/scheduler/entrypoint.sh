#!/bin/sh
set -eu

: "${CRM_INTERNAL_URL:?CRM_INTERNAL_URL is required}"
: "${INTERNAL_CRON_SECRET:?INTERNAL_CRON_SECRET is required}"

case "$CRM_INTERNAL_URL" in
  http://*) ;;
  *) echo "CRM_INTERNAL_URL must use the private HTTP network" >&2; exit 1 ;;
esac

if ! printf '%s' "$INTERNAL_CRON_SECRET" | grep -Eq '^[0-9a-fA-F]{64}$'; then
  echo "INTERNAL_CRON_SECRET must be a 64-character hexadecimal value" >&2
  exit 1
fi

umask 077
{
  printf 'CRM_INTERNAL_URL=%s\n' "$CRM_INTERNAL_URL"
  printf 'INTERNAL_CRON_SECRET=%s\n' "$INTERNAL_CRON_SECRET"
} > /run/deskcomm-scheduler.env

exec crond -f -l 2
