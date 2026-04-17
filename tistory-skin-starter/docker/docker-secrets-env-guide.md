---
title: Docker 환경변수/Secret 관리 가이드 - .env 실수로 사고 나기 전에
author: JUNG YoungKyun
date: 2026-04-17
category: docker
layout: post
---

실무에서 가장 위험한 Docker 실수 중 하나는 민감정보를 이미지에 넣는 것입니다.
이번 글에서는 env와 secret을 안전하게 관리하는 기본 원칙을 정리합니다.

## 1) 절대 이미지에 넣지 말 것

- API 키
- DB 비밀번호
- 토큰/인증서

아래처럼 Dockerfile에 직접 넣는 방식은 피해야 합니다.

```dockerfile
ENV DB_PASSWORD=super-secret
```

## 2) 개발 환경에서는 .env 사용

compose에서 env 파일을 분리합니다.

```yaml
services:
  api:
    env_file:
      - .env
```

그리고 `.env`는 반드시 git 추적에서 제외합니다.

## 3) 운영 환경은 Secret 스토어 사용

운영에서는 다음 중 하나를 권장합니다.

- 클라우드 Secret Manager
- CI/CD Secret 변수
- Docker Secret(환경에 따라)

## 4) 로그에 민감정보 노출 금지

에러 로그에 전체 config를 그대로 출력하는 습관은 위험합니다.
필요한 값만 마스킹해서 남깁니다.

## 5) 회전(Rotation) 가능한 구조 만들기

비밀번호/키는 언젠가 교체된다는 전제로 설계해야 합니다.

- 키 만료일 운영
- 교체 절차 문서화
- 이전/신규 키 동시 허용 기간 설계

## 마무리

Secret 관리는 기능 개발보다 덜 눈에 띄지만, 사고가 나면 가장 치명적입니다.
초기부터 분리 원칙을 잡아두면 운영 리스크를 크게 줄일 수 있습니다.

## 추천 태그

`docker`, `secret`, `env`, `security`, `devops`, `backend`, `infra`, `운영보안`
