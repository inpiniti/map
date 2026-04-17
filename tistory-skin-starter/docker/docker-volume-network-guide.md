---
title: Docker 볼륨과 네트워크 정리 - 데이터 유실 없이 안전하게 운영하기
author: JUNG YoungKyun
date: 2026-04-17
category: docker
layout: post
---

Docker를 쓰면서 가장 많이 하는 실수는 "컨테이너 삭제 = 데이터 삭제"를 간과하는 것입니다.
이 글에서는 볼륨과 네트워크 개념을 실무 기준으로 정리합니다.

## 1) 볼륨이 왜 필요한가?

컨테이너는 기본적으로 휘발성입니다.
즉, 컨테이너를 지우면 내부 데이터도 같이 사라집니다.

그래서 DB, 업로드 파일 같은 데이터는 볼륨에 저장해야 합니다.

## 2) Named Volume 사용 예시

```bash
docker volume create postgres_data

docker run -d \
  --name pg \
  -e POSTGRES_PASSWORD=postgres \
  -v postgres_data:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:16-alpine
```

이렇게 하면 컨테이너를 삭제해도 `postgres_data` 볼륨은 유지됩니다.

## 3) Bind Mount와 Volume 차이

- Bind Mount: 호스트 경로를 직접 연결 (`./src:/app/src`)
- Named Volume: Docker가 관리하는 저장소 (`db_data:/var/lib/postgresql/data`)

권장 기준:

- 소스코드: Bind Mount
- DB/영속 데이터: Named Volume

## 4) 네트워크 기초

컨테이너끼리 통신하려면 같은 네트워크에 있어야 합니다.

```bash
docker network create app-net

docker run -d --name db --network app-net postgres:16-alpine
docker run -d --name api --network app-net my-api-image
```

이후 `api` 컨테이너에서는 `db:5432`로 접근할 수 있습니다.

## 5) 점검 명령어

```bash
# 볼륨 확인
docker volume ls

# 특정 볼륨 상세
docker volume inspect postgres_data

# 네트워크 확인
docker network ls

# 특정 네트워크 상세
docker network inspect app-net
```

## 6) 정리할 때 주의

```bash
# 사용하지 않는 리소스 정리
docker system prune
```

`-a`, `--volumes` 옵션은 영향 범위가 큽니다.
데이터 유실 가능성이 있으니 운영/개발 환경에서 구분해서 사용하세요.

## 마무리

Docker 안정성의 핵심은 볼륨과 네트워크입니다.
이 두 가지를 명확히 설계하면 "컨테이너는 지워도 서비스는 안전"한 구조를 만들 수 있습니다.

## 추천 태그

`docker`, `volume`, `network`, `postgresql`, `devops`, `container`, `인프라기초`, `운영팁`