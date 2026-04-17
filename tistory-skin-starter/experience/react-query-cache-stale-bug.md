---
title: "React Query: stale cache(오래된 캐시)로 인한 데이터 미동기화 버그"
date: 2026-04-17
summary: "React Query에서 stale cache(오래된 캐시)로 인해 데이터가 동기화되지 않는 문제, 실제 증상, 원인, 그리고 실전에서 적용한 대응법을 공유합니다."
tags:
  - react-query
  - stale
  - 캐시
  - 데이터동기화
  - 버그
---

## 문제 상황

React Query는 캐시된 데이터가 stale(오래됨) 상태일 때 자동으로 refetch를 트리거하지만, 특정 상황에서는 stale cache가 남아 데이터가 동기화되지 않는 문제가 있었습니다.

- 쿼리의 staleTime이 길게 설정되어 있음
- 데이터가 변경됐지만, 캐시가 남아있어 UI가 갱신되지 않음

## 실제 증상

- 데이터 수정/등록 후, 화면에 변경 내용이 반영되지 않음
- 사용자는 "저장했는데 안 바뀜" 현상 경험
- 새로고침해야만 정상 데이터 노출

## 원인 분석

- staleTime이 길게 설정되어 있으면, 캐시가 오래 남아있음
- invalidate/refetch가 누락되면, 오래된 캐시가 계속 사용됨

## 실전 대응 패턴

1. **staleTime 조정**: 데이터 특성에 맞게 staleTime을 짧게 설정
2. **mutation 후 invalidate/refetch 습관화**: 데이터 변경 후 반드시 invalidate/refetch 호출
3. **QA/테스트에서 stale cache 시나리오 검증**

### 예시 코드

```js
const query = useQuery(['myKey'], fetchData, {
  staleTime: 1000 * 10, // 10초
})

const mutation = useMutation(updateData, {
  onSuccess: () => {
    queryClient.invalidateQueries(['myKey'])
  },
})
```

## 교훈

- React Query의 stale cache로 인한 데이터 미동기화 문제를 반드시 고려해야 한다
- staleTime, invalidate/refetch, QA 등으로 데이터 동기화를 보장할 것
- QA/테스트에서 stale cache 시나리오를 반드시 검증할 것
