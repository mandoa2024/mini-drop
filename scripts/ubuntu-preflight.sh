#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

command -v docker >/dev/null 2>&1 || fail "Docker is not installed"
docker compose version >/dev/null 2>&1 ||
  fail "Docker Compose v2 is not available"
docker info >/dev/null 2>&1 ||
  fail "Docker daemon is unavailable or the current user lacks permission"

case "$(uname -s)" in
  Linux) ;;
  *) fail "Mini-Drop requires Linux" ;;
esac

[[ -r /proc/sys/kernel/perf_event_paranoid ]] ||
  fail "kernel.perf_event_paranoid is unavailable"
[[ -d /sys/kernel/tracing || -d /sys/kernel/debug/tracing ]] ||
  fail "kernel tracing filesystem is unavailable"

available_kb="$(df -Pk . | awk 'NR == 2 {print $4}')"
if [[ "$available_kb" -lt 10485760 ]]; then
  echo "WARNING: less than 10 GB of free disk space is available" >&2
fi

echo "Preflight passed"
echo "Kernel: $(uname -r)"
echo "perf_event_paranoid: $(cat /proc/sys/kernel/perf_event_paranoid)"
echo "Docker: $(docker version --format '{{.Server.Version}}')"
echo "Compose: $(docker compose version --short)"
