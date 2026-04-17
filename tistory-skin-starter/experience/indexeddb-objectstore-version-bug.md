---
title: "IndexedDB: object store 버전 관리 누락으로 인한 데이터 마이그레이션 버그"
date: 2026-04-17
summary: "IndexedDB에서 object store의 버전 관리/마이그레이션을 누락해 발생한 데이터 유실/조회 불가 버그, 실제 증상, 원인, 그리고 실전에서 적용한 대응법을 공유합니다."
tags:
  - indexeddb
  - objectstore
  - 버전관리
  - 마이그레이션
  - 버그
---

## 문제 상황

IndexedDB에서 object store의 스키마(필드/인덱스 등)를 변경할 때, 버전 관리/마이그레이션을 누락해 데이터가 유실되거나 조회가 불가능해지는 버그가 있었습니다.

- object store에 필드/인덱스 추가 등 스키마 변경
- 버전 업그레이드/마이그레이션 로직 누락

## 실제 증상

- 앱 업데이트 후 기존 데이터가 조회되지 않음
- 일부 데이터가 유실되거나, object store가 초기화됨

## 원인 분석

- IndexedDB는 DB 버전이 올라갈 때 onupgradeneeded에서 마이그레이션을 처리해야 함
- object store/인덱스 변경 시 버전 업그레이드/마이그레이션 누락 시 데이터 유실/조회 불가

## 실전 대응 패턴

1. **버전 관리/마이그레이션 로직 구현**: object store/인덱스 변경 시 반드시 onupgradeneeded에서 마이그레이션 처리
2. **기존 데이터 보존**: 마이그레이션 시 기존 데이터 백업/이관
3. **QA/테스트에서 버전 업그레이드 시나리오 검증**

### 예시 코드

```js
const request = indexedDB.open('mydb', 2)
request.onupgradeneeded = (event) => {
  const db = event.target.result
  if (!db.objectStoreNames.contains('photos')) {
    db.createObjectStore('photos', { keyPath: 'id' })
  }
  // 기존 데이터 마이그레이션 로직 추가
}
```

## 교훈

- IndexedDB object store/인덱스 변경 시 버전 관리/마이그레이션을 반드시 구현할 것
- QA/테스트에서 버전 업그레이드/마이그레이션 시나리오를 반드시 검증할 것
