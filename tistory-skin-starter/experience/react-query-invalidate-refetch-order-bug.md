---
title: "React Query: invalidateQueries와 refetchQueries 호출 순서 버그"
date: 2026-04-17
summary: "React Query에서 invalidateQueries와 refetchQueries 호출 순서에 따라 캐시/데이터 동기화가 어긋나는 문제, 실제 증상, 원인, 그리고 안전한 호출 패턴을 공유합니다."
tags:
  - react-query
  - invalidate
  - refetch
  - 캐시
  - 버그
---

## 문제 상황

React Query에서 mutation 후 invalidateQueries와 refetchQueries를 동시에 호출하거나, 순서를 잘못 지정하면 캐시와 데이터가 어긋나는 문제가 있었습니다.

- invalidateQueries와 refetchQueries를 동시에 호출
- invalidate가 끝나기 전에 refetch가 실행되어, 이전 캐시가 반환됨

## 실제 증상

- 데이터 수정 후 바로 refetch했는데, 변경 내용이 반영되지 않음
- 사용자는 "저장했는데 안 바뀜" 현상 경험

## 원인 분석

- invalidateQueries는 캐시를 무효화하지만, 비동기적으로 동작
- invalidate가 끝나기 전에 refetchQueries가 실행되면, 이전(오래된) 캐시가 반환됨

## 실전 대응 패턴

1. **invalidateQueries 후 refetchQueries**: invalidate가 끝난 후 refetch를 호출해야 최신 데이터가 반영됨
2. **Promise 체이닝 활용**: invalidateQueries가 Promise를 반환하므로, then에서 refetchQueries 호출

### 예시 코드

```js
const mutation = useMutation(updateData, {
  onSuccess: () => {
    queryClient.invalidateQueries(['myKey']).then(() => {
      queryClient.refetchQueries(['myKey'])
    })
  },
})
```

## 교훈

- invalidateQueries와 refetchQueries 호출 순서에 따라 캐시/데이터 동기화가 어긋날 수 있다
- 반드시 invalidate가 끝난 후 refetch를 호출할 것
- QA/테스트에서 동기화 어긋남 시나리오를 반드시 검증할 것

## 추천 태그

`react-query,invalidate,refetch,캐시,버그,동기화,실무버그,프론트엔드`
