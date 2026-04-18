---
title: "React Query: mutation onSettled 누락으로 인한 후처리 미실행 버그"
date: 2026-04-17
summary: "React Query에서 mutation의 onSettled 콜백을 누락해 후처리(로딩 해제, 상태 초기화 등)가 실행되지 않는 문제, 실제 증상, 원인, 그리고 실전에서 적용한 대응법을 공유합니다."
tags:
  - react-query
  - mutation
  - onSettled
  - 후처리
  - 버그
---

## 문제 상황

React Query에서 mutation을 사용할 때, onSettled 콜백을 누락하면 성공/실패와 관계없이 반드시 실행해야 할 후처리(로딩 해제, 상태 초기화 등)가 누락되는 버그가 있었습니다.

- mutation 성공/실패 여부와 무관하게 항상 실행해야 할 후처리 로직이 있음
- onSettled를 누락하면, 실패 시 후처리가 실행되지 않음

## 실제 증상

- 저장 실패 시 로딩 스피너가 계속 남아있음
- 상태 초기화/정리 로직이 실행되지 않아 UI가 꼬임

## 원인 분석

- mutation의 onSettled 콜백을 누락하면, 실패 시 후처리 로직이 실행되지 않음
- onSuccess/onError만 구현하면, 실패 시 후처리 누락 가능

## 실전 대응 패턴

1. **onSettled 콜백 필수 구현**: mutation 선언 시 항상 onSettled 구현
2. **로딩 해제, 상태 초기화 등 후처리 로직 onSettled에 작성**
3. **QA/테스트에서 실패 시나리오 검증**

### 예시 코드

```js
const mutation = useMutation(updateData, {
  onSettled: () => {
    setLoading(false)
    resetForm()
  },
})
```

## 교훈

- React Query mutation의 onSettled 콜백을 반드시 구현해 후처리 누락을 방지할 것
- QA/테스트에서 실패 시나리오를 반드시 검증할 것

## 추천 태그

`react-query,mutation,onSettled,후처리,버그,실무버그,프론트엔드`
