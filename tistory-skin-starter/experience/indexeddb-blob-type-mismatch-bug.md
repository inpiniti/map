---
title: "IndexedDB: Blob 타입 불일치로 인한 데이터 저장/조회 버그"
date: 2026-04-17
summary: "IndexedDB에 Blob 데이터를 저장/조회할 때 타입 불일치로 발생하는 버그, 실제 증상, 원인, 그리고 실전에서 적용한 해결법을 공유합니다."
tags:
  - indexeddb
  - blob
  - 타입
  - 버그
  - 브라우저
---

## 문제 상황

IndexedDB에 Blob 데이터를 저장/조회할 때, 타입 불일치로 인해 데이터가 깨지거나, 조회 시 오류가 발생하는 버그가 있었습니다.

- Blob 타입으로 저장했으나, 조회 시 타입이 달라짐
- 브라우저/라이브러리별로 Blob 타입 처리 방식이 다름

## 실제 증상

- 저장한 Blob(사진 등)을 조회할 때, 타입이 File/ArrayBuffer 등으로 변환되어 오류 발생
- 이미지 미리보기 등에서 "이미지 깨짐" 현상

## 원인 분석

- IndexedDB는 Blob 타입을 지원하지만, 저장/조회 시 타입 정보가 완전히 보존되지 않을 수 있음
- 브라우저/라이브러리별로 Blob 처리 방식이 다름

## 실전 대응 패턴

1. **타입 체크/변환**: 조회 시 Blob 타입을 명확히 체크하고, 필요시 변환
2. **File/ArrayBuffer 변환 지원**: Blob → File, Blob → ArrayBuffer 등 변환 로직 구현
3. **브라우저별 테스트**: 다양한 브라우저에서 Blob 저장/조회 시나리오 검증

### 예시 코드

```js
const blob = await db.get("photos", id);
if (!(blob instanceof Blob)) {
  // 타입 변환
  const fixedBlob = new Blob([blob], { type: "image/jpeg" });
}
```

## 교훈

- IndexedDB에 Blob 저장/조회 시 타입 불일치 문제를 반드시 고려해야 한다
- 타입 체크/변환, 브라우저별 테스트 등으로 데이터 유실/깨짐을 예방할 것
- QA/테스트에서 Blob 타입 시나리오를 반드시 검증할 것

## 추천 태그

`indexeddb,blob,타입,버그,브라우저,실무버그,프론트엔드`
