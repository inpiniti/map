---
title: "React 커스텀 키패드 + IME(한글/일본어) 입력 버그와 해결법"
date: 2026-04-17
summary: "React에서 커스텀 키패드와 IME(한글/일본어) 입력이 충돌해 발생하는 입력 버그, 실제 증상, 원인, 그리고 실전에서 적용한 해결법을 공유합니다."
tags:
  - react
  - ime
  - 커스텀키패드
  - 한글입력
  - 버그
---

## 문제 상황

React에서 커스텀 키패드(가상 키보드)를 구현할 때, IME(한글/일본어 등 조합형 입력기)와 충돌해 입력이 꼬이거나, 조합 중인 글자가 잘못 입력되는 버그가 있었습니다.

- 커스텀 키패드에서 직접 input value를 조작
- IME 조합 중에 value를 set하면 조합이 깨짐

## 실제 증상

- 한글/일본어 입력 중 커스텀 키패드로 숫자/문자 입력 시, 조합 중인 글자가 사라지거나 잘못 입력됨
- 사용자는 "입력이 꼬임", "글자가 사라짐" 현상 경험

## 원인 분석

- IME 조합 중에는 input value를 직접 set하면 안 됨
- React의 onChange/onInput 이벤트와 커스텀 키패드 이벤트가 충돌
- IME 조합 상태는 compositionstart/compositionend 이벤트로 감지 가능

## 실전 대응 패턴

1. **composition 이벤트 감지**: input에서 compositionstart~end 사이에는 커스텀 키패드 입력을 막음
2. **조합 종료 후 value set**: compositionend 이후에만 value를 set
3. **상태 플래그 활용**: isComposing 플래그로 조합 상태 관리

### 예시 코드

```js
function MyInput() {
  const [isComposing, setIsComposing] = useState(false)
  const handleCompositionStart = () => setIsComposing(true)
  const handleCompositionEnd = () => setIsComposing(false)
  const handleKeypadInput = (val) => {
    if (!isComposing) setValue(prev => prev + val)
  }
  return (
    <input
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      // ...
    />
    // 커스텀 키패드 버튼에서 handleKeypadInput 호출
  )
}
```

## 교훈

- 커스텀 키패드 + IME 입력 조합 시 composition 이벤트를 반드시 감지해 충돌을 방지해야 한다
- isComposing 플래그, composition 이벤트 활용으로 입력 꼬임/유실을 예방할 것
- QA/테스트에서 한글/일본어 등 IME 입력 시나리오를 반드시 검증할 것
