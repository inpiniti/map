---
title: Jest Mock 함수 완전 정리 - 이거 모르면 테스트가 자꾸 느려집니다
author: JUNG YoungKyun
date: 2022-05-28
category: 01 jest
layout: post
---

실무 테스트를 하다 보면 "실제 동작"까지 매번 실행하기엔 비용이 너무 큰 경우가 많습니다.
이럴 때 사용하는 핵심 도구가 Mock 함수입니다.

이번 글에서는 Jest의 Mock을 기초부터 실전까지 빠르게 정리합니다.

## Mock이란?

`mock`은 "가짜", "모의"라는 뜻입니다.
즉 Mock 함수는 실제 구현을 실행하는 대신, 테스트를 위해 동작을 흉내 내는 함수입니다.

왜 필요할까요?

- DB/네트워크 같은 외부 의존성은 느리고 불안정함
- 테스트는 항상 같은 입력에 같은 결과가 나와야 함
- 비싼 부수효과(실제 유저 생성 등)를 피해야 함

## jest.fn()으로 Mock 함수 만들기

```javascript
const mockFn = jest.fn();

mockFn();
mockFn(1);
```

`jest.fn()`으로 만든 함수는 호출 이력을 추적할 수 있습니다.

## mock.calls: 호출 횟수와 전달 인수 확인

```javascript
const mockFn = jest.fn();

mockFn();
mockFn(1);

test('함수는 2번 호출됩니다.', () => {
  expect(mockFn.mock.calls.length).toBe(2);
});

test('2번째 호출의 첫 번째 인수는 1입니다.', () => {
  expect(mockFn.mock.calls[1][0]).toBe(1);
});
```

`mock.calls`로 알 수 있는 것:

- 함수가 총 몇 번 호출됐는지
- 각 호출에서 어떤 인수가 전달됐는지

## 콜백 테스트에서 Mock 활용하기

```javascript
const mockFn = jest.fn();

function forEachAdd1(arr, callback) {
  arr.forEach((num) => callback(num + 1));
}

forEachAdd1([10, 20, 30], mockFn);

test('함수 호출은 3번 됩니다.', () => {
  expect(mockFn.mock.calls.length).toBe(3);
});

test('전달된 값은 11, 21, 31 입니다.', () => {
  expect(mockFn.mock.calls[0][0]).toBe(11);
  expect(mockFn.mock.calls[1][0]).toBe(21);
  expect(mockFn.mock.calls[2][0]).toBe(31);
});
```

아직 콜백의 실제 구현이 없어도, 상위 함수 동작을 먼저 검증할 수 있습니다.

## mock.results: 반환값 확인

```javascript
const mockFn = jest.fn((num) => num + 1);

mockFn(10);
mockFn(20);
mockFn(30);

test('반환값이 순서대로 11, 21, 31이다.', () => {
  expect(mockFn.mock.results[0].value).toBe(11);
  expect(mockFn.mock.results[1].value).toBe(21);
  expect(mockFn.mock.results[2].value).toBe(31);
});
```

`mock.results`에는 각 호출의 반환 결과가 들어 있습니다.

## mockReturnValue / mockReturnValueOnce

호출 순서에 따라 다른 값을 리턴할 수 있습니다.

```javascript
const mockFn = jest.fn();

mockFn
  .mockReturnValueOnce(10)
  .mockReturnValueOnce(20)
  .mockReturnValueOnce(30)
  .mockReturnValue(40);

test('호출 순서대로 10, 20, 30, 40을 반환한다.', () => {
  expect(mockFn()).toBe(10);
  expect(mockFn()).toBe(20);
  expect(mockFn()).toBe(30);
  expect(mockFn()).toBe(40);
});
```

## mock으로 필터 로직 검증하기

```javascript
const predicateMock = jest.fn()
  .mockReturnValueOnce(true)
  .mockReturnValueOnce(false)
  .mockReturnValueOnce(true)
  .mockReturnValueOnce(false)
  .mockReturnValue(true);

const result = [1, 2, 3, 4, 5].filter((num) => predicateMock(num));

test('결과는 1, 3, 5', () => {
  expect(result).toStrictEqual([1, 3, 5]);
});
```

핵심은 "지금 검증하려는 대상"에 집중하는 것입니다.

## 비동기 Mock: mockResolvedValue / mockRejectedValue

```javascript
const mockFn = jest.fn().mockResolvedValue({ name: 'Mike' });

test('받아온 이름은 Mike', async () => {
  await expect(mockFn()).resolves.toStrictEqual({ name: 'Mike' });
});
```

실패 케이스도 쉽게 만들 수 있습니다.

```javascript
const mockFn = jest.fn().mockRejectedValue(new Error('server error'));

test('에러가 발생한다', async () => {
  await expect(mockFn()).rejects.toThrow('server error');
});
```

## 모듈 자체를 Mock 처리하기

실제 함수가 DB를 건드리는 경우, 테스트에서 실제 실행하면 곤란할 수 있습니다.

`fn.js`

```javascript
const fn = {
  createUser: (name) => {
    console.log('실제로 사용자가 생성되었습니다.');
    return { name };
  },
};

module.exports = fn;
```

`fn.test.js`

```javascript
const fn = require('./fn');

jest.mock('./fn');

fn.createUser.mockReturnValue({ name: 'Mike' });

test('유저를 만든다', () => {
  const user = fn.createUser('Mike');
  expect(user.name).toBe('Mike');
});
```

이렇게 하면 실제 구현 대신 Mock이 동작하므로 부수효과를 막을 수 있습니다.

## 자주 쓰는 Mock Matcher

```javascript
const mockFn = jest.fn();

mockFn(10, 20);
mockFn();
mockFn(30, 40);

test('한 번 이상 호출됐다', () => {
  expect(mockFn).toHaveBeenCalled();
});

test('정확히 3번 호출됐다', () => {
  expect(mockFn).toHaveBeenCalledTimes(3);
});

test('10, 20으로 호출된 적이 있다', () => {
  expect(mockFn).toHaveBeenCalledWith(10, 20);
});

test('마지막 호출 인수는 30, 40이다', () => {
  expect(mockFn).toHaveBeenLastCalledWith(30, 40);
});
```

권장 이름은 `toBeCalled*`보다 `toHaveBeenCalled*` 계열입니다.

## 마무리

Mock은 "전체 시스템 재현"이 아니라 "지금 검증할 대상에 집중"하게 도와주는 도구입니다.
잘 쓰면 테스트는 더 빠르고, 안정적이고, 읽기 쉬워집니다.

## 추천 태그

`jest`, `mock`, `jest.fn`, `unit-test`, `javascript`, `testing`, `mockReturnValue`, `mockResolvedValue`, `jest.mock`, `nodejs`
