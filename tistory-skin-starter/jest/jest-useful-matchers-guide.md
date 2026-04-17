---
title: Jest Matcher 실전 정리 - 이거 모르면 테스트에서 계속 삽질합니다
author: JUNG YoungKyun
date: 2022-05-12
category: 01 jest
layout: post
---

Jest에서 `toBe` 같은 함수를 Matcher라고 합니다.
이번 글에서는 실무에서 자주 쓰는 Matcher를 실패/성공 예시와 함께 빠르게 정리합니다.

## toBe와 toEqual의 차이

`toBe`는 원시값(숫자, 문자열, boolean) 비교에 주로 사용합니다.
객체/배열은 `toEqual` 또는 `toStrictEqual`을 사용하세요.

```javascript
test('2 더하기 3은 5야.', () => {
  expect(2 + 3).toBe(5);
});

test('2 더하기 3은 5야.', () => {
  expect(2 + 3).toEqual(5);
});
```

두 테스트 모두 통과합니다.

## 객체/배열 비교는 toEqual

먼저 함수 하나를 추가합니다.

```javascript
const fn = {
  add: (num1, num2) => num1 + num2,
  makeUser: (name, age) => ({ name, age }),
};

module.exports = fn;
```

아래 테스트는 실패합니다.

```javascript
test('이름과 나이를 전달받아 객체를 반환한다', () => {
  expect(fn.makeUser('Mike', 30)).toBe({
    name: 'Mike',
    age: 30,
  });
});
```

이유는 객체를 참조(주소) 기준으로 비교하기 때문입니다.
값 비교를 하려면 `toEqual`을 사용하세요.

```javascript
test('이름과 나이를 전달받아 객체를 반환한다', () => {
  expect(fn.makeUser('Mike', 30)).toEqual({
    name: 'Mike',
    age: 30,
  });
});
```

## 더 엄격한 비교: toStrictEqual

`toEqual`은 구조가 비슷하면 통과할 수 있지만,
`toStrictEqual`은 `undefined` 키의 존재 여부까지 엄격하게 비교합니다.

```javascript
const fn = {
  makeUser: (name, age) => ({ name, age, gender: undefined }),
};

test('toEqual은 통과할 수 있다', () => {
  expect(fn.makeUser('Mike', 30)).toEqual({
    name: 'Mike',
    age: 30,
  });
});

test('toStrictEqual은 실패한다', () => {
  expect(fn.makeUser('Mike', 30)).toStrictEqual({
    name: 'Mike',
    age: 30,
  });
});
```

의도하지 않은 필드까지 검증하고 싶다면 `toStrictEqual`이 더 안전합니다.

## null / undefined / defined

```javascript
test('null은 null이다', () => {
  expect(null).toBeNull();
});

test('undefined는 undefined다', () => {
  expect(undefined).toBeUndefined();
});

test('값이 있으면 defined다', () => {
  expect('hello').toBeDefined();
});
```

## truthy / falsy

```javascript
test('0은 falsy다', () => {
  expect(0).toBeFalsy();
});

test('빈 문자열은 falsy다', () => {
  expect('').toBeFalsy();
});

test('문자열은 truthy다', () => {
  expect('hello world').toBeTruthy();
});
```

## 크기 비교

```javascript
test('ID는 10자 이하여야 한다', () => {
  const id = 'THE_BLACK';
  expect(id.length).toBeLessThanOrEqual(10);
});
```

상황에 따라 다음 Matcher를 사용하면 됩니다.

- `toBeGreaterThan`
- `toBeGreaterThanOrEqual`
- `toBeLessThan`
- `toBeLessThanOrEqual`

## 소수점 비교: toBeCloseTo

부동소수점 오차 때문에 `toBe`가 실패할 수 있습니다.

```javascript
test('0.1 + 0.2는 0.3에 가깝다', () => {
  expect(0.1 + 0.2).toBeCloseTo(0.3);
});
```

## 문자열 패턴 비교: toMatch

```javascript
test('Hello World에 h가 있나? (대소문자 무시)', () => {
  expect('Hello World').toMatch(/h/i);
});
```

## 배열 포함 여부: toContain

```javascript
test('유저 리스트에 Mike가 있나?', () => {
  const user = 'Mike';
  const userList = ['Tom', 'Jane', 'Kai', 'Mike'];
  expect(userList).toContain(user);
});
```

## 예외 테스트: toThrow

에러 테스트는 함수 실행 결과가 아니라, 함수 자체를 넘겨야 합니다.

```javascript
const fn = {
  throwErr: () => {
    throw new Error('xx');
  },
};

test('에러가 발생해야 한다', () => {
  expect(fn.throwErr).toThrow();
});

test('특정 메시지의 에러가 발생해야 한다', () => {
  expect(fn.throwErr).toThrow('xx');
});
```

## 정리

- 원시값: `toBe`
- 객체/배열: `toEqual` 또는 `toStrictEqual`
- 엄격 검증: 가능하면 `toStrictEqual`
- 소수점: `toBeCloseTo`
- 예외: `toThrow`

Matcher를 전부 외울 필요는 없습니다.
필요할 때 공식 문서를 빠르게 찾아 쓰는 습관이 더 중요합니다.

참고: https://jestjs.io/docs/expect

## 추천 태그

`jest`, `matcher`, `unit-test`, `javascript`, `nodejs`, `testing`, `toEqual`, `toStrictEqual`, `toThrow`, `초보개발`
