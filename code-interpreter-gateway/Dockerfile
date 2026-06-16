FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-pip python3-venv \
      build-essential \
      libxml2-dev libxslt1-dev \
      libjpeg-dev zlib1g-dev libfreetype6-dev libpng-dev \
      bash ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
  && pip install --no-cache-dir -r requirements.txt

COPY deps/package.json /opt/user-deps/package.json
RUN cd /opt/user-deps && npm install --omit=dev --no-audit --no-fund
ENV NODE_PATH=/opt/user-deps/node_modules

# Waldemiro: engine de moodboard de produtos chamado pelo code interpreter (import waldemiro).
COPY waldemiro.py /opt/user-deps/waldemiro.py
ENV PYTHONPATH=/opt/user-deps

COPY package*.json ./
RUN npm ci --omit=dev

COPY dist/ ./dist/

EXPOSE 8080

CMD ["node", "dist/index.js"]
