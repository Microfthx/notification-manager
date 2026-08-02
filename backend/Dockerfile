FROM node:20-bookworm-slim

WORKDIR /usr/src/app

ENV HOME=/tmp
ENV NPM_CONFIG_CACHE=/tmp/.npm

COPY package*.json ./
COPY tsconfig.json ./
COPY aio-requirements.txt ./

RUN apt-get update \
    && apt-get install -y --no-install-recommends chromium fonts-noto-cjk python3 python3-venv \
    && python3 -m venv /opt/aio-venv \
    && /opt/aio-venv/bin/pip install --no-cache-dir -r aio-requirements.txt \
    && rm -rf /var/lib/apt/lists/* \
    && npm ci

COPY ./src ./src
COPY ./workers ./workers

RUN chmod -R a+rX /usr/src/app

EXPOSE 4000

CMD ["npm", "start"]
