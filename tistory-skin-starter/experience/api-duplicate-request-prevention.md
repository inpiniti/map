---
title: '같은 API가 두 번 날아갔다 — React 환경에서 중복 요청을 막는 방법'
author: dev
date: 2025-11-26
category: experience
layout: post
---

# 같은 API가 두 번 날아갔다

## 문제 상황

서버에서 이상한 중복 로그가 올라왔다. 같은 요청 파라미터로 INSERT가 두 번 실행됐다는 것이다. 오탐이 아니었다. 클라이언트에서 같은 API를 짧은 시간 안에 두 번 날린 게 확인됐다.

원인을 추적해보니 두 가지 경로가 있었다:

1. **버튼 연타**: 사용자가 저장 버튼을 빠르게 두 번 탭했다
2. **렌더링 사이드 이펙트**: 같은 조건을 구독하는 컴포넌트가 여러 개라 API 호출이 중복으로 트리거됐다

## 해결책 1 — 버튼 연타: 로딩 중 비활성화

이 쪽은 간단하다:

```jsx
const [isLoading, setIsLoading] = useState(false);

const handleSave = async () => {
  if (isLoading) return; // 진행 중이면 무시

  try {
    setIsLoading(true);
    await saveData();
  } finally {
    setIsLoading(false);
  }
};

return (
  <button onClick={handleSave} disabled={isLoading}>
    저장
  </button>
);
```

실제로 이 프로젝트에서도 커밋 `b0082a4e`에서 `fix: 버튼 연타 막음`이라는 메시지로 별도 수정이 들어갔다.  
하지만 이것만으로는 해결이 안 됐다.

## 해결책 2 — 렌더링 중복: Promise 공유

렌더링 과정에서 여러 경로로 같은 API가 호출되는 경우는 버튼 비활성화로 막을 수 없다. 근본적으로 **진행 중인 요청이 있으면 새 요청을 만들지 않고 기존 Promise를 반환**하는 방식이 필요하다.

```js
// PromiseService.js

// 진행 중인 요청을 추적하는 Map
const pendingRequests = new Map();

// 요청의 고유 키: [method, url, params]로 생성
const generateRequestKey = (method, url, params) => {
  return `${method}:${url}:${JSON.stringify(params || {})}`;
};

const callApiGet = async (url, params, config) => {
  const requestKey = generateRequestKey('GET', url, params);

  // 이미 진행 중인 동일 요청이 있으면 그 Promise를 반환
  if (pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey);
  }

  try {
    const requestPromise = Api.get(url, { ...config, params }).then(
      receiveData,
    );

    pendingRequests.set(requestKey, requestPromise);

    const result = await requestPromise;
    pendingRequests.delete(requestKey);
    return result;
  } catch (error) {
    pendingRequests.delete(requestKey);
    throw error;
  }
};
```

두 컴포넌트가 동시에 같은 API를 호출하면:

1. 첫 번째 호출: Map에 없으므로 실제 HTTP 요청 생성, Map에 Promise 저장
2. 두 번째 호출: Map에 있으므로 같은 Promise 반환 → 실제 HTTP 요청 없음
3. 완료 후: Map에서 삭제

## 이 패턴은 실제로 안전한가?

몇 가지 고려할 점이 있다.

### GET vs POST

GET 요청의 중복은 막아도 안전하다. 같은 파라미터로 조회하면 결과가 같다.  
POST/PUT 요청의 중복 방지는 더 신중해야 한다. **파라미터가 같아도 다른 의도의 요청일 수 있기 때문이다.**

예를 들어, "저장" 버튼을 두 번 누른 건 분명히 막아야 한다. 하지만 "같은 데이터를 두 번 저장하려는 의도적 재시도"와 구분이 어렵다.

이 프로젝트에서는 POST에도 동일한 패턴을 적용했지만, `JSON.stringify(data)`로 생성한 키가 완전히 같은 경우에만 중복으로 처리하므로 실제로는 버튼 연타 상황에서만 효과가 있다.

### 타임아웃 이슈

요청이 실패했을 때 `finally`에서 Map에서 삭제하지 않으면 영원히 pending 상태로 남는다. 이 코드는 `catch`에서 삭제하므로 그 문제는 없다.

```js
try {
  // ...
} catch (error) {
  pendingRequests.delete(requestKey); // ← 반드시 있어야 함
  throw error;
}
```

### React Query를 쓰면?

React Query / TanStack Query의 `useQuery`는 이미 기본적으로 중복 요청을 방지한다. 같은 `queryKey`로 여러 컴포넌트가 구독해도 실제 요청은 한 번만 날아간다.

이 프로젝트는 React Query를 부분적으로만 쓰고, 기존 axios 기반 서비스 계층을 그대로 유지하고 있어서 위 방식을 썼다. 처음부터 설계할 수 있다면 React Query로 해결하는 것이 훨씬 깔끔하다.

## 실제 중복 요청을 디버깅하는 방법

Chrome DevTools Network 탭에서 동일한 요청이 두 번 보이면 중복이다. 하지만 렌더링 중 발생하는 중복은 타이밍이 매우 짧아 육안으로 구분하기 어렵다.

더 확실한 방법:

```js
// axios 인터셉터에서 로깅
Api.interceptors.request.use((config) => {
  console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
    params: config.params,
    data: config.data,
    timestamp: Date.now(),
  });
  return config;
});
```

타임스탬프로 같은 ms 내에 같은 URL 요청이 두 번 찍히면 중복이다.

## 또 다른 중복 원인: React StrictMode

React 18의 개발 모드 StrictMode에서는 `useEffect`가 의도적으로 두 번 실행된다. API 호출이 `useEffect` 안에 있으면 개발 환경에서 항상 두 번 날아간다.

```js
useEffect(() => {
  fetchData(); // StrictMode에서 2번 실행됨
}, []);
```

이건 개발 중에만 발생하고 production에서는 1번이다. 하지만 서버 사이드에서 처리할 때 멱등성이 없는 API라면 문제가 될 수 있다. AbortController로 cleanup하는 것이 정석이다:

```js
useEffect(() => {
  const controller = new AbortController();

  fetchData({ signal: controller.signal });

  return () => controller.abort(); // 리마운트 시 이전 요청 취소
}, []);
```

## 정리

- 버튼 연타는 `disabled + isLoading` 상태로 막는다
- 렌더링 중 중복 API 호출은 `Map`으로 진행 중인 Promise를 공유해서 막는다
- React Query를 쓴다면 `queryKey` 기반으로 이미 처리되므로 별도 구현 불필요
- `catch`에서 반드시 Map에서 삭제해야 누수가 없다
- React StrictMode의 이중 실행은 별도 현상이며 AbortController로 처리한다
