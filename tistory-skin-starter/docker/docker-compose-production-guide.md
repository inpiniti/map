---
title: Docker Compose 운영 배포 패턴 - 개발용과 운영용을 분리하는 방법
author: JUNG YoungKyun
date: 2026-04-17
category: docker
layout: post
---

Compose를 개발용 그대로 운영에 쓰면 언젠가 문제가 터집니다.
이번 글은 개발/운영 파일 분리 패턴을 중심으로 정리합니다.

## 1) 파일 분리 전략

- compose.yaml: 공통 정의
- compose.dev.yaml: 볼륨 마운트, 핫리로드
- compose.prod.yaml: 고정 이미지, 재시작 정책, 리소스 제한

## 2) 실행 예시

개발:

```bash
docker compose -f compose.yaml -f compose.dev.yaml up -d
```

운영:

```bash
docker compose -f compose.yaml -f compose.prod.yaml up -d
```

## 3) 운영에서 꼭 넣을 항목

- `restart: always` 또는 `unless-stopped`
- healthcheck
- 로그 로테이션 옵션
- secrets/env 파일 분리

예:

```yaml
services:
  api:
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/health']
      interval: 10s
      timeout: 3s
      retries: 5
```

## 4) 개발 옵션이 운영에 섞이면 안 되는 이유

- 소스 볼륨 마운트로 보안/성능 이슈
- debug 플래그 노출
- 불안정한 로컬 의존성 포함

## 5) 배포 체크리스트

- 환경변수는 운영용으로 분리했는가?
- 이미지 태그가 고정되어 있는가?
- 롤백 가능한 이전 태그가 남아 있는가?

## 마무리

Compose는 개발 전용 도구가 아닙니다.
운영에서 쓰려면 파일 분리와 정책 분리를 반드시 적용해야 안정성이 올라갑니다.

## 추천 태그

`docker`, `docker-compose`, `production`, `devops`, `infra`, `deploy`, `backend`, `운영패턴`
