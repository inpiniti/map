---
title: Docker 빌드 느릴 때 해결법 - BuildKit과 캐시 최적화 실전
author: JUNG YoungKyun
date: 2026-04-17
category: docker
layout: post
---

CI에서 Docker 빌드가 느리면 개발 속도가 체감될 정도로 떨어집니다.
이 글에서는 체감 효과가 큰 빌드 최적화 방법을 정리합니다.

## 1) BuildKit 활성화

```bash
DOCKER_BUILDKIT=1 docker build -t my-app .
```

BuildKit은 병렬 처리와 캐시 효율이 좋아 빌드 시간을 줄여줍니다.

## 2) Dockerfile 순서 최적화

```dockerfile
COPY package*.json ./
RUN npm ci
COPY . .
```

의존성 설치 레이어를 앞에 두면 코드 변경 시 불필요한 재설치를 피할 수 있습니다.

## 3) 캐시 마운트 활용

```dockerfile
# syntax=docker/dockerfile:1.7
RUN --mount=type=cache,target=/root/.npm npm ci
```

패키지 캐시를 재사용하면 CI 빌드 시간이 크게 단축됩니다.

## 4) 불필요한 빌드 컨텍스트 제거

`.dockerignore`가 작을수록 빌드 시작 속도도 빨라집니다.

```gitignore
.git
node_modules
dist
coverage
*.log
```

## 5) 멀티스테이지로 최종 이미지 경량화

경량 이미지로 푸시 시간이 줄어들고 배포도 빨라집니다.

## 마무리

Docker 빌드 최적화의 핵심은 캐시를 깨지 않게 설계하는 것입니다.
BuildKit + 레이어 전략 + .dockerignore만 잘 써도 CI 시간을 확실히 줄일 수 있습니다.

## 추천 태그

`docker`, `buildkit`, `cache`, `ci-cd`, `dockerfile`, `devops`, `배포자동화`, `성능최적화`
