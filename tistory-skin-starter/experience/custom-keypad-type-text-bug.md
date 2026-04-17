---
title: '모바일 앱에서 커스텀 숫자 키패드를 만들 때 빠지는 함정 — type=text 이슈'
author: dev
date: 2026-03-18
category: experience
layout: post
---

# 모바일 앱에서 커스텀 숫자 키패드를 만들 때 빠지는 함정

## 왜 커스텀 키패드를 만드나

모바일 반응형 웹앱에서 숫자 입력창을 만들면 보통 `<input type="number">`를 쓴다. 그러면 디바이스 기본 숫자 키패드가 뜬다. 상식적인 방법이다.

그런데 현장 앱에서는 이것으로 충분하지 않았다. 이유는 여러 가지다:

- 소수점 입력 방지가 필요한 필드인데, 기본 키패드에서는 `.`이 항상 보인다
- 계량기 지침 입력처럼 자릿수 제한 + 특수 규칙이 있는 경우
- Android 기기마다 기본 키패드 UI가 달라서 사용성이 일관되지 않다
- WebView에서 `type="number"` input에 포커스가 갈 때 레이아웃이 밀리는 버그가 기기마다 다르다

그래서 커스텀 숫자 키패드 컴포넌트(`CustomKeypadInput`)를 만들었다.

## 커스텀 키패드의 구조

숫자 버튼을 탭하면 JS로 값을 조작한다. 실제 `<input>`은 `readOnly`로 두고 커스텀 UI만 보여준다.

```jsx
const CustomKeypadInput = forwardRef(({ type = 'number', value, onChange, ... }, ref) => {
  const handleDigitPress = (digit) => {
    let newValue = keyValue

    if (type === 'number') {
      // 숫자 누적: "123" → 누르면 → "1234"
      newValue = currentValue + String(digit)
    }
    // ...
    onChange(newValue)
  }

  return (
    <>
      <input type={type} readOnly value={keyValue} />
      <KeypadSheet onDigitPress={handleDigitPress} />
    </>
  )
})
```

## 예상치 못한 버그

Vite 마이그레이션 과정에서 일부 필드에 `type="text"`를 전달하는 케이스가 생겼다. 원래 `type="number"`만 상정하고 만든 컴포넌트였는데, 이 경우 아무것도 안 쳐졌다.

```jsx
// 호출하는 쪽
<CustomKeypadInput type="text" value={meterNo} onChange={setMeterNo} />
```

코드를 보니 이런 식이었다:

```jsx
const handleDigitPress = (digit) => {
  let newValue = currentValue;

  if (type === 'number') {
    // 숫자 타입 처리
    newValue = handleNumberInput(currentValue, digit);
  }
  // else: 아무것도 안 함 ← 버그의 원인

  onChange(newValue);
  keyValueRef.current = newValue;
};
```

`type === 'number'`인 경우만 처리하고, 그 외의 경우에는 `newValue`가 업데이트되지 않아 기존 값이 그대로 유지된다. 숫자를 눌러도 반응이 없었다.

## 수정

```jsx
if (type === 'number' || type === 'tel') {
  newValue = handleNumberInput(currentValue, digit);
} else {
  // type="text" 등 레거시 호환: 숫자 문자열 누적 처리
  const sanitizedDigit = String(digit).replace(/\D/g, '');
  if (!sanitizedDigit) {
    return; // 숫자가 아닌 입력은 무시
  }
  newValue = currentValue + sanitizedDigit;
}
```

간단한 수정이지만, 이 버그가 발생하기까지의 과정이 흥미롭다.

## type prop의 의미가 애매했다

원래 `type prop`이 뭘 하는 건지가 모호했다. `<input type="...">` 의 type을 그대로 전달하는 건데, 커스텀 키패드 내부에서는 이 값으로 **숫자 입력 방식**도 분기하고 있었다.

```jsx
// type의 실제 쓰임새가 두 가지로 섞여 있음
// 1. <input type={type}> → HTML input의 type 속성
// 2. if (type === 'number') → 내부 입력 처리 분기
```

`type="text"`로 전달하면 `<input type="text">`가 되어 숫자 입력창처럼 보이지 않는다. 근데 기기에 따라 WebView에서 `type="number"` input이 이상하게 동작할 때 임시방편으로 `type="text"`를 쓰게 된 것이다.

이런 경우가 꽤 흔하다. 모바일 WebView에서 `type="number"`:

- Android: 소수점 포함 키패드가 뜨거나, 마이너스 입력이 되거나, 아예 텍스트 키패드가 뜸 (기기마다 다름)
- iOS: `step` 속성이 없으면 소수점 입력 불가 처리가 안 됨
- 일부 기기: 포커스 시 레이아웃 shift 발생

그래서 개발자들이 `type="text"`로 바꾸고 직접 검증하는 방식을 택하는 경우가 많다.

## 더 좋은 설계 방향

prop 이름을 분리하는 게 더 명확하다:

```jsx
// inputType: <input>의 HTML type 속성
// valueType: 내부 입력 처리 방식 ('integer', 'decimal', 'text' 등)
<CustomKeypadInput
  inputType="text" // <input type="text">로 렌더
  valueType="integer" // 정수만 입력 받는 모드
  maxLength={7}
  onChange={setMeterValue}
/>
```

한 prop이 두 가지 의미를 가지면 분기가 꼬인다. 이번 버그도 그 때문이었다.

## 모바일 숫자 입력 팁 정리

| 상황                            | 권장 type                    | 비고                      |
| ------------------------------- | ---------------------------- | ------------------------- |
| 일반 숫자 (정수)                | `tel`                        | 숫자 키패드, 소수점 없음  |
| 전화번호                        | `tel`                        | 기본                      |
| 소수점 포함 숫자                | `number` + `step="any"`      | iOS 호환                  |
| 지침/코드 (기기 이슈 심한 경우) | `text` + inputmode="numeric" | `inputmode`로 키패드 힌트 |

`inputmode="numeric"` 속성은 `type="text"`를 유지하면서 숫자 키패드를 띄워달라는 힌트를 브라우저에게 준다. 글자는 자유롭게 입력되지만 키패드는 숫자 키패드가 뜬다. 커스텀 키패드를 쓴다면 의미가 없지만, 기본 input에서는 꽤 유용하다.

## 정리

- 하이브리드 WebView에서 `type="number"` input은 기기마다 동작이 달라 믿기 어렵다
- 커스텀 키패드를 만들 때 `type` prop의 의미를 명확히 정의하지 않으면 분기 처리에서 버그가 생긴다
- HTML input의 `type`과 내부 처리 모드는 별도 prop으로 분리하는 것이 좋다
- `type="text"` + `inputmode="numeric"`은 일관된 숫자 UI를 얻는 좋은 타협점이다
