---
title: "Zustand persist + IndexedDB: 초기 hydration 비동기 문제와 실전 대응"
date: 2026-04-17
summary: "Zustand persist를 IndexedDB로 마이그레이션할 때 만나는 초기 hydration 비동기화 문제와, 실제 서비스에서 발생한 빈 스토어 렌더링 이슈, 그리고 안전한 UX 패턴을 공유합니다."
tags:
  - zustand
  - indexeddb
  - localstorage
  - 비동기
  - hydration
  - react
---

## 문제 상황

Zustand의 `persist` 미들웨어를 `localStorage`에서 `IndexedDB`로 교체하면, 스토어의 초기값 hydration이 **비동기**로 이루어집니다. 이때 컴포넌트가 마운트되면, 스토어 값이 아직 비어있는 상태로 렌더링되는 현상이 실제 운영에서 발생했습니다.

- localStorage: 동기 → hydration 즉시 완료
- IndexedDB: 비동기 → hydration 완료 전까지 스토어 값이 undefined/초기값

## 실제 증상

- 페이지 진입 직후, 리스트/검색결과/캐시 등 스토어 기반 데이터가 "비어 있음"으로 잠깐 표시됨
- 이후 IndexedDB에서 데이터가 로드되면 정상적으로 렌더링됨
- 사용자 입장에서는 "깜빡임", "빈 화면", "데이터가 없는 것처럼 보임" 등의 UX 저하

## 원인 분석

Zustand persist는 `getItem`이 Promise를 반환하면 비동기로 동작합니다. hydration이 끝나기 전까지는 스토어가 초기값(혹은 undefined) 상태입니다.

```js
const useStore = create(
  persist(
    (set, get) => ({ ... }),
    {
      name: 'my-storage',
      storage: createJSONStorage(() => indexedDBStorage), // 비동기 storage
    }
  )
)
```

## 실전 대응 패턴

1. **로딩 상태 명시**: hydration이 끝날 때까지 `isHydrated` 플래그를 두고, 데이터가 준비될 때까지 스켈레톤/로딩 UI를 보여줍니다.
2. **초기값/캐시 활용**: 서버사이드 렌더링/초기 데이터 프리패치 등으로 첫 화면에 빈 값이 보이지 않게 보완
3. **스토어 hydration 이벤트 활용**: zustand의 `onRehydrateStorage` 옵션을 활용해 hydration 완료 시점을 감지

### 예시 코드

```js
const useStore = create(
  persist(
    (set, get) => ({
      data: [],
      isHydrated: false,
      setData: (d) => set({ data: d }),
    }),
    {
      name: 'my-storage',
      storage: createJSONStorage(() => indexedDBStorage),
      onRehydrateStorage: () => (state) => {
        state.isHydrated = true
      },
    }
  )
)

function MyComponent() {
  const { data, isHydrated } = useStore()
  if (!isHydrated) return <Skeleton />
  return <List data={data} />
}
```

## 교훈

- **localStorage → IndexedDB 마이그레이션 시, hydration 비동기화로 인한 빈 화면/깜빡임을 반드시 고려해야 한다**
- `isHydrated` 플래그, 스켈레톤 UI, SSR/초기값 등으로 사용자 경험을 보완할 것
- 실제 운영에서만 드러나는 문제이므로, QA/테스트 단계에서 강제로 IndexedDB 지연을 시뮬레이션해보는 것이 좋다
