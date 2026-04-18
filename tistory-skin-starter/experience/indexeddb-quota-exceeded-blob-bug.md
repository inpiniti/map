---
title: "IndexedDB: 대용량 Blob 저장 시 QuotaExceededError와 데이터 유실 경험"
date: 2026-04-17
summary: "IndexedDB에 대용량 Blob(사진 등)을 저장할 때 발생하는 QuotaExceededError, 데이터 유실, 그리고 실전에서 겪은 증상과 대응법을 공유합니다."
tags:
  - indexeddb
  - blob
  - quota
  - 브라우저
  - 데이터 유실
---

## 문제 상황

IndexedDB에 사진/파일 등 대용량 Blob 데이터를 저장할 때, 브라우저별로 저장 용량 제한(Quota)이 다르고, 초과 시 QuotaExceededError가 발생합니다. 이로 인해 데이터가 일부만 저장되거나, 전체 트랜잭션이 롤백되어 데이터 유실이 발생할 수 있습니다.

## 실제 증상

- 여러 장의 사진을 한 번에 저장 시, 일부만 저장되고 나머지는 유실
- 저장 중간에 QuotaExceededError 발생 → 전체 트랜잭션 롤백
- 사용자는 "사진이 저장되지 않음" 현상 경험

## 원인 분석

- IndexedDB는 브라우저/OS별로 저장 용량 제한이 다름 (수십 MB~수백 MB)
- Blob(사진 등) 저장 시, 용량이 급격히 증가
- QuotaExceededError 발생 시 트랜잭션 전체가 롤백되어 일부 데이터만 남거나 모두 유실

## 실전 대응 패턴

1. **저장 전 용량 체크**: Blob 크기, 남은 용량 추정
2. **트랜잭션 단위 저장**: 여러 파일을 한 번에 저장하지 않고, 개별 트랜잭션으로 분할
3. **에러 핸들링**: QuotaExceededError 발생 시 사용자에게 안내 및 재시도 옵션 제공
4. **저장 성공/실패 개별 피드백**: 어떤 파일이 저장됐고, 어떤 파일이 실패했는지 명확히 표시

### 예시 코드

```js
try {
  await db.put("photos", blob);
} catch (e) {
  if (e.name === "QuotaExceededError") {
    alert("저장 용량이 초과되었습니다. 일부 사진이 저장되지 않을 수 있습니다.");
  }
}
```

## 교훈

- IndexedDB에 대용량 Blob 저장 시 QuotaExceededError와 데이터 유실을 반드시 고려해야 한다
- 트랜잭션 분할, 에러 핸들링, 사용자 피드백 등으로 데이터 유실을 최소화할 것
- 브라우저/OS별 용량 제한을 미리 파악하고, QA에서 대용량 저장 시나리오를 반드시 테스트할 것

## 추천 태그

`indexeddb,blob,quota,브라우저,데이터유실,실무버그,프론트엔드`
