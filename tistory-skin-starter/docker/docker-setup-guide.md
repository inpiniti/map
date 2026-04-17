---
title: Docker 입문 가이드 - 설치부터 첫 컨테이너 실행까지
author: JUNG YoungKyun
date: 2026-04-17
category: docker
layout: post
---

Docker는 "내 컴퓨터에서는 되는데요" 문제를 줄여주는 가장 강력한 도구 중 하나입니다.
이 글에서는 Docker 설치, 이미지/컨테이너 개념, 첫 실행 흐름까지 한 번에 정리합니다.

## Docker를 왜 쓰나요?

Docker를 쓰면 다음이 쉬워집니다.

- 개발 환경 표준화
- 의존성 충돌 감소
- 배포 환경과 로컬 환경 차이 축소
- 빠른 실행/삭제로 실험 용이

## 1) 설치 확인

Docker Desktop 설치 후 터미널에서 버전을 확인합니다.

```bash
docker --version
docker compose version
```

둘 다 버전이 출력되면 준비 완료입니다.

## 2) 핵심 개념 3개

- `Image`: 실행 가능한 템플릿 (앱 스냅샷)
- `Container`: Image를 실제로 실행한 인스턴스
- `Registry`: Image 저장소 (예: Docker Hub)

쉽게 말하면, Image는 설계도이고 Container는 실제 돌아가는 앱입니다.

## 3) 첫 컨테이너 실행

가장 유명한 hello-world로 시작해봅니다.

```bash
docker run hello-world
```

처음 실행 시에는 이미지가 없으므로 자동으로 pull 후 실행됩니다.

## 4) Nginx 띄워보기

브라우저로 바로 확인되는 예제를 실행합니다.

```bash
docker run --name my-nginx -d -p 8080:80 nginx
```

- `--name`: 컨테이너 이름
- `-d`: 백그라운드 실행
- `-p 8080:80`: 로컬 8080 -> 컨테이너 80 포트 매핑

브라우저에서 `http://localhost:8080` 접속 시 Nginx 시작 페이지가 보입니다.

## 5) 자주 쓰는 컨테이너 명령어

```bash
# 실행 중인 컨테이너 보기
docker ps

# 전체 컨테이너 보기(중지 포함)
docker ps -a

# 로그 보기
docker logs my-nginx

# 컨테이너 중지
docker stop my-nginx

# 컨테이너 삭제
docker rm my-nginx
```

## 6) 이미지 관리 명령어

```bash
# 로컬 이미지 목록
docker images

# 이미지 삭제
docker rmi nginx
```

사용하지 않는 이미지가 쌓이면 디스크를 많이 먹기 때문에 주기적으로 정리하는 습관이 좋습니다.

## 7) 정리 명령어(주의)

```bash
# 사용하지 않는 리소스 정리
docker system prune
```

필요한 리소스까지 지워질 수 있으니 옵션과 대상을 꼭 확인하고 사용하세요.

## 마무리

여기까지 익히면 Docker의 기본 흐름(이미지 pull -> 컨테이너 run -> 로그 확인 -> 종료/삭제)을 바로 실무에 적용할 수 있습니다.
다음 글에서는 Dockerfile 작성과 Node.js 앱 컨테이너화까지 이어서 다뤄보겠습니다.

## 추천 태그

`docker`, `container`, `docker-desktop`, `devops`, `nginx`, `backend`, `frontend`, `개발환경`