#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$PROJECT_DIR/.env"

read_env() {
  local key="$1"
  local fallback="$2"
  local value=""

  if [[ -f "$ENV_FILE" ]]; then
    value="$(sed -n "s/^${key}=//p" "$ENV_FILE" | tail -n 1)"
  fi
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

for command_name in git docker realpath; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Error: required command is not installed: $command_name" >&2
    exit 1
  fi
done

if ! docker compose version >/dev/null 2>&1; then
  echo "Error: Docker Compose v2 is required (docker compose)." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$PROJECT_DIR/.env.example" "$ENV_FILE"
  sed -i "s/^NOTIFICATION_MANAGER_UID=.*/NOTIFICATION_MANAGER_UID=$(id -u)/" "$ENV_FILE"
  sed -i "s/^NOTIFICATION_MANAGER_GID=.*/NOTIFICATION_MANAGER_GID=$(id -g)/" "$ENV_FILE"
  echo "Created $ENV_FILE with the current UID/GID."
fi

AIO_REPOSITORY="$(read_env AIO_REPOSITORY git@github.com:Microfthx/aio-dynamic-push-personal.git)"
AIO_PROJECT_DIR="$(resolve_path "$(read_env AIO_PROJECT_DIR ../aio-dynamic-push-master)")"
NAPCAT_CONFIG_DIR="$(resolve_path "$(read_env NAPCAT_CONFIG_DIR ./data/napcat-config)")"

if [[ ! -d "$AIO_PROJECT_DIR/.git" ]]; then
  if [[ -e "$AIO_PROJECT_DIR" ]] && [[ -n "$(find "$AIO_PROJECT_DIR" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]]; then
    echo "Error: AIO_PROJECT_DIR exists but is not an empty Git repository: $AIO_PROJECT_DIR" >&2
    exit 1
  fi
  rm -rf "$AIO_PROJECT_DIR"
  git clone "$AIO_REPOSITORY" "$AIO_PROJECT_DIR"
fi

if [[ ! -f "$AIO_PROJECT_DIR/main.py" || ! -f "$AIO_PROJECT_DIR/config.example.yml" ]]; then
  echo "Error: invalid AIO project at $AIO_PROJECT_DIR" >&2
  exit 1
fi

mkdir -p "$PROJECT_DIR/logs" "$PROJECT_DIR/data/weibo-profile" "$NAPCAT_CONFIG_DIR"

if [[ ! -f "$PROJECT_DIR/bots/bot-example/config.yml" ]]; then
  cp "$PROJECT_DIR/bots/bot-example/config.example.yml" "$PROJECT_DIR/bots/bot-example/config.yml"
fi

echo "AIO project: $AIO_PROJECT_DIR"
if [[ "$NAPCAT_CONFIG_DIR" == "$PROJECT_DIR/data/napcat-config" ]]; then
  echo "NapCat: optional integration is disabled until NAPCAT_CONFIG_DIR is configured."
else
  echo "NapCat config: $NAPCAT_CONFIG_DIR"
fi

cd "$PROJECT_DIR"
docker compose config --quiet
docker compose up -d --build
docker compose ps

echo "Notification Manager is available at http://localhost:10010"
