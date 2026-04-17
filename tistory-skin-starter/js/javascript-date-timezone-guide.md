---
title: JavaScript 날짜/시간 버그 방지 가이드 - 타임존 때문에 망하지 않는 법
author: JUNG YoungKyun
date: 2026-04-17
category: js
layout: post
---

개발하다가 가장 자주 사고 나는 주제 중 하나가 날짜/시간입니다.
특히 서버 UTC, 사용자 로컬 타임존, DB 저장 포맷이 섞이면 버그가 급증합니다.

## 1) 원칙 먼저

- 저장: UTC(ISO 문자열)로 통일
- 전송: ISO 8601 사용
- 표시: 사용자 로컬 타임존으로 변환

## 2) 저장 포맷 예시

```javascript
const createdAt = new Date().toISOString();
// 예: 2026-04-17T06:45:30.000Z
```

## 3) 표시 포맷 예시

```javascript
function formatKoreanDate(iso) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}
```

## 4) 절대 피해야 할 패턴

```javascript
new Date('2026-04-17');
```

환경마다 UTC/로컬 해석 차이가 생길 수 있어 오프셋 버그가 발생하기 쉽습니다.
가능하면 시간대 정보가 있는 ISO 문자열을 사용하세요.

## 5) 자주 터지는 실무 이슈

- "오늘" 기준 필터가 국가별로 다르게 동작
- 자정 경계에서 데이터가 하루 밀림
- 예약 발송 시간이 1시간 늦거나 빨라짐(DST)

## 6) 체크리스트

- 서버/DB/프론트 기준 타임존 문서화했는가?
- 날짜 연산(오늘 시작/끝)을 어디서 처리할지 정했는가?
- 테스트에 타임존 경계 케이스가 있는가?

## 마무리

날짜 버그는 발견이 늦고 파급이 큽니다.
처음부터 UTC 저장 원칙과 표시 변환 규칙을 고정하면 대부분 예방할 수 있습니다.

## 추천 태그

`javascript,date,timezone,utc,frontend,backend,intl,실무버그`
