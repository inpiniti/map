---
title: Docker Compose 로컬 개발 세팅 - API + DB를 한 번에 띄우는 방법
author: JUNG YoungKyun
date: 2026-04-17
category: docker
layout: post
---

로컬에서 API, DB, 캐시를 각각 설치해서 맞추는 건 생각보다 피곤합니다.
Docker Compose를 쓰면 필요한 서비스들을 한 파일로 관리할 수 있습니다.

## 1) docker-compose.yml 예시

아래는 Node.js API + PostgreSQL 조합의 기본 예시입니다.

```yaml
services:
  api:
    build: .
    container_name: app-api
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/app
    depends_on:
      - db
    volumes:
      - ./:/app
      - /app/node_modules

  db:
    image: postgres:16-alpine
    container_name: app-db
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=app
    volumes:
      - db_data:/var/lib/postgresql/data

volumes:
  db_data:
```

## 2) 실행/종료 명령어

```bash
# 백그라운드 실행
docker compose up -d

# 로그 확인
docker compose logs -f

# 종료 및 네트워크 정리
docker compose down
```

볼륨까지 정리하고 싶다면:

```bash
docker compose down -v
```

## 3) 서비스 간 통신 포인트

`api`에서 DB에 붙을 때 `localhost`가 아니라 서비스 이름 `db`를 사용해야 합니다.

예:

```text
postgresql://postgres:postgres@db:5432/app
```

Compose 내부 네트워크에서 서비스 이름이 DNS처럼 동작합니다.

## 4) 헬스체크 추가 (권장)

DB가 완전히 뜨기 전에 API가 먼저 실행되면 에러가 날 수 있습니다.
헬스체크를 두면 진단이 쉬워집니다.

```yaml
db:
  image: postgres:16-alpine
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres"]
    interval: 5s
    timeout: 3s
    retries: 10
```

## 5) 개발 모드 팁

- 코드 변경 즉시 반영: `volumes` 마운트 사용
- 환경별 파일 분리: `compose.yaml`, `compose.dev.yaml`, `compose.prod.yaml`
- 비밀값은 `.env` + CI Secret으로 관리

## 마무리

Compose의 장점은 명확합니다.
팀원이 누구든 `docker compose up -d` 한 줄로 동일한 로컬 환경을 바로 시작할 수 있다는 점입니다.

## 추천 태그

`docker`, `docker-compose`, `postgresql`, `nodejs`, `local-dev`, `devops`, `backend`, `개발환경표준화`