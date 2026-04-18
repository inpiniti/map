---
title: "React Query: mutation onError 누락으로 인한 에러 미노출 버그"
date: 2026-04-17
summary: "React Query에서 mutation의 onError 콜백을 누락해 에러가 UI에 노출되지 않는 문제, 실제 증상, 원인, 그리고 실전에서 적용한 대응법을 공유합니다."
tags:
  - react-query
  - mutation
  - onError
  - 에러핸들링
  - 버그
---

## 문제 상황

React Query에서 mutation을 사용할 때, onError 콜백을 누락하면 에러가 UI에 노출되지 않아 사용자가 문제를 인지하지 못하는 버그가 있었습니다.

- mutation 실패 시 onError가 없으면 아무런 피드백이 없음
- 사용자는 "저장 버튼이 안 먹힘", "왜 안 되는지 모름" 현상 경험

## 실제 증상

- API 오류, 네트워크 장애 등으로 mutation이 실패해도 UI에 에러 메시지가 표시되지 않음
- 사용자는 원인을 알 수 없음

## 원인 분석

- mutation의 onError 콜백을 누락하면, 에러가 UI에 전달되지 않음
- 에러 핸들링이 없으면, 사용자 경험이 크게 저하됨

## 실전 대응 패턴

1. **onError 콜백 필수 구현**: mutation 선언 시 항상 onError 구현
2. **에러 메시지/토스트 등 UI 피드백**: 에러 발생 시 사용자에게 명확히 안내
3. **QA/테스트에서 에러 시나리오 검증**

### 예시 코드

```js
const mutation = useMutation(updateData, {
  onError: (error) => {
    toast.error('저장에 실패했습니다. 다시 시도해주세요.')
  },
})
```

## 교훈

- React Query mutation의 onError 콜백을 반드시 구현해 에러를 UI에 노출할 것
- QA/테스트에서 에러 시나리오를 반드시 검증할 것

## 추천 태그

`react-query,mutation,onError,에러핸들링,버그,실무버그,프론트엔드`
