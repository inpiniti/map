---
title: Jest 비동기 테스트 완전 정리 - done, Promise, async/await 한 번에 끝내기
author: JUNG YoungKyun
date: 2022-05-15
category: 01 jest
layout: post
---

동기 테스트는 익숙한데, 비동기 테스트로 넘어오면 갑자기 결과가 이상하게 보일 때가 많습니다.
이번 글에서는 `callback`, `Promise`, `async/await` 패턴을 Jest에서 어떻게 정확히 테스트하는지 실수 포인트까지 함께 정리합니다.

## 1) Callback 패턴

### 잘못된 예시: 기다리지 않고 테스트가 끝나는 경우

먼저 3초 뒤 이름을 넘겨주는 함수를 만듭니다.

`fn.js`

```javascript
const fn = {
  add: (num1, num2) => num1 + num2,
  getName: (callback) => {
    const name = 'Mike';
    setTimeout(() => {
      callback(name);
    }, 3000);
  },
};

module.exports = fn;
```

`fn.test.js`

```javascript
const fn = require('./fn');

test('3초 후에 받아온 이름은 Mike', () => {
  function callback(name) {
    expect(name).toBe('Tom');
  }

  fn.getName(callback);
});
```

이 코드는 실제로는 실패해야 하지만, `test` 함수가 먼저 끝나 버리면 통과처럼 보일 수 있습니다.

### 해결: done 사용

```javascript
const fn = require('./fn');

test('3초 후에 받아온 이름은 Mike', (done) => {
  function callback(name) {
    try {
      expect(name).toBe('Mike');
      done();
    } catch (error) {
      done(error);
    }
  }

  fn.getName(callback);
});
```

핵심은 두 가지입니다.

- `done`이 호출될 때까지 Jest가 테스트 종료를 기다린다.
- 실패 시 `done(error)`를 넘겨야 정상적으로 실패로 잡힌다.

`done`을 호출하지 않으면 기본 타임아웃(보통 5초) 후 실패합니다.

## 2) Promise 패턴

### 잘못된 예시: return 누락

`fn.js`

```javascript
const fn = {
  add: (num1, num2) => num1 + num2,
  getAge: () => {
    const age = 30;
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(age);
      }, 3000);
    });
  },
};

module.exports = fn;
```

`fn.test.js`

```javascript
const fn = require('./fn');

test('3초 후에 받아온 나이는 30', () => {
  fn.getAge().then((age) => {
    expect(age).toBe(31);
  });
});
```

위 코드는 `return`이 없어 테스트가 기다리지 않고 끝날 수 있습니다.

### 해결 1: Promise 반환

```javascript
const fn = require('./fn');

test('3초 후에 받아온 나이는 30', () => {
  return fn.getAge().then((age) => {
    expect(age).toBe(30);
  });
});
```

### 해결 2: resolves / rejects matcher 사용

```javascript
const fn = require('./fn');

test('3초 후에 받아온 나이는 30', () => {
  return expect(fn.getAge()).resolves.toBe(30);
});
```

실패 케이스(reject) 테스트 예시:

`fn.js`

```javascript
const fn = {
  getAge: () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error('error'));
      }, 3000);
    });
  },
};

module.exports = fn;
```

`fn.test.js`

```javascript
const fn = require('./fn');

test('3초 후 에러가 발생한다', () => {
  return expect(fn.getAge()).rejects.toThrow('error');
});
```

## 3) async / await 패턴

실무에서는 `async/await`가 가독성이 가장 좋습니다.

```javascript
const fn = require('./fn');

test('3초 후 나이는 30', async () => {
  const age = await fn.getAge();
  expect(age).toBe(30);
});
```

`await + resolves` 형태도 가능합니다.

```javascript
const fn = require('./fn');

test('3초 후 나이는 30', async () => {
  await expect(fn.getAge()).resolves.toBe(30);
});
```

실패 확인 예시:

```javascript
const fn = require('./fn');

test('3초 후 나이는 31', async () => {
  const age = await fn.getAge();
  expect(age).toBe(31);
});
```

## 정리

- Callback: `done`, 실패 시 `done(error)`
- Promise: `return` 필수
- Promise matcher: `resolves`, `rejects`
- 추천 패턴: `async/await`

비동기 테스트에서 통과/실패가 이상하게 보일 때는 대부분 "Jest가 테스트 종료를 기다리지 않았다"가 원인입니다.
이 기준만 기억해도 디버깅 속도가 훨씬 빨라집니다.

## 추천 태그

`jest`, `async-test`, `callback`, `promise`, `async-await`, `unit-test`, `javascript`, `nodejs`, `testing`, `초보개발`
