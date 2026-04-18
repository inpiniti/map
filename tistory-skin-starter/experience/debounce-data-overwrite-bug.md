---
title: Debounce가 입력값을 덮어쓰는 버그 – React 클로저 스냅샷 문제 해결기
description: React에서 Debounce와 Select 입력이 같은 onChange를 공유할 때 발생하는 데이터 덮어쓰기 버그. 클로저 캡처 시점 문제의 원인부터 핸들러 분리, useRef 최신값 유지, flush 전략까지 실무 해결법을 정리합니다.
author: JUNG YoungKyun
date: 2026-04-17
category: experience
layout: post
tags: [React, Debounce, 클로저, useState, 실무버그, 프론트엔드, 입력핸들러]
---

실무에서 만난 버그 중 원인 파악이 특히 까다로웠던 케이스입니다.
계량기 교체 작업 화면에서 **입력한 데이터가 간헐적으로 사라지는** 현상이 보고됐습니다.

재현이 불규칙하고 특정 입력 순서에서만 나타나서 처음에는 사용자 실수로 오해하기 쉬웠습니다. 결국 원인은 Debounce 클로저가 오래된 스냅샷을 잡고 있다가 나중에 실행되면서 최신 상태를 덮어씌우는 구조 문제였습니다.

---

<!-- [이미지 프롬프트]: 타임라인 다이어그램. 가로축은 시간(T+0ms, T+100ms, T+500ms), 두 개의 입력 이벤트(Select 선택, 키패드 입력)와 Debounce 실행 타이밍을 화살표와 블록으로 시각화. 어떤 시점에 구 버전 payload가 실행되는지 빨간색으로 강조. 개발 기술 블로그 인포그래픽 스타일. -->

## 현상

- 계량기 교체 정보를 순서대로 입력하는 도중 특정 필드 값이 초기화됨
- 재현이 불규칙해서 처음엔 단순 사용자 실수로 오해함
- 특히 **Select(드롭다운) 선택 직후 키패드로 값을 입력**하는 순서에서 발생 빈도가 높음
- 빠르게 입력할수록 재현 확률이 높아짐

### 재현 조건

재현이 까다로웠던 이유가 있습니다. 버그는 두 가지 조건이 동시에 맞아야 발생합니다.

1. Select 선택 이후 **500ms 이내에** 키패드 입력이 발생할 것
2. Select 선택이 debounce 타이머를 먼저 예약한 상태일 것

사용자가 천천히 입력하면 나타나지 않고, 자연스러운 속도로 연달아 입력하면 거의 매번 재현됩니다. QA 환경에서 신중하게 테스트할수록 안 보이고, 실제 업무 속도로 쓸 때 나타나는 전형적인 패턴이었습니다.

---

## 원인 분석 – Debounce와 클로저 캡처 시점의 충돌

### 문제가 된 코드 구조

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

**문제의 핵심**: Select 선택(즉시 반영이 맞는 동작)과 키패드 입력(Debounce가 필요한 동작) 모두가 같은 `memoizedHandleChange`를 통해 `debouncedOnChange`를 호출했습니다.

### 데이터 덮어쓰기 시나리오

```text
T+0ms:   Select로 제조사 "A사" 선택
           → payload = { maker: "A사" }
           → debouncedOnChange({ maker: "A사" }) 예약됨 (500ms 후 실행 예정)

T+100ms: 키패드로 시리얼 "12345" 입력
           → payload = { maker: "A사", serial: "12345" }
           → debouncedOnChange({ maker: "A사", serial: "12345" }) 새로 예약
           → 이전 예약은 cancel 되지 않음 (debounce가 cancel을 안 함)

T+500ms: T+0에서 예약된 클로저가 실행됨
           → onChange({ maker: "A사" })  ← serial이 없음!
           → 부모 state가 serial 없이 덮어씌워짐
```

500ms 딜레이 동안 **T+0에서 생성된 클로저가 그 시점의 payload 스냅샷을 캡처한 채** 대기하고 있다가 실행됩니다. 그 사이에 state가 아무리 바뀌어도 클로저 내부 값은 그대로입니다.

### 왜 클로저가 오래된 값을 갖는가

JavaScript 클로저는 함수가 **생성된 시점**의 변수를 캡처합니다. `debouncedOnChange`에 전달된 `payload` 인자는 호출 당시의 값이 그대로 고정됩니다. React의 `useState`로 관리되는 `payload`가 나중에 업데이트되어도, 이미 클로저 안에 들어간 값은 바뀌지 않습니다.

```jsx
// 이 함수가 T+0ms에 호출될 때
debouncedOnChange({ maker: "A사" });
// 내부적으로 이렇게 동작
setTimeout(() => {
  onChange({ maker: "A사" }); // T+0 당시의 값이 고정됨
}, 500);
```

`useRef`로 debounce 함수 자체를 마운트 시점에 한 번만 생성하는 패턴에서 이 문제가 특히 잘 발생합니다. ref는 리렌더와 무관하게 동일한 함수 인스턴스를 유지하기 때문에, 매번 최신 state를 참조하는 구조가 아니면 클로저 스냅샷 문제를 피하기 어렵습니다.

---

## 해결 방법

### 방법 1: 입력 성격에 따라 핸들러를 분리 (채택한 방법)

근본적인 해결은 **즉시 반영이 필요한 입력과 Debounce가 필요한 입력을 처음부터 분리**하는 것입니다.

```jsx
// 키패드 입력: debounce 유지, delay 단축
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

// Select, 날짜 선택, 토글 등: debounce 없이 즉시 반영
const handleChange = (arg) => {
  const updatedPayload = { ...payload, ...arg };
  setPayload(updatedPayload);
  onChange(updatedPayload); // 즉시 호출
};
```

사용하는 쪽에서는 이렇게 분기합니다.

```jsx
// Select, 날짜 입력
<SelectField onChange={handleChange} />

// 키패드 입력
<KeypadField onChange={memoizedHandleChange} />
```

Select는 한 번의 클릭으로 값이 확정되므로 Debounce가 필요 없습니다. 키패드는 한 글자씩 입력되므로 Debounce가 유효하게 동작합니다. 이 둘을 같은 핸들러로 묶을 이유가 없었던 것입니다.

---

### 방법 2: useRef로 항상 최신 payload를 참조하게 하는 방법

핸들러 분리가 어렵거나 구조를 크게 바꾸기 힘든 상황이라면, ref를 이용해 debounce 콜백이 항상 최신 값을 바라보게 만들 수 있습니다.

```jsx
const payloadRef = useRef(payload);

// payload state가 바뀔 때마다 ref를 동기화
useEffect(() => {
  payloadRef.current = payload;
}, [payload]);

const debouncedOnChange = useRef(
  createDebounce(() => {
    // 클로저 캡처 대신 ref에서 최신값을 가져옴
    onChange(payloadRef.current);
  }, 300),
).current;
```

이 방법은 클로저가 `payloadRef`라는 mutable한 객체를 캡처하기 때문에, 실행 시점의 `payloadRef.current`는 항상 최신 state를 반영합니다. 다만 `payloadRef`와 `payload` 동기화 타이밍이 정확한지, effect 의존성이 빠지지 않았는지 주의해야 합니다.

---

### 방법 3: Debounce 함수에 flush 기능을 활용하는 방법

lodash의 `debounce`처럼 `flush()` 메서드를 제공하는 구현이라면, Select 선택 시 기존에 대기 중인 debounce를 즉시 실행(flush)하고 새 값으로 다시 예약하는 방식도 있습니다.

```jsx
const debouncedOnChange = useRef(
  debounce((payload) => {
    onChange(payload);
  }, 300),
).current;

const handleSelectChange = (arg) => {
  // 기존 debounce 대기 중인 것이 있다면 즉시 실행
  debouncedOnChange.flush();
  const updatedPayload = { ...payload, ...arg };
  setPayload(updatedPayload);
  onChange(updatedPayload); // Select는 즉시 반영
};
```

이 방법은 기존 debounce 인스턴스 하나를 유지하면서도 Select 선택 시 타이머를 깨끗하게 비울 수 있다는 장점이 있습니다. 다만 커스텀 debounce 구현이라면 `flush` 기능이 없는 경우도 있으므로 사용 전 확인이 필요합니다.

---

<!-- [이미지 프롬프트]: 세 가지 해결 방법을 나란히 비교한 표나 카드 형태의 이미지. "핸들러 분리", "useRef 최신값 참조", "flush 활용" 각 방법의 핵심 아이디어와 장단점을 깔끔하게 정리. 개발 기술 블로그에 어울리는 다크 테마 또는 화이트 배경의 정보 카드 스타일. -->

## 세 가지 방법 비교

| 방법 | 구조 변경 | 적용 난이도 | 주의사항 |
|---|---|---|---|
| 핸들러 분리 | 중간 | 낮음 | 입력 타입별 명확한 분기 필요 |
| useRef 최신값 참조 | 낮음 | 중간 | effect 동기화 타이밍 주의 |
| flush 활용 | 낮음 | 낮음 | debounce 구현이 flush를 지원해야 함 |

이번 케이스에서는 **핸들러 분리**를 선택했습니다. 코드를 이해하는 사람이 입력 타입별로 의도를 명확하게 파악할 수 있고, 나중에 유지보수할 때 혼선이 가장 적기 때문입니다.

---

## 핵심 교훈

Debounce는 "마지막 입력만 전달"하는 기법입니다. 이 성질이 단일 입력 소스에서는 잘 동작하지만, 성격이 다른 여러 입력 소스가 하나의 debounce 채널을 공유하면 충돌이 발생합니다.

이 버그에서 진짜 문제는 Debounce 자체가 아니었습니다. Select와 키패드가 "같은 핸들러를 써야 한다"는 암묵적 가정이 문제였습니다. UI 입력의 성격이 다르면 핸들러도 다르게 설계해야 한다는 것이 이번에 얻은 가장 중요한 교훈입니다.

그리고 클로저가 언제, 무엇을 캡처하는지 항상 의식해야 합니다. `useRef`로 생성된 debounce 함수는 마운트 시점에 한 번만 생성됩니다. 그 이후 state가 바뀌어도 클로저 내부 값은 자동으로 갱신되지 않습니다. 이 사실을 모르면 비슷한 버그를 다른 맥락에서 반복해서 만나게 됩니다.

---

## 검토 체크리스트

- 같은 `onChange` 핸들러를 여러 입력 타입(키패드, Select, 토글 등)이 공유할 때, debounce 적용 여부를 개별적으로 검토했는가?
- debounce delay 시간 내에 다른 입력이 발생할 수 있는 시나리오를 의도적으로 테스트했는가?
- 즉시 반영이 필요한 UI(Select, 라디오, 토글 등)에 불필요한 debounce가 붙어 있지 않은가?
- `useRef`로 생성한 함수가 최신 state를 참조하고 있는지, 아니면 마운트 시점 스냅샷을 갖고 있는지 확인했는가?
- 커스텀 debounce 구현이라면 이전 타이머가 올바르게 cancel되는 방식인지 검증했는가?
