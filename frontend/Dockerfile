FROM node:20-bookworm-slim

WORKDIR /app

ENV PORT=10010

COPY package.json ./
COPY package-lock.json ./
RUN npm ci

COPY . .

CMD ["npm", "start"]
