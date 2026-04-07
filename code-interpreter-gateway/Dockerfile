FROM node:20-slim

WORKDIR /app

# Install runtimes for USE_LOCAL_EXEC mode
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    bash \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --production

COPY dist/ ./dist/

EXPOSE 8080

CMD ["node", "dist/index.js"]
