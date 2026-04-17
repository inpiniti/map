---
title: JavaScript 이벤트 루프 쉽게 이해하기 - 왜 setTimeout이 늦게 실행될까?
author: JUNG YoungKyun
date: 2026-04-17
category: js
layout: post
---

비동기 버그를 잡다 보면 결국 이벤트 루프를 이해해야 합니다.
이번 글은 실무에서 바로 써먹을 수 있게 핵심만 정리합니다.

## 1) 실행 순서의 기본

JavaScript 런타임은 크게 아래 순서로 실행됩니다.

- Call Stack(현재 실행 중인 코드)
- Microtask Queue(Promise.then, queueMicrotask)
- Macrotask Queue(setTimeout, setInterval, I/O)

한 줄 요약:
Promise가 setTimeout보다 먼저 실행됩니다.

## 2) 자주 헷갈리는 예제

```javascript
console.log('1');

setTimeout(() => {
  console.log('2');
}, 0);

Promise.resolve().then(() => {
  console.log('3');
});

console.log('4');
```

결과:

```text
1
4
3
2
```

## 3) UI가 버벅이는 이유

아무리 비동기를 써도, 무거운 동기 연산이 길면 메인 스레드가 막힙니다.

```javascript
// 2~3초 이상 걸릴 수 있는 무거운 루프
for (let i = 0; i < 1e9; i++) {}
```

이 동안 클릭/스크롤/입력 반응이 멈춥니다.

## 4) 큰 작업 쪼개기

```javascript
function chunkedTask(items, chunkSize = 200) {
  let index = 0;

  function runChunk() {
    const end = Math.min(index + chunkSize, items.length);

    while (index < end) {
      doHeavyWork(items[index]);
      index += 1;
    }

    if (index < items.length) {
      setTimeout(runChunk, 0);
    }
  }

  runChunk();
}
```

이렇게 쪼개면 사용자 입력 응답성을 유지하기 쉽습니다.

## 5) 디버깅 팁

- 느린 프레임: Chrome Performance 탭에서 Long Task 확인
- 콜백 순서 문제: 로그에 타임스탬프와 태스크 타입 표시
- Promise 체인 누락: 반드시 return/await 일관성 유지

## 마무리

이벤트 루프는 문법이 아니라 "실행 모델"입니다.
한 번 이해하면 비동기 버그의 원인을 훨씬 빠르게 찾을 수 있습니다.

## 추천 태그

javascript,event-loop,promise,setTimeout,async,frontend,debugging,성능최적화
