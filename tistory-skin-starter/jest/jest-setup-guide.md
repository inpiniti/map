---
title: Jest 설치 가이드 - 10분 만에 테스트 시작하기
author: JUNG YoungKyun
date: 2022-05-11
category: 01 jest
layout: post
---

Jest는 JavaScript 테스트를 빠르게 시작할 수 있는 대표적인 테스트 프레임워크입니다.
이 글에서는 프로젝트 생성부터 기본 테스트 작성, 실패/성공 케이스 확인까지 한 번에 정리합니다.

## 1) 프로젝트 생성

먼저 폴더를 만들고 npm 프로젝트를 초기화합니다.

```bash
npm init
```

원한다면 기본 질문 없이 아래처럼 진행해도 됩니다.

```bash
npm init -y
```

## 2) Jest 설치

Jest는 개발 단계에서만 사용하므로 개발 의존성으로 설치합니다.

```bash
npm install jest --save-dev
```

축약형으로 아래처럼 설치해도 같습니다.

```bash
npm install jest -D
```

## 3) package.json 스크립트 수정

`package.json`의 `scripts.test` 값을 `jest`로 변경합니다.

```json
"scripts": {
  "test": "jest"
}
```

## 4) 테스트 대상 파일 만들기 (fn.js)

테스트할 함수를 `fn.js`에 작성합니다.

```javascript
const fn = {
  add: (num1, num2) => num1 + num2,
};

module.exports = fn;
```

## 5) 테스트 파일 만들기 (fn.test.js)

동일한 이름 규칙으로 `fn.test.js`를 생성합니다.

```javascript
const fn = require('./fn');

// expect에는 검증할 값을 넣고,
// toBe에는 기대 결과를 넣습니다.
test('1은 1이야.', () => {
  expect(1).toBe(1);
});

// add 함수 테스트
test('2 더하기 3은 5야.', () => {
  expect(fn.add(2, 3)).toBe(5);
});

// 일부러 실패시키는 케이스
test('3 더하기 3은 5야.', () => {
  expect(fn.add(3, 3)).toBe(5);
});
```

## 6) 테스트 실행

```bash
npm test
```

실행하면 프로젝트 내 테스트 파일(`*.test.js`, `__tests__` 폴더 등)을 찾아 테스트합니다.

예시 결과:

```text
✓ 1은 1이야.
✓ 2 더하기 3은 5야.
✕ 3 더하기 3은 5야.

Test Suites: 1 failed, 1 total
Tests:       1 failed, 2 passed, 3 total
```

특정 파일만 실행하고 싶다면 파일명이나 경로를 붙이면 됩니다.

```bash
npm test fn.test.js
```

## 7) not으로 반대 조건 검증하기

실패 케이스를 `not`으로 바꿔 통과하도록 수정해봅니다.

```javascript
test('3 더하기 3은 5가 아니야.', () => {
  expect(fn.add(3, 3)).not.toBe(5);
});
```

다시 실행:

```bash
npm test
```

예시 결과:

```text
✓ 1은 1이야.
✓ 2 더하기 3은 5야.
✓ 3 더하기 3은 5가 아니야.

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
```

## 마무리

여기까지 진행하면 Jest 기본 세팅과 핵심 matcher(`toBe`, `not.toBe`) 사용 흐름을 빠르게 익힐 수 있습니다.
다음 글에서는 `beforeEach`, `afterEach`, 비동기 테스트까지 확장해보면 좋습니다.

## 추천 태그

`jest`, `javascript`, `nodejs`, `unit-test`, `testing`, `npm`, `초보개발`, `프론트엔드`
