#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${1:-}"
PROJECT_NAME="${2:-notification-manager-instance}"

if [[ -z "$ENV_FILE" ]]; then
  echo "Usage: $0 <env-file> [compose-project-name]" >&2
  exit 1
fi

if [[ "$ENV_FILE" != /* ]]; then
  ENV_FILE="$PROJECT_DIR/$ENV_FILE"
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: environment file not found: $ENV_FILE" >&2
  exit 1
fi

read_env() {
  local key="$1"
  local fallback="$2"
  local value
  value="$(sed -n "s/^${key}=//p" "$ENV_FILE" | tail -n 1)"
  printf '%s' "${value:-$fallback}"
}

resolve_path() {
  local value="$1"
  if [[ "$value" = /* ]]; then
    printf '%s' "$value"
  else
    realpath -m "$PROJECT_DIR/$value"
  fi
}

for command_name in docker realpath; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Error: required command is not installed: $command_name" >&2
    exit 1
  fi
done

BOTS_DIR="$(resolve_path "$(read_env BOTS_DIR ./bots)")"
LOGS_DIR="$(resolve_path "$(read_env LOGS_DIR ./logs)")"
DATA_DIR="$(resolve_path "$(read_env DATA_DIR ./data)")"
AIO_PROJECT_DIR="$(resolve_path "$(read_env AIO_PROJECT_DIR ../aio-dynamic-push-master)")"

if [[ ! -f "$AIO_PROJECT_DIR/main.py" || ! -f "$AIO_PROJECT_DIR/config.example.yml" ]]; then
  echo "Error: invalid AIO project at $AIO_PROJECT_DIR" >&2
  exit 1
fi

mkdir -p "$BOTS_DIR/bot-example" "$LOGS_DIR" "$DATA_DIR/weibo-profile" "$DATA_DIR/napcat-config"

for template_file in config.example.yml bot.py requirements.txt; do
  if [[ ! -f "$BOTS_DIR/bot-example/$template_file" ]]; then
    cp "$PROJECT_DIR/bots/bot-example/$template_file" "$BOTS_DIR/bot-example/$template_file"
  fi
done

if [[ ! -f "$BOTS_DIR/bot-example/config.yml" ]]; then
  cp "$PROJECT_DIR/bots/bot-example/config.example.yml" "$BOTS_DIR/bot-example/config.yml"
fi

cd "$PROJECT_DIR"
docker compose --env-file "$ENV_FILE" -p "$PROJECT_NAME" config --quiet
docker compose --env-file "$ENV_FILE" -p "$PROJECT_NAME" up -d --build
docker compose --env-file "$ENV_FILE" -p "$PROJECT_NAME" ps
