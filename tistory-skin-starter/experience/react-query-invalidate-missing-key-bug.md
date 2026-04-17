---
title: "React Query: invalidateQueries 키 누락으로 캐시 미갱신 버그"
date: 2026-04-17
summary: "React Query에서 invalidateQueries 호출 시 key를 누락해 캐시가 갱신되지 않는 문제와, 실제 서비스 장애로 이어진 사례, 그리고 안전한 invalidate 패턴을 공유합니다."
tags:
  - react-query
  - 캐시
  - invalidate
  - 버그
  - react
---

## 문제 상황

React Query를 사용해 API 캐싱/동기화를 구현할 때, `invalidateQueries` 호출 시 key를 명확히 지정하지 않으면 의도한 쿼리의 캐시가 갱신되지 않는 문제가 있었습니다.

- `invalidateQueries()`에 key를 빠뜨리면 전체 쿼리 또는 아무 쿼리도 invalidate되지 않음
- 실제로는 특정 key만 invalidate해야 하는데, 실수로 누락

## 실제 증상

- 데이터 수정/등록 후, 리스트/상세 등 화면에 변경 내용이 반영되지 않음
- 사용자는 "저장했는데 안 바뀜" 현상 경험
- 새로고침해야만 정상 데이터 노출

## 원인 분석

React Query의 `invalidateQueries`는 key를 명확히 지정해야 해당 쿼리만 invalidate됩니다. key를 생략하거나 잘못 지정하면 캐시가 남아있어 UI가 갱신되지 않습니다.

```js
// 잘못된 예시
queryClient.invalidateQueries() // 아무 쿼리도 invalidate되지 않음

// 올바른 예시
queryClient.invalidateQueries(['userList'])
```

## 실전 대응 패턴

1. **invalidateQueries 호출 시 항상 key 명시**: string/배열 형태로 정확히 지정
2. **mutation 성공 후 invalidateQueries 습관화**: useMutation의 onSuccess에서 반드시 호출
3. **테스트/QA에서 캐시 미갱신 케이스 체크**

### 예시 코드

```js
const mutation = useMutation(updateUser, {
  onSuccess: () => {
    queryClient.invalidateQueries(['userList'])
  },
})
```

## 교훈

- React Query의 invalidateQueries는 key를 명확히 지정하지 않으면 아무 쿼리도 invalidate되지 않을 수 있다
- mutation 후 캐시 갱신이 안 되는 현상은 대부분 key 누락/오타에서 발생
- QA/테스트에서 반드시 캐시 미갱신 케이스를 체크할 것
