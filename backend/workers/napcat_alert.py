#!/usr/bin/env python3
import json
import os
import sys

import yaml


def channel_identity(channel):
    ignored = {"name", "enable", "at_qq"}
    stable = {key: value for key, value in channel.items() if key not in ignored}
    return json.dumps(stable, ensure_ascii=False, sort_keys=True, default=str)


def main():
    request = json.loads(sys.stdin.read() or "{}")
    aio_root = os.environ.get("AIO_PROJECT_ROOT") or "/workspace/aio-dynamic-push-master"
    sys.path.insert(0, aio_root)
    import push_channel

    attempted = []
    failed = []
    seen = set()
    for config_path in request.get("configPaths", []):
        try:
            with open(config_path, "r", encoding="utf-8") as config_file:
                config = yaml.safe_load(config_file) or {}
        except Exception as error:
            failed.append(f"{config_path}: {error}")
            continue

        for channel_config in config.get("push_channel", []):
            if not isinstance(channel_config, dict):
                continue
            if not channel_config.get("enable") or channel_config.get("type") == "napcat_qq":
                continue
            identity = channel_identity(channel_config)
            if identity in seen:
                continue
            seen.add(identity)
            name = str(channel_config.get("name") or channel_config.get("type") or "unknown")
            try:
                channel = push_channel.get_push_channel(channel_config)
                channel.push(request.get("title", "NapCat QQ offline"), request.get("content", ""))
                attempted.append(name)
            except Exception as error:
                failed.append(f"{name}: {error}")

    print(json.dumps({"attempted": attempted, "failed": failed}, ensure_ascii=False))
    if not attempted and failed:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
