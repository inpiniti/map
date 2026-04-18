---
title: "Zustand persist가 앱을 죽였다 — QuotaExceededError와 IndexedDB 마이그레이션"
author: dev
date: 2025-11-19
category: experience
layout: post
---

# Zustand persist가 앱을 죽였다

## 어느 날 갑자기 터진 에러

```
Uncaught QuotaExceededError: Failed to execute 'setItem' on 'Storage':
Setting the value of 'mapSearch-storage' exceeded the quota.
```

운영 중인 하이브리드 웹앱에서 갑자기 이 에러가 터졌다. 현장 직원이 지도 검색을 쓰다가 앱이 먹통이 됐다는 신고였다.

원인은 단순했다. 검색 결과(건물, 주소, 계량기 목록)를 지도 화면에서 재활용하려고 Zustand 스토어에 담았고, `persist` 미들웨어로 `localStorage`에 저장하고 있었다. 검색을 반복할수록 데이터가 쌓였고, 언젠가 브라우저의 localStorage 용량 제한(보통 5~10MB)을 초과해버린 것이다.

## localStorage는 얼마나 작은가

| 브라우저         | localStorage 제한 |
| ---------------- | ----------------- |
| Chrome           | 약 5MB            |
| Android WebView  | 약 5MB            |
| Safari/WKWebView | 약 5MB            |
| Firefox          | 약 10MB           |

5MB면 충분할 것 같지만, JSON으로 직렬화하면 생각보다 빨리 찬다. 수백 개의 검색 결과 객체가 계속 누적되면 금방 한계에 도달한다.

## 첫 번째 시도 — 그냥 지우자?

처음엔 `persist` 옵션에 `partialize`를 써서 일부 필드만 저장하려 했다. 그런데 문제는 사용자가 어떤 필드를 얼마나 많이 검색하는지 예측이 불가능했다. 언제 또 터질지 모른다.

## 근본 해결 — IndexedDB로 스토리지 교체

Zustand의 `persist` 미들웨어는 `storage` 옵션으로 커스텀 스토리지를 받는다. 인터페이스는 단순하다:

```ts
interface StateStorage {
  getItem: (name: string) => string | null | Promise<string | null>;
  setItem: (name: string, value: string) => void | Promise<void>;
  removeItem: (name: string) => void | Promise<void>;
}
```

이 인터페이스를 구현하는 IndexedDB 래퍼를 직접 만들었다:

```js
const createIndexedDBStorage = (
  dbName = "map-search-db",
  storeName = "keyval",
) => {
  const getDB = () =>
    new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName, 1);
      req.onupgradeneeded = () => {
        try {
          req.result.createObjectStore(storeName);
        } catch (e) {
          // store가 이미 있으면 무시
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

  const getRaw = async (key) => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  };

  const setRaw = async (key, value) => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const req = tx.objectStore(storeName).put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  };

  const removeRaw = async (key) => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const req = tx.objectStore(storeName).delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  };

  return {
    getItem: async (name) => {
      const res = await getRaw(name);
      return res === undefined ? null : res;
    },
    setItem: async (name, value) => setRaw(name, value),
    removeItem: async (name) => removeRaw(name),
  };
};
```

그리고 Zustand 스토어에서 이렇게 교체했다:

```js
// Before
export const useMapSearchStore = create(
  persist(
    (set, get) => ({
      /* ... */
    }),
    {
      name: "mapSearch-storage",
      storage: createJSONStorage(() => localStorage), // ← 문제의 원인
    },
  ),
);

// After
export const useMapSearchStore = create(
  persist(
    (set, get) => ({
      /* ... */
    }),
    {
      name: "mapSearch-storage",
      storage: createJSONStorage(() => createIndexedDBStorage()), // ← IndexedDB
    },
  ),
);
```

## IndexedDB의 용량은 얼마나 될까

IndexedDB는 사용 가능한 디스크 공간의 최대 60%까지 쓸 수 있다. 수 GB 단위다. localStorage의 수백 배다.

| 스토리지       | 용량  | 비동기 | 구조화 데이터 |
| -------------- | ----- | ------ | ------------- |
| localStorage   | ~5MB  | ❌     | ❌ (문자열만) |
| sessionStorage | ~5MB  | ❌     | ❌            |
| IndexedDB      | 수 GB | ✅     | ✅            |
| Cache Storage  | 수 GB | ✅     | ✅            |

## 주의: Zustand persist는 비동기 스토리지를 지원한다

`localStorage`는 동기, IndexedDB는 비동기다. Zustand `persist`는 `getItem`이 `Promise`를 반환해도 정상 처리한다. 단, 초기 hydration이 비동기로 이루어지므로 **스토어 값이 처음에 빈 상태로 렌더링**될 수 있다.

이를 처리하려면 `useHydration` 패턴을 쓰면 된다:

```js
const useHasHydrated = () => {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const unsub = useMapSearchStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });
    // 이미 hydration이 완료된 경우
    if (useMapSearchStore.persist.hasHydrated()) {
      setHasHydrated(true);
    }
    return unsub;
  }, []);

  return hasHydrated;
};
```

## 추가 방어: localStorage 레거시 정리

기존에 저장된 큰 데이터가 남아 있을 수 있다. 앱 시작 시 한번 정리하는 코드도 추가했다:

```js
// index.js (앱 진입점)
try {
  if (typeof localStorage !== "undefined") {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("meterReplacement")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }
} catch (e) {
  // 실패해도 앱은 계속 동작
}
```

## 정리

- Zustand `persist` + `localStorage` 조합은 **소량의 설정값**에만 적합하다
- 검색 결과, 목록 캐시처럼 **크기 예측이 불가능한 데이터**는 IndexedDB를 써야 한다
- Zustand의 `createJSONStorage` 인터페이스는 커스텀 비동기 스토리지를 완벽히 지원한다
- `idb-keyval` 같은 라이브러리를 쓰면 위 래퍼 코드 없이 더 깔끔하게 쓸 수 있다

`localStorage` 용량 초과는 개발 환경에서는 거의 안 터진다. 실제 운영에서 데이터가 쌓일 때 처음으로 터진다. 미리 설계 단계에서 큰 데이터는 IndexedDB로 갈 수 있도록 스토리지 전략을 잡아두는 것이 좋다.

## 추천 태그

`zustand,localstorage,indexeddb,quota,storage,프론트엔드,실무버그`
