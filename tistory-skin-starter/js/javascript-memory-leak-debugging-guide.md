---
title: JavaScript 메모리 누수 디버깅 가이드 - 점점 느려지는 페이지의 원인 찾기
author: JUNG YoungKyun
date: 2026-04-17
category: js
layout: post
---

처음엔 빠른데 몇 분 쓰면 느려지는 페이지라면 메모리 누수를 의심해야 합니다.
이번 글에서는 프론트 실무에서 자주 터지는 누수 패턴과 해결법을 정리합니다.

## 1) 대표 누수 패턴

- 해제하지 않은 이벤트 리스너
- 정리되지 않은 setInterval / setTimeout
- 닫히지 않은 WebSocket 구독
- 거대한 객체를 참조하는 클로저
- 캐시 무한 증가

## 2) 가장 흔한 예: 리스너 정리 누락

```javascript
function mount() {
  const onResize = () => {
    console.log(window.innerWidth);
  };

  window.addEventListener('resize', onResize);

  return () => {
    window.removeEventListener('resize', onResize);
  };
}
```

정리 함수가 빠지면 화면 재진입마다 리스너가 계속 쌓입니다.

## 3) Interval 누수

```javascript
const timer = setInterval(() => {
  fetchLatestData();
}, 3000);

// 화면 이탈 시
clearInterval(timer);
```

## 4) Map/Cache 무한 증가 제어

```javascript
class LruCache {
  constructor(limit = 100) {
    this.limit = limit;
    this.map = new Map();
  }

  set(key, value) {
    if (this.map.has(key)) {
      this.map.delete(key);
    }
    this.map.set(key, value);

    if (this.map.size > this.limit) {
      const firstKey = this.map.keys().next().value;
      this.map.delete(firstKey);
    }
  }

  get(key) {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }
}
```

## 5) 크롬 DevTools로 확인하는 순서

1. Memory 탭에서 Heap Snapshot 2~3회 촬영
2. 시간이 지날수록 증가하는 객체 타입 확인
3. Retainers 트리에서 누가 참조를 잡고 있는지 추적
4. 의심 코드 정리 후 재측정

## 6) 실무 체크리스트

- mount/unmount 짝이 맞는가?
- 타이머/구독 해제가 보장되는가?
- 캐시에 상한(limit)이 있는가?
- 대용량 리스트는 가상화(virtualization)했는가?

## 마무리

메모리 누수는 "한 번에 크게"보다 "조금씩 계속" 쌓이는 경우가 대부분입니다.
측정 -> 원인 추적 -> 정리 패턴 고정을 반복하면 안정적으로 잡을 수 있습니다.

## 추천 태그

javascript,memory-leak,frontend,debugging,performance,devtools,web,실무문제해결
