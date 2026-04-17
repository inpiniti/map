---
title: 개선사진에 부적합 사진이 섞여 나오는 버그 - 필터 조건 하나가 빠진 결과
author: JUNG YoungKyun
date: 2026-04-17
category: experience
layout: post
---

안전점검 화면에서 **개선권고 사진과 부적합 사진이 섞여 표시**되는 버그를 만났습니다.
코드 변경량은 단 2줄이지만, 원인을 파악하기까지 꽤 오래 걸렸습니다.

## 현상

- 점검 > 개선권고 화면에서 사진 조회 시, 부적합 항목의 사진까지 함께 표시됨
- 동일 점검 항목(`notPassItemCd`)인 경우에만 발생
- 개선사진과 부적합사진의 조회 로직이 같은 필터링 함수를 사용

## 코드 구조

사진 필터링은 `useMemo`로 구현되어 있었습니다.

```jsx
// 버그가 있던 코드
const photo = useMemo(() => {
  return selectedSafeChk?.photoList?.find(
    (_photo) =>
      detalInfo.notPassItemCd === _photo.notPassItemCd &&
      detalInfo.burnerNum === _photo.burnerNum &&
      detalInfo.chkExecNum === _photo.chkExecNum &&
      detalInfo.mtrNum === _photo.mtrNum, // ← 여기서 끝
  )?.photo;
}, [selectedSafeChk]);
```

## 원인

`photoList`에는 사진 종류를 구분하는 `gubun` 필드가 있었습니다.

| gubun | 의미       |
| ----- | ---------- |
| `'1'` | 개선사진   |
| `'2'` | 부적합사진 |

개선권고 화면에서는 `gubun === '2'`인 부적합사진만 필터링해야 하는데,
조건에서 `gubun` 검사가 빠져 있었기 때문에 두 종류 사진이 모두 매칭됐습니다.

같은 `notPassItemCd`, `burnerNum`, `chkExecNum`, `mtrNum` 조합이면 `find()`가 가장 첫 번째 항목을 반환하므로, 배열 순서에 따라 개선사진이 나오거나 부적합사진이 나왔습니다.

## 수정

```jsx
// 수정된 코드
const photo = useMemo(() => {
  return selectedSafeChk?.photoList?.find(
    (_photo) =>
      detalInfo.notPassItemCd === _photo.notPassItemCd &&
      detalInfo.burnerNum === _photo.burnerNum &&
      detalInfo.chkExecNum === _photo.chkExecNum &&
      detalInfo.mtrNum === _photo.mtrNum &&
      _photo.gubun === '2', // 부적합 사진만 필터링
  )?.photo;
}, [selectedSafeChk]);
```

조건 하나 추가로 해결됐습니다.

## 왜 발견이 늦었나

1. **재현 조건이 구체적**: 같은 항목 코드 하에 부적합과 개선사진이 모두 존재하는 데이터가 필요
2. **시각적으로 유사**: 같은 항목의 사진이라 얼핏 보면 비슷하게 보임
3. **필터 로직이 별도 코드 없이 인라인으로 쓰임**: 독립 함수였다면 테스트 작성이 쉬워 더 빨리 발견됐을 수 있음

## 배운 점

- 타입/구분 코드(`gubun`, `type`, `category` 등)가 있는 데이터는 반드시 해당 조건을 필터에 포함해야 한다
- `find()`는 첫 번째 매칭만 반환하므로, 유니크하지 않은 조합으로 찾을 때 예상치 못한 값이 나올 수 있다
- 공통 필터 로직은 재사용 가능한 함수로 분리해두면 조건 누락을 테스트로 잡기 쉽다

## 체크리스트

- [ ] `find()`/`filter()` 조건에 종류 구분 필드가 빠진 것은 없는가?
- [ ] 같은 기본 키 조합으로 여러 데이터가 존재할 수 있는 구조인가?
- [ ] 해당 필터 로직에 대한 단위 테스트가 있는가?

## 추천 태그

`react,useMemo,filter,find,데이터필터링,실무버그,안전점검,프론트엔드`
