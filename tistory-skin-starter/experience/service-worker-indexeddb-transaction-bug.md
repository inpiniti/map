---
title: "Service Worker + IndexedDB: 트랜잭션 충돌로 인한 데이터 유실 버그"
date: 2026-04-17
summary: "Service Worker에서 IndexedDB를 동시에 접근할 때 발생하는 트랜잭션 충돌, 데이터 유실, 그리고 실전에서 겪은 증상과 대응법을 공유합니다."
tags:
  - service-worker
  - indexeddb
  - 트랜잭션
  - 데이터 유실
  - 브라우저
---

## 문제 상황

Service Worker와 메인 스레드(페이지)가 동시에 IndexedDB에 접근할 때, 트랜잭션 충돌로 인해 데이터가 유실되거나 저장이 실패하는 문제가 있었습니다.

- 예: 백그라운드 동기화(서비스워커)와 사용자의 실시간 입력(메인 스레드)이 동시에 DB에 write
- 트랜잭션 충돌 시 일부 데이터만 저장되거나, 전체 트랜잭션이 롤백

## 실제 증상

- 일부 데이터가 저장되지 않음 (유실)
- 저장 중 에러 발생, 트랜잭션 전체 롤백
- 사용자는 "입력했는데 저장이 안 됨" 현상 경험

## 원인 분석

- IndexedDB는 단일 탭/스레드에서는 트랜잭션 충돌이 거의 없으나, Service Worker와 동시 접근 시 충돌 가능
- 특히 write 트랜잭션이 겹치면 충돌 확률이 높음
- 충돌 시 트랜잭션 전체가 롤백되어 데이터 유실

## 실전 대응 패턴

1. **트랜잭션 분리**: Service Worker와 메인 스레드가 동시에 같은 object store에 write하지 않도록 설계
2. **재시도 로직**: 트랜잭션 실패 시 일정 시간 후 재시도
3. **충돌 감지/로깅**: 트랜잭션 실패 시 원인/상황을 로깅하여 추적
4. **사용자 피드백**: 저장 실패 시 사용자에게 안내 및 재시도 옵션 제공

### 예시 코드

```js
async function safePut(db, store, value) {
  try {
    await db.put(store, value);
  } catch (e) {
    if (e.name === "TransactionInactiveError") {
      // 재시도 로직
      setTimeout(() => safePut(db, store, value), 100);
    }
  }
}
```

## 교훈

- Service Worker와 메인 스레드가 동시에 IndexedDB에 write할 때 트랜잭션 충돌/데이터 유실을 반드시 고려해야 한다
- 트랜잭션 분리, 재시도, 로깅, 사용자 피드백 등으로 데이터 유실을 최소화할 것
- QA/테스트에서 동시 write 시나리오를 반드시 검증할 것

## 추천 태그

`service-worker,indexeddb,트랜잭션,데이터유실,브라우저,실무버그,프론트엔드`
