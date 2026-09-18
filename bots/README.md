# Notification Manager Bots

This directory contains the runtime configuration directories managed by Notification Manager.

## Bot Example

The `bot-example` directory is the skeleton copied when a bot is created.

### Files

- **config.example.yml**: Public template for manager settings such as `auto_start`.

- **config.yml**: Local manager settings. This file is generated during deployment and is not committed.

- **aio-config.yml**: Local AIO task/channel configuration. It can contain cookies and credentials and is not committed.

- **bot.py** and **requirements.txt**: Legacy example files. Notification Manager does not execute them.

## Usage

Bots are started by the backend with `aio-dynamic-push/main.py`. Use the web interface to create bots and edit their AIO configuration instead of running `bot.py` directly.
