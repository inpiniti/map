---
title: "IndexedDB: TransactionInactiveError(비활성 트랜잭션)로 인한 데이터 저장 실패 버그"
date: 2026-04-17
summary: "IndexedDB에서 TransactionInactiveError(비활성 트랜잭션)로 인해 데이터 저장이 실패하는 문제, 실제 증상, 원인, 그리고 실전에서 적용한 대응법을 공유합니다."
tags:
  - indexeddb
  - transactioninactiveerror
  - 트랜잭션
  - 버그
  - 브라우저
---

## 문제 상황

IndexedDB에서 트랜잭션이 비활성화(TransactionInactiveError)되어 데이터 저장이 실패하는 버그가 있었습니다.

- 트랜잭션이 닫힌 후에 put/add 등 DB 조작을 시도
- 비동기 코드에서 트랜잭션이 만료되어 비활성화됨

## 실제 증상

- 데이터 저장 시 TransactionInactiveError 발생
- 일부 데이터가 저장되지 않음

## 원인 분석

- IndexedDB 트랜잭션은 생성 후 일정 시간/이벤트가 지나면 자동으로 닫힘
- 비동기 코드에서 트랜잭션이 닫힌 후 조작을 시도하면 TransactionInactiveError 발생

## 실전 대응 패턴

1. **트랜잭션 내에서만 DB 조작**: 트랜잭션이 살아있는 동안에만 put/add 등 조작 수행
2. **비동기 코드 구조 개선**: await/promise 등 비동기 코드에서 트랜잭션 만료를 방지
3. **에러 핸들링/재시도**: TransactionInactiveError 발생 시 재시도 로직 구현

### 예시 코드

```js
async function safePut(db, store, value) {
  try {
    await db.put(store, value)
  } catch (e) {
    if (e.name === 'TransactionInactiveError') {
      // 재시도 로직
      setTimeout(() => safePut(db, store, value), 100)
    }
  }
}
```

## 교훈

- IndexedDB에서 TransactionInactiveError(비활성 트랜잭션)로 인한 데이터 저장 실패를 반드시 고려해야 한다
- 트랜잭션 내에서만 조작, 비동기 코드 구조 개선, 재시도 등으로 문제를 예방할 것
- QA/테스트에서 비동기 트랜잭션 만료 시나리오를 반드시 검증할 것
