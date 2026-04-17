---
title: JavaScript API 요청 실전 가이드 - Timeout, Retry, Abort까지 한 번에
author: JUNG YoungKyun
date: 2026-04-17
category: js
layout: post
---

실무에서 가장 자주 만나는 에러는 API 요청 실패입니다.
이번 글에서는 "멈춤 없는 요청"을 만들기 위한 핵심 패턴을 정리합니다.

## 왜 필요한가?

- 요청이 끝없이 대기해서 UI가 멈춤
- 네트워크 일시 장애로 요청이 랜덤 실패
- 사용자가 페이지를 떠났는데도 불필요한 요청이 계속됨

## 1) 기본 fetch 래퍼 만들기

```javascript
async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}
```

## 2) Timeout 적용 (AbortController)

```javascript
async function requestWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}
```

## 3) Retry 전략 (지수 백오프)

```javascript
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestWithRetry(url, options = {}, maxRetries = 3) {
  let attempt = 0;

  while (true) {
    try {
      return await requestWithTimeout(url, options, 5000);
    } catch (error) {
      attempt += 1;
      const canRetry = attempt <= maxRetries;

      if (!canRetry) {
        throw error;
      }

      const backoff = 300 * Math.pow(2, attempt - 1);
      await sleep(backoff);
    }
  }
}
```

## 4) 재시도하면 안 되는 케이스

아래는 재시도보다 즉시 실패 처리가 맞는 경우가 많습니다.

- 400, 401, 403, 404 같은 클라이언트 오류
- 유효성 검증 실패
- 중복 생성 요청

재시도는 보통 429, 500, 502, 503, 504 같은 일시 장애에만 적용합니다.

## 5) 페이지 이동 시 요청 취소

```javascript
const controller = new AbortController();

fetch('/api/users', { signal: controller.signal })
  .then((res) => res.json())
  .then(console.log)
  .catch((err) => {
    if (err.name === 'AbortError') {
      console.log('요청이 취소되었습니다.');
      return;
    }
    console.error(err);
  });

// 라우트 이동 시
controller.abort();
```

## 6) 실무 체크리스트

- 요청마다 timeout을 설정했는가?
- retry 횟수 상한이 있는가?
- retry 대상 status code가 명확한가?
- 페이지 이탈 시 요청 취소를 처리했는가?

## 마무리

요청 실패는 버그가 아니라 "항상 발생하는 기본 상황"으로 보는 것이 맞습니다.
Timeout + Retry + Abort만 제대로 붙여도 장애 체감이 크게 줄어듭니다.

## 추천 태그

javascript, fetch, api, retry, timeout, abortcontroller, frontend, 실무팁
