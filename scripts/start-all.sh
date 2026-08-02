#!/bin/bash

# 启动所有机器人
echo "Starting all notification bots..."

# 遍历 bots 目录中的每个机器人
for bot in ./bots/*; do
    if [ -d "$bot" ]; then
        bot_name=$(basename "$bot")
        echo "Starting bot: $bot_name"
        # 启动机器人的主程序
        if [ -f "$bot/bot.py" ]; then
            nohup python3 "$bot/bot.py" > "logs/$bot_name.log" 2>&1 &
        else
            echo "Skipping $bot_name: bot.py not found"
        fi
    fi
done

echo "All notification bots have been started."
