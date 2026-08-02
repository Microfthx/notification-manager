import yaml
import logging
import signal
import time
from pathlib import Path


def format_bot_name(raw_name: str) -> str:
    return ' '.join(part[:1].upper() + part[1:] for part in raw_name.replace('_', '-').split('-') if part)

class BotExample:
    def __init__(self, config_file):
        self.bot_name = format_bot_name(Path(__file__).resolve().parent.name)
        self.config = self.load_config(config_file)
        self.logger = self.setup_logger()
        self.running = True

    def load_config(self, config_file):
        with open(config_file, 'r') as file:
            return yaml.safe_load(file)

    def setup_logger(self):
        logger = logging.getLogger(self.bot_name)
        logger.handlers.clear()
        logger.propagate = False
        handler = logging.StreamHandler()
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        return logger

    def run(self):
        self.logger.info(f"{self.bot_name} is starting...")
        self.logger.info(f"{self.bot_name} is running...")
        signal.signal(signal.SIGTERM, self._handle_stop)
        signal.signal(signal.SIGINT, self._handle_stop)
        while self.running:
            time.sleep(1)

    def stop(self):
        self._handle_stop(None, None)

    def _handle_stop(self, signum, frame):
        if self.running:
            self.running = False
            self.logger.info(f"{self.bot_name} is stopping...")

if __name__ == "__main__":
    bot = BotExample('config.yml')
    bot.run()
