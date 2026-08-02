#!/bin/bash

# 停止所有通知机器人
echo "Stopping all notification bots..."

# 遍历所有机器人目录并停止它们
for bot_dir in ./bots/*; do
    if [ -d "$bot_dir" ]; then
        bot_name=$(basename "$bot_dir")
        echo "Stopping bot: $bot_name"
        # 假设每个机器人都有一个停止命令
        # 这里可以根据实际情况修改停止命令
        pkill -f "$bot_name" || echo "No running bot found for $bot_name"
    fi
done

echo "All notification bots have been stopped."