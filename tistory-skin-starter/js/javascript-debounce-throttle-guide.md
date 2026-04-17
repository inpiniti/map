---
title: JavaScript Debounce vs Throttle 완전 정리 - 검색창과 스크롤 최적화 실전
author: JUNG YoungKyun
date: 2026-04-17
category: js
layout: post
---

검색창, 스크롤, 리사이즈 이벤트는 그대로 처리하면 성능 문제가 바로 터집니다.
이럴 때 Debounce와 Throttle을 정확히 구분해 쓰는 게 중요합니다.

## Debounce와 Throttle 차이

- Debounce: 연속 이벤트가 끝난 뒤 "한 번" 실행
- Throttle: 일정 주기마다 "최대 한 번" 실행

## 1) Debounce 구현

```javascript
function debounce(fn, delay = 300) {
  let timer = null;

  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}
```

검색창 자동완성에 가장 자주 씁니다.

```javascript
const onSearch = debounce((keyword) => {
  fetch(`/api/search?q=${encodeURIComponent(keyword)}`);
}, 350);
```

## 2) Throttle 구현

```javascript
function throttle(fn, interval = 200) {
  let lastCall = 0;

  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= interval) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}
```

스크롤 위치 계산, 드래그 좌표 업데이트 등에 유용합니다.

## 3) 어떤 상황에 무엇을 쓰나?

- 검색 입력: Debounce
- 무한 스크롤 감지: Throttle
- 창 크기 변경 레이아웃 재계산: Debounce
- 실시간 마우스 이동 추적: Throttle

## 4) 실무에서 자주 하는 실수

- Debounce delay가 너무 길어 UX가 답답해짐
- Throttle 주기가 너무 짧아 최적화 효과가 미미함
- 컴포넌트 unmount 시 타이머 정리 누락

## 5) 요청 취소까지 같이 붙이기

검색은 Debounce만으로 부족할 때가 많습니다.
이전 요청 취소를 함께 넣어야 stale response 문제를 줄일 수 있습니다.

## 마무리

Debounce/Throttle은 성능 기법이지만 결국 UX 품질과 직결됩니다.
사용자 입력 패턴에 맞게 주기를 조정해보세요.

## 추천 태그

`javascript,debounce,throttle,performance,frontend,search,scroll,ui-ux`
