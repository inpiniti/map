---
title: Dockerfile 작성법 - Node.js 앱을 컨테이너로 배포하는 가장 쉬운 방법
author: JUNG YoungKyun
date: 2026-04-17
category: docker
layout: post
---

Node.js 프로젝트를 Docker로 옮길 때 가장 먼저 부딪히는 것이 Dockerfile입니다.
이 글에서는 실무에서 많이 쓰는 형태로 Dockerfile을 작성해봅니다.

## 1) 기본 Node.js Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000
CMD ["npm", "run", "start"]
```

핵심 포인트:

- `node:20-alpine`: 경량 베이스 이미지
- `WORKDIR /app`: 작업 경로 고정
- `COPY package*.json` 후 `npm ci`: 레이어 캐시 활용
- `EXPOSE 3000`: 문서적 포트 선언

## 2) 이미지 빌드/실행

```bash
docker build -t my-node-app .
docker run --name my-node-app -p 3000:3000 my-node-app
```

브라우저에서 `http://localhost:3000`으로 확인할 수 있습니다.

## 3) .dockerignore 꼭 만들기

빌드 속도와 이미지 품질에 매우 중요합니다.

`.dockerignore`

```gitignore
node_modules
npm-debug.log
.git
.gitignore
Dockerfile
README.md
.env
```

## 4) 개발/운영 CMD 분리

실무에서는 환경별 실행 명령을 분리해두는 것이 좋습니다.

```dockerfile
CMD ["npm", "run", "start:prod"]
```

개발 환경은 `docker compose`에서 override하는 방식이 관리하기 편합니다.

## 5) Multi-stage build (프론트엔드/Next/Vite에 유용)

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
EXPOSE 4173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]
```

빌드 전용 단계와 실행 전용 단계를 분리하면 이미지 용량이 눈에 띄게 줄어듭니다.

## 6) 자주 하는 실수

- `npm install`만 쓰고 lockfile을 무시함
- `COPY . .`를 너무 일찍 실행해서 캐시가 매번 깨짐
- `.env`를 이미지에 포함해 비밀값 유출 위험 발생

## 마무리

Dockerfile의 핵심은 단순합니다.
작업 디렉터리 고정, 의존성 레이어 캐싱, 불필요한 파일 제외, 빌드/실행 단계 분리입니다.
이 네 가지만 지켜도 배포 안정성이 크게 올라갑니다.

## 추천 태그

`docker`, `dockerfile`, `nodejs`, `backend`, `frontend`, `multistage-build`, `devops`, `배포자동화`