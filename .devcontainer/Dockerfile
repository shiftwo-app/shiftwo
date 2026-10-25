FROM node:22-slim

# 必要最小限のパッケージのみインストール
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@12.15.0

# ワークスペースディレクトリを作成
WORKDIR /workspace

# タイムゾーンを設定
ENV TZ=Asia/Tokyo