---
title: "React Query: Promise deduplication(중복 요청 방지)와 실전 이슈"
date: 2026-04-17
summary: "React Query의 중복 요청 방지(Promise deduplication) 메커니즘, 실제로 발생한 race condition, 그리고 안전한 데이터 동기화 패턴을 공유합니다."
tags:
  - react-query
  - promise
  - deduplication
  - 중복요청
  - race-condition
---

## 문제 상황

React Query는 동일한 key로 여러 번 fetch를 호출하면, 내부적으로 Promise deduplication(중복 요청 방지) 기능이 동작합니다. 하지만, 의도치 않은 race condition이나, 캐시 미동기화 문제가 발생할 수 있습니다.

- 동일한 key로 여러 fetch가 동시에 발생
- 첫 번째 fetch가 끝나기 전에 두 번째 fetch가 시작되면, 두 번째는 첫 번째 Promise를 재사용
- 하지만, mutation/수정 후 바로 refetch하면, 이전 Promise가 반환되어 최신 데이터가 반영되지 않을 수 있음

## 실제 증상

- 데이터 수정 후 바로 refetch했는데, 이전(오래된) 데이터가 반환됨
- 사용자는 "저장했는데 안 바뀜" 현상 경험

## 원인 분석

- React Query는 동일 key의 fetch가 이미 진행 중이면, 새 Promise를 만들지 않고 기존 Promise를 반환
- mutation 후 바로 refetch하면, 이전 fetch의 Promise가 반환되어 race condition 발생

## 실전 대응 패턴

1. **invalidateQueries로 캐시 무효화**: mutation 후 반드시 invalidateQueries 호출
2. **refetch 시점 조정**: mutation이 완전히 끝난 후 refetch
3. **onSuccess에서 invalidate/refetch 분리**: mutation의 onSuccess에서 invalidate → refetch 순서로 호출

### 예시 코드

```js
const mutation = useMutation(updateData, {
  onSuccess: () => {
    queryClient.invalidateQueries(["myKey"]);
    queryClient.refetchQueries(["myKey"]);
  },
});
```

## 교훈

- React Query의 Promise deduplication은 race condition, 캐시 미동기화 문제를 유발할 수 있다
- mutation 후 invalidate/refetch 순서, 시점에 주의할 것
- QA/테스트에서 중복 fetch, race condition 시나리오를 반드시 검증할 것

## 추천 태그

`react-query,promise,deduplication,중복요청,race-condition,refetch,실무버그,프론트엔드`
