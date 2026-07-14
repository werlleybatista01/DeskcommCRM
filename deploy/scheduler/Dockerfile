FROM alpine:3.22

RUN apk add --no-cache ca-certificates curl

COPY deploy/scheduler/run-cron /usr/local/bin/run-cron
COPY deploy/scheduler/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY deploy/scheduler/crontab /etc/crontabs/root

RUN chmod 0755 /usr/local/bin/run-cron /usr/local/bin/entrypoint.sh \
    && chmod 0600 /etc/crontabs/root

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD pidof crond >/dev/null || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
