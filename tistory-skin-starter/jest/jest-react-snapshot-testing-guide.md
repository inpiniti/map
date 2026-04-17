---
title: 리액트 컴포넌트 테스트 + 스냅샷 테스트 실전 가이드 (Jest)
author: JUNG YoungKyun
date: 2022-05-30
category: 01 jest
layout: post
---

Jest 기초 문법을 익혔다면, 이제 실제 React 컴포넌트를 테스트해볼 차례입니다.
이번 글에서는 다음 흐름으로 진행합니다.

- 컴포넌트 렌더링 테스트
- 스냅샷 테스트 작성/실패/업데이트
- 스냅샷 테스트에서 주의할 점
- 시간처럼 변하는 값을 Mock으로 고정하는 방법

## 1) React 프로젝트 준비

Create React App 기준으로 시작합니다.

```bash
npx create-react-app my-app
cd my-app
npm test
```

CRA에는 Jest와 React Testing Library가 기본 포함되어 있어 별도 설치 없이 테스트를 작성할 수 있습니다.

## 2) Hello 컴포넌트 만들기

`App.js`

```javascript
import Hello from './component/Hello';

const user = {
  name: 'Mike',
  age: 30,
};

function App() {
  return (
    <div className="App">
      <Hello user={user} />
    </div>
  );
}

export default App;
```

`component/Hello.js`

```javascript
export default function Hello({ user }) {
  return user?.name ? <h1>Hello! {user.name}</h1> : <button>Login</button>;
}
```

`user?.name`처럼 optional chaining을 쓰면 `user`가 없는 경우에도 안전합니다.

## 3) 기본 렌더링 테스트

기존 `App.test.js`가 기본 템플릿("learn react") 기준이라 실패할 수 있습니다.
이 경우 지우거나 현재 UI 기준으로 수정하면 됩니다.

`component/Hello.test.js`

```javascript
import { render, screen } from '@testing-library/react';
import Hello from './Hello';

const user = {
  name: 'Mike',
  age: 30,
};

test('Hello 텍스트가 렌더링된다', () => {
  render(<Hello user={user} />);
  const helloEl = screen.getByText(/hello/i);
  expect(helloEl).toBeInTheDocument();
});
```

## 4) 스냅샷 테스트

이름이 있는 경우/없는 경우를 나눠서 스냅샷을 찍어봅니다.

```javascript
import { render, screen } from '@testing-library/react';
import Hello from './Hello';

const user = { name: 'Mike', age: 30 };
const userWithoutName = { age: 20 };

test('snapshot: name 있음', () => {
  const { asFragment } = render(<Hello user={user} />);
  expect(asFragment()).toMatchSnapshot();
});

test('snapshot: name 없음', () => {
  const { asFragment } = render(<Hello user={userWithoutName} />);
  expect(asFragment()).toMatchSnapshot();
});

test('Hello 텍스트가 렌더링된다', () => {
  render(<Hello user={user} />);
  expect(screen.getByText(/hello/i)).toBeInTheDocument();
});
```

처음 실행하면 `__snapshots__` 폴더와 `.snap` 파일이 생성됩니다.

## 5) 스냅샷 실패를 해석하는 법

예를 들어 이름을 `Mike`에서 `Tom`으로 바꾸면 스냅샷이 실패합니다.

이때 선택지는 2가지입니다.

1. 의도된 변경이면 스냅샷 업데이트
2. 의도되지 않은 변경이면 코드 버그 수정

업데이트 명령:

```bash
npm test -- -u
```

Watch 모드에서는 `u` 키로 업데이트할 수 있습니다.

## 6) 스냅샷 업데이트를 무조건 하면 위험한 이유

스냅샷은 UI의 현재 상태를 "기록"하는 도구입니다.
버그로 바뀐 UI도 그대로 기록될 수 있으므로,
업데이트 전에는 반드시 변경이 의도된 것인지 확인해야 합니다.

## 7) 시간처럼 매번 바뀌는 값 테스트하기

시간 기반 컴포넌트는 그대로 스냅샷을 찍으면 자주 실패합니다.
이럴 때는 값을 고정해야 합니다.

예시 컴포넌트:

```javascript
export default function Timer() {
  return <div>{new Date().getSeconds()}초</div>;
}
```

테스트에서 Date를 Mock 처리:

```javascript
import { render } from '@testing-library/react';
import Timer from './Timer';

test('Timer snapshot', () => {
  jest.spyOn(Date.prototype, 'getSeconds').mockReturnValue(30);

  const { asFragment } = render(<Timer />);
  expect(asFragment()).toMatchSnapshot();

  Date.prototype.getSeconds.mockRestore();
});
```

이렇게 하면 매번 같은 결과로 테스트가 안정화됩니다.

## 8) 언제 스냅샷 테스트가 좋은가?

추천:

- UI 구조가 비교적 안정적인 컴포넌트
- 수동으로 일일이 비교하기 어려운 마크업
- 회귀(regression) 감지를 빠르게 하고 싶을 때

비추천:

- 기획 변경으로 UI가 자주 바뀌는 화면
- 너무 큰 화면 전체를 한 번에 스냅샷하는 경우

실무에서는 "작은 단위 컴포넌트" 중심으로 스냅샷을 쓰는 편이 유지보수에 유리합니다.

## 마무리

- React 컴포넌트 테스트는 `render + screen`으로 시작
- 스냅샷은 "의도된 변경"인지 확인 후 업데이트
- 시간/난수 같은 변동값은 Mock으로 고정

이 세 가지만 지켜도 스냅샷 테스트의 신뢰도를 크게 높일 수 있습니다.

## 추천 태그

`jest`, `react`, `react-testing-library`, `snapshot-test`, `unit-test`, `frontend`, `javascript`, `testing`, `ui-test`, `mock`
