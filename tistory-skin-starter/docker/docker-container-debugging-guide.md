---
title: Docker 컨테이너 디버깅 가이드 - 안 뜨는 서비스 10분 안에 원인 찾기
author: JUNG YoungKyun
date: 2026-04-17
category: docker
layout: post
---

컨테이너가 "실행은 되는데 서비스가 안 뜨는" 상황은 개발/운영 모두 자주 만납니다.
이 글은 디버깅 순서를 빠르게 정리한 체크리스트입니다.

## 1) 상태부터 확인

```bash
docker ps -a
```

- `Exited`면 바로 로그 확인
- `Restarting`이면 시작 스크립트/환경변수 오류를 의심

## 2) 로그 확인

```bash
docker logs <container-name>
docker logs -f <container-name>
```

가장 먼저 볼 것:

- 포트 충돌
- 환경변수 누락
- DB 연결 실패
- 파일/권한 에러

## 3) 내부 진입해서 확인

```bash
docker exec -it <container-name> sh
```

체크 포인트:

- 앱 빌드 산출물이 실제 존재하는지
- 실행 명령이 이미지와 맞는지
- 런타임 env가 주입됐는지

## 4) 포트 매핑 확인

```bash
docker port <container-name>
```

앱이 컨테이너에서 `0.0.0.0`으로 listen 중인지도 중요합니다.
`127.0.0.1` 바인딩이면 외부 접근이 안 됩니다.

## 5) 네트워크 확인

```bash
docker network ls
docker network inspect <network-name>
```

서비스 간 통신은 서비스명 DNS를 사용합니다.
예: `postgres://user:pass@db:5432/app`

## 6) 이미지/컨테이너 불일치 확인

로컬에서 코드 고쳤는데 반영이 안 될 때는 아래를 점검합니다.

- 새 이미지로 다시 빌드했는가?
- compose가 이전 캐시를 쓰고 있지 않은가?

```bash
docker compose up -d --build
```

## 마무리

Docker 디버깅은 "감"이 아니라 순서입니다.
상태 -> 로그 -> 내부 진입 -> 포트 -> 네트워크 순서만 지켜도 대부분 빠르게 해결됩니다.

## 추천 태그

`docker`, `debugging`, `container`, `docker-logs`, `devops`, `backend`, `infra`, `장애대응`
