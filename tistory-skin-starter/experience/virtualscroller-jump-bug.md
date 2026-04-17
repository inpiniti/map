---
title: VirtualScroller 스크롤 시 목록이 튀는 현상 - itemSize 불일치가 원인
author: JUNG YoungKyun
date: 2026-04-17
category: experience
layout: post
---

가스 안전점검 목록 화면에서 **스크롤을 내릴 때 목록 아이템이 위아래로 튀는** 현상이 발생했습니다.
특히 빠르게 스크롤할수록 더 심하게 흔들렸습니다.

## 현상

- 사용전점검 목록(보일러 연도배관 조인트 항목)에서 스크롤 시 아이템이 튐
- 느리게 스크롤하면 정상이지만, 빠르게 넘기면 레이아웃이 깨짐
- 특정 아이템에서 다음 아이템으로 넘어갈 때 화면이 순간 점프

## 원인 분석

컴포넌트는 PrimeReact의 `VirtualScroller`를 사용하고 있었습니다.

```jsx
// 문제가 된 코드
<VirtualScroller
  className={'swipe-component boilJoint'}
  items={sortedGroupInfo}
  itemSize={50}        // ← 50px로 선언
  autoSize
  itemTemplate={(e) => Template(...)}
  style={{ width: '100%', height: '400px' }}
/>
```

CSS에서 실제 아이템 높이는 다음과 같았습니다.

```css
/* SCSS */
.virtual-scroller {
  .swipeable-cell {
    /* itemSize와 일치하는 height 없음 */
    .row-content {
      text-align: center;
    }
  }
}
```

**핵심 문제**: `VirtualScroller`는 `itemSize`를 기반으로 스크롤 위치와 렌더링할 아이템 범위를 계산합니다.
실제 DOM 렌더링된 아이템 높이가 `itemSize: 50`과 달리 약 70px였기 때문에 계산이 틀려서 스크롤 위치가 어긋났습니다.

```
선언된 itemSize: 50px
실제 렌더된 높이: ~70px
→ 차이: 20px per item
→ 5개만 스크롤해도 100px 오차 누적 → 튀는 현상
```

추가로 컨테이너 높이도 고정값 `400px`으로 지정되어 있어 화면 크기에 따라 빈 공간이 생기거나 내용이 잘렸습니다.

## 수정

```jsx
// 수정된 코드
<VirtualScroller
  className={'swipe-component boilJoint'}
  items={sortedGroupInfo}
  itemSize={70}          // 실제 높이에 맞게 수정
  autoSize
  itemTemplate={(e) => Template(...)}
  style={{ width: '100%', height: '100%' }}  // 고정값 → 부모 기준으로
/>
```

```css
/* SCSS 추가 */
.virtual-scroller {
  .swipeable-cell {
    height: 70px; /* itemSize와 일치 */
    overflow: hidden; /* 내용 넘침 방지 */
  }
}
```

CSS 높이 계산도 함께 조정했습니다.

```scss
// 수정 전
height: calc(100% - 150px) !important;

// 수정 후
height: calc(100% - 161px) !important;
```

## 배운 점

- **VirtualScroller의 `itemSize`는 반드시 실제 렌더링 높이와 일치해야 한다**. 이 값이 틀리면 스크롤 계산 전체가 무너진다.
- 실제 높이를 확인하는 가장 빠른 방법은 브라우저 DevTools에서 해당 아이템 요소를 선택해 Computed 탭에서 height를 직접 읽는 것이다.
- 고정 `height: 400px` 같은 하드코딩은 다양한 화면 크기에서 레이아웃 문제를 일으킨다. 가능하면 `height: 100%`로 부모에게 위임하는 것이 낫다.

## 가상 스크롤 사용 시 체크리스트

- [ ] `itemSize`가 실제 아이템의 렌더링된 높이(px)와 일치하는가?
- [ ] 아이템 내부에 가변 높이 요소(이미지, 동적 텍스트)가 없는가? 있다면 `autoSize` 옵션 활용
- [ ] 컨테이너 높이가 `height: 100%` 또는 명확한 값으로 지정되어 있는가?
- [ ] 아이템에 `overflow: hidden`으로 높이를 고정했는가?

## 추천 태그

`react,virtualscroller,primereact,스크롤,레이아웃버그,itemSize,실무버그,프론트엔드`
