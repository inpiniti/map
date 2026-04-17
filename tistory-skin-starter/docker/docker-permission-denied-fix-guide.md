---
title: Docker permission denied 해결 가이드 - 볼륨 권한 문제 실전 정리
author: JUNG YoungKyun
date: 2026-04-17
category: docker
layout: post
---

Docker에서 가장 스트레스 받는 에러 중 하나가 permission denied입니다.
특히 볼륨 마운트와 사용자 권한이 섞이면 자주 터집니다.

## 자주 발생하는 케이스

- 컨테이너가 로그/업로드 파일을 못 씀
- node_modules, build 폴더 생성 실패
- Linux 서버에서만 권한 에러 재현

## 1) 현재 사용자 확인

```bash
id
```

컨테이너 내부에서도 확인합니다.

```bash
docker exec -it <container-name> sh
id
```

## 2) Dockerfile에서 사용자 명시

```dockerfile
RUN addgroup -S app && adduser -S app -G app
USER app
```

보안상 root 실행을 피하는 데도 도움이 됩니다.

## 3) 호스트 볼륨 권한 맞추기

Linux 기준:

```bash
sudo chown -R $USER:$USER ./data
sudo chmod -R 755 ./data
```

무작정 777을 주는 방식은 보안상 권장하지 않습니다.

## 4) compose에서 user 지정

```yaml
services:
  app:
    user: '1000:1000'
```

호스트 UID/GID와 맞추면 권한 충돌을 줄일 수 있습니다.

## 5) 자주 쓰는 점검 명령

```bash
docker inspect <container-name>
ls -al
```

mount 경로와 실제 소유자(uid/gid)를 함께 확인하세요.

## 마무리

권한 문제는 코드 버그가 아니라 "실행 환경 설계" 문제입니다.
사용자/볼륨/파일 소유권을 초기에 맞춰두면 반복 장애를 크게 줄일 수 있습니다.

## 추천 태그

`docker`, `permission-denied`, `volume`, `linux`, `devops`, `infra`, `backend`, `운영이슈`
