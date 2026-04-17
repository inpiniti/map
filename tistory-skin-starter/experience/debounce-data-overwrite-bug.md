---
title: 계량기 교체 입력값이 사라지는 버그 - Debounce가 데이터를 덮어쓰다
author: JUNG YoungKyun
date: 2026-04-17
category: experience
layout: post
---

실무에서 만난 버그 중 원인 파악이 특히 까다로웠던 케이스입니다.
계량기 교체 작업 화면에서 **입력한 데이터가 간헐적으로 사라지는** 현상이 보고됐습니다.

## 현상

- 계량기 교체 정보를 순서대로 입력 중 특정 필드 값이 초기화됨
- 재현이 불규칙해서 처음엔 단순 실수로 오해
- 특히 Select(드롭다운) 선택 후 키패드 입력 시 발생 빈도가 높음

## 원인 분석

컴포넌트 내부 구조를 보면 다음과 같은 흐름이었습니다.

```jsx
// 문제가 된 구조
const debouncedOnChange = useRef(
  createDebounce((payload) => {
    onChange(payload); // 부모에게 상태 전달
  }, 500),
).current;

const memoizedHandleChange = (arg) => {
  const updatedPayload = {
    ...payload, // 현재 로컬 state 기준으로 병합
    ...arg,
  };
  setPayload(updatedPayload);
  debouncedOnChange(updatedPayload);
};
```

**문제의 핵심**: Select 선택(즉시 반영)과 키패드 입력(Debounce 500ms)이 같은 `memoizedHandleChange`를 사용했습니다.

### 데이터 덮어쓰기 시나리오

```text
T+0ms:  Select로 제조사 "A사" 선택 → payload = { maker: "A사" }
              → debouncedOnChange({ maker: "A사" }) 예약됨 (500ms 후)

T+100ms: 키패드로 시리얼 "12345" 입력 → payload = { maker: "A사", serial: "12345" }
              → debouncedOnChange({ maker: "A사", serial: "12345" }) 새로 예약

T+500ms: T+0의 debounce 클로저 실행 → onChange({ maker: "A사" }) ← serial 없음!
              → 부모 상태가 serial 없이 덮임
```

500ms debounce 딜레이 동안 이전 클로저가 **구 버전 payload**를 갖고 있다가 나중에 실행되는 구조였습니다.

## 해결 방법

입력 성격에 따라 두 핸들러를 분리했습니다.

```jsx
// 키패드: debounce 유지, 단 시간 단축
const debouncedOnChange = useRef(
  createDebounce((payload) => {
    onChange(payload);
  }, 200), // 500 → 200ms로 단축
).current;

const memoizedHandleChange = (arg) => {
  const updatedPayload = { ...payload, ...arg };
  setPayload(updatedPayload);
  debouncedOnChange(updatedPayload);
};

// Select, 날짜 선택 등: debounce 없이 즉시 반영
const handleChange = (arg) => {
  const updatedPayload = { ...payload, ...arg };
  setPayload(updatedPayload);
  onChange(updatedPayload); // 즉시 호출
};
```

Select는 `handleChange`, 키패드는 `memoizedHandleChange`로 분기 처리했습니다.

## 배운 점

- **Debounce는 "마지막 값만 전달"하는 기법**이므로, 서로 다른 입력 소스가 섞이면 충돌이 생긴다
- 입력 방식마다 반응 속도 요구사항이 다르다 (키패드 = 타이핑, Select = 원클릭 완료)
- 클로저가 `payload` 스냅샷을 캡처하는 시점과 debounce 실행 시점의 차이를 항상 의식해야 한다

## 체크리스트

- [ ] 같은 onChange를 여러 입력 타입이 공유할 때 debounce 적용 여부를 개별 검토했는가?
- [ ] debounce delay 안에 다른 입력이 발생할 수 있는 시나리오를 고려했는가?
- [ ] 즉시 반영이 필요한 UI(Select, 토글 등)에 debounce가 불필요하게 붙어 있지 않은가?

## 추천 태그

`react,debounce,useState,클로저,실무버그,계량기교체,데이터누락,프론트엔드`
