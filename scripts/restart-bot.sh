#!/bin/bash

# Check if the bot name is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <bot_name>"
  exit 1
fi

BOT_NAME=$1

# Stop the bot
echo "Stopping the bot: $BOT_NAME"
pkill -f "$BOT_NAME"

# Wait for a moment to ensure the bot has stopped
sleep 2

# Start the bot again
echo "Starting the bot: $BOT_NAME"
if [ -f "bots/$BOT_NAME/bot.py" ]; then
  nohup python3 "bots/$BOT_NAME/bot.py" > "logs/$BOT_NAME.log" 2>&1 &
else
  echo "bot.py not found for $BOT_NAME"
  exit 1
fi

echo "Bot $BOT_NAME has been restarted."
