---
title: Jest 테스트 전후 작업 완전 정리 - beforeEach, beforeAll, only, skip 실전 가이드
author: JUNG YoungKyun
date: 2022-05-18
category: 01 jest
layout: post
---

테스트를 작성하다 보면 실행 전후에 준비/정리 작업이 꼭 필요합니다.
Jest는 이를 위해 `beforeEach`, `afterEach`, `beforeAll`, `afterAll` 같은 헬퍼를 제공합니다.
이번 글에서는 실행 순서와 성능 차이, 그리고 `only`, `skip` 사용법까지 한 번에 정리합니다.

## 상태 공유 때문에 테스트가 깨지는 경우

아래 테스트는 겉보기엔 단순하지만, 공용 변수 `num` 때문에 실패합니다.

```javascript
const fn = require('./fn');

let num = 0;

test('0 더하기 1은 1이야', () => {
  num = fn.add(num, 1);
  expect(num).toBe(1);
});

test('0 더하기 2는 2야', () => {
  num = fn.add(num, 2);
  expect(num).toBe(2);
});

test('0 더하기 3은 3이야', () => {
  num = fn.add(num, 3);
  expect(num).toBe(3);
});
```

첫 테스트 이후 `num` 값이 누적되기 때문에 이후 테스트가 연쇄적으로 실패합니다.

## beforeEach: 각 테스트 전에 초기화

```javascript
const fn = require('./fn');

let num = 0;

beforeEach(() => {
  num = 0;
});

test('0 더하기 1은 1이야', () => {
  num = fn.add(num, 1);
  expect(num).toBe(1);
});

test('0 더하기 2는 2야', () => {
  num = fn.add(num, 2);
  expect(num).toBe(2);
});

test('0 더하기 3은 3이야', () => {
  num = fn.add(num, 3);
  expect(num).toBe(3);
});
```

핵심은 "테스트 격리"입니다.
각 테스트가 독립적으로 실행되도록 시작 상태를 통일하세요.

## afterEach: 각 테스트 직후 정리

`afterEach`는 테스트 이후에 실행됩니다.
즉, 첫 테스트 시작 전에 필요한 초기화는 `afterEach`만으로는 부족할 수 있습니다.

```javascript
let num = 10;

afterEach(() => {
  num = 0;
});

test('0 더하기 1은 1이야', () => {
  // 첫 테스트는 num=10 상태에서 시작할 수 있음
});
```

정리 작업(cleanup)에는 좋지만, 초기화(setup) 용도는 보통 `beforeEach`가 더 적합합니다.

## 비동기 전후 작업: DB 연결/해제

예를 들어 테스트마다 DB 연결/해제를 수행하면 느려질 수 있습니다.

`fn.js`

```javascript
const fn = {
  add: (num1, num2) => num1 + num2,
  connectUserDb: () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          name: 'Mike',
          age: 30,
          gender: 'male',
        });
      }, 500);
    });
  },
  disconnectUserDb: () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 500);
    });
  },
};

module.exports = fn;
```

### beforeEach/afterEach 사용 시

```javascript
const fn = require('./fn');

let user;

beforeEach(async () => {
  user = await fn.connectUserDb();
});

afterEach(async () => {
  await fn.disconnectUserDb();
});

test('이름은 Mike', () => {
  expect(user.name).toBe('Mike');
});
```

테스트마다 연결+해제가 반복되어 시간이 누적됩니다.

## beforeAll/afterAll: 한 번만 실행

공통 리소스를 여러 테스트가 공유해도 되는 경우 성능상 유리합니다.

```javascript
const fn = require('./fn');

let user;

beforeAll(async () => {
  user = await fn.connectUserDb();
});

afterAll(async () => {
  await fn.disconnectUserDb();
});

test('이름은 Mike', () => {
  expect(user.name).toBe('Mike');
});

test('나이는 30', () => {
  expect(user.age).toBe(30);
});

test('성별은 male', () => {
  expect(user.gender).toBe('male');
});
```

## describe로 범위 분리하기

도메인별로 setup/teardown을 분리하면 테스트 구조가 훨씬 깔끔해집니다.

```javascript
const fn = require('./fn');

describe('User 관련 작업', () => {
  let user;

  beforeAll(async () => {
    user = await fn.connectUserDb();
  });

  afterAll(async () => {
    await fn.disconnectUserDb();
  });

  test('이름은 Mike', () => {
    expect(user.name).toBe('Mike');
  });
});

describe('Car 관련 작업', () => {
  let car;

  beforeAll(async () => {
    car = await fn.connectCarDb();
  });

  afterAll(async () => {
    await fn.disconnectCarDb();
  });

  test('이름은 z4', () => {
    expect(car.name).toBe('z4');
  });

  test('브랜드는 bmw', () => {
    expect(car.brand).toBe('bmw');
  });

  test('색상은 red', () => {
    expect(car.color).toBe('red');
  });
});
```

주의할 점은 `user`와 `car` 변수를 섞지 않는 것입니다.

## 실행 순서 요약

```javascript
beforeAll(() => console.log('밖 beforeAll'));
beforeEach(() => console.log('밖 beforeEach'));
afterEach(() => console.log('밖 afterEach'));
afterAll(() => console.log('밖 afterAll'));

test('outside test', () => {
  console.log('밖 test');
});

describe('inside describe', () => {
  beforeAll(() => console.log('안 beforeAll'));
  beforeEach(() => console.log('안 beforeEach'));
  afterEach(() => console.log('안 afterEach'));
  afterAll(() => console.log('안 afterAll'));

  test('inside test', () => {
    console.log('안 test');
  });
});
```

개념적으로는 이렇게 기억하면 됩니다.

- 바깥 `beforeAll` 1회
- 각 테스트마다 바깥 `beforeEach` 실행
- `describe` 안 테스트는 안쪽 `beforeEach`까지 실행
- 테스트 후에는 안쪽 `afterEach` → 바깥 `afterEach`
- 마지막에 안쪽 `afterAll`, 바깥 `afterAll`

## only: 특정 테스트만 실행

디버깅할 때 매우 유용합니다.

```javascript
test.only('0 + 5 = 5', () => {
  expect(fn.add(0, 5)).toBe(5);
});
```

다른 테스트는 `skipped` 처리됩니다.

## skip: 특정 테스트 잠시 제외

```javascript
test.skip('0 + 4 = 4', () => {
  expect(fn.add(0, 4)).toBe(4);
});
```

장애 원인 분리나 임시 제외가 필요할 때 사용합니다.

## 마무리

정리하면,

- 상태 초기화: `beforeEach`
- 개별 정리: `afterEach`
- 공통 리소스 성능 최적화: `beforeAll`, `afterAll`
- 디버깅: `only`, `skip`

테스트가 흔들릴 때는 대부분 "공유 상태"와 "실행 순서"가 원인입니다.
이 두 가지를 먼저 점검하면 대부분 빠르게 해결할 수 있습니다.

## 추천 태그

`jest`, `beforeEach`, `beforeAll`, `afterEach`, `afterAll`, `only`, `skip`, `unit-test`, `javascript`, `testing`
