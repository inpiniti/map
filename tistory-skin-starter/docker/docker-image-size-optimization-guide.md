---
title: Docker 이미지 용량 줄이기 - 빌드 속도와 배포 속도를 동시에 잡는 법
author: JUNG YoungKyun
date: 2026-04-17
category: docker
layout: post
---

이미지 용량이 커지면 빌드/푸시/배포가 모두 느려집니다.
이 글에서는 바로 효과가 나는 Docker 이미지 최적화 방법을 정리합니다.

## 1) 작은 베이스 이미지 선택

가능하면 `alpine` 계열을 우선 고려합니다.

```dockerfile
FROM node:20-alpine
```

단, 네이티브 빌드 도구가 필요한 프로젝트는 slim/debian 계열이 더 안정적일 수 있습니다.

## 2) Multi-stage build 사용

빌드 도구와 런타임을 분리하면 최종 이미지가 작아집니다.

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/server.js"]
```

## 3) 레이어 캐시를 깨지 않기

`COPY . .`를 먼저 두면 파일 하나 바꿔도 의존성 설치 레이어가 다시 실행됩니다.
아래 순서를 권장합니다.

```dockerfile
COPY package*.json ./
RUN npm ci
COPY . .
```

## 4) .dockerignore 적극 활용

불필요한 파일이 빌드 컨텍스트에 들어가면 빌드가 느려지고 이미지가 커집니다.

```gitignore
node_modules
.git
coverage
dist
.env
*.log
```

## 5) 이미지 분석으로 병목 찾기

```bash
docker image ls
docker history my-node-app
```

`docker history`를 보면 어떤 레이어가 용량을 크게 먹는지 바로 확인할 수 있습니다.

## 6) 런타임 전용 패키지만 설치

Node 기준으로 운영 이미지에서는 devDependencies를 제외합니다.

```bash
npm ci --omit=dev
```

## 7) 보안까지 같이 챙기기

- 최신 LTS 이미지 사용
- 취약점 스캔 도구 활용
- 루트 유저 대신 일반 유저 실행 고려

예:

```dockerfile
RUN addgroup -S app && adduser -S app -G app
USER app
```

## 마무리

이미지 최적화는 성능만의 문제가 아니라 팀 생산성 문제입니다.
작은 이미지 하나가 빌드 시간, CI 비용, 배포 안정성을 동시에 개선해줍니다.

## 추천 태그

`docker`, `dockerfile`, `image-optimization`, `multistage-build`, `devops`, `ci-cd`, `nodejs`, `배포속도`