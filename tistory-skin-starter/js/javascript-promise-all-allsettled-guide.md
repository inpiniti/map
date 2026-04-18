---
title: JavaScript Promise.all vs allSettled - 병렬 처리에서 실패를 다루는 실전 패턴
author: JUNG YoungKyun
date: 2026-04-17
category: js
layout: post
---

여러 API를 동시에 호출할 때 Promise 조합을 잘못 고르면 화면이 통째로 깨질 수 있습니다.
이번 글은 실무 병렬 처리에서 가장 많이 쓰는 패턴을 다룹니다.

## 1) Promise.all

모든 작업이 성공해야 결과를 반환합니다.
하나라도 실패하면 즉시 reject 됩니다.

```javascript
const [user, posts, notifications] = await Promise.all([
  fetchUser(),
  fetchPosts(),
  fetchNotifications(),
]);
```

강한 일관성이 필요한 화면에 적합합니다.

## 2) Promise.allSettled

성공/실패를 모두 배열로 받습니다.
부분 성공 UI에 적합합니다.

```javascript
const results = await Promise.allSettled([
  fetchUser(),
  fetchPosts(),
  fetchNotifications(),
]);

const [userRes, postsRes, notiRes] = results;

if (userRes.status === "fulfilled") {
  renderUser(userRes.value);
}
if (postsRes.status === "fulfilled") {
  renderPosts(postsRes.value);
}
if (notiRes.status === "rejected") {
  showToast("알림을 불러오지 못했습니다.");
}
```

## 3) 무엇을 선택해야 하나?

- 핵심 데이터가 하나라도 없으면 화면 의미가 없는 경우: Promise.all
- 일부 데이터 실패를 허용하고 나머지라도 보여줘야 하는 경우: allSettled

## 4) 실무 패턴: 핵심 + 부가 분리

```javascript
const core = await Promise.all([fetchUser(), fetchPermissions()]);
const extras = await Promise.allSettled([
  fetchBanner(),
  fetchRecommendations(),
]);
```

핵심은 강하게, 부가는 유연하게 가져가면 장애 대응이 좋아집니다.

## 5) 흔한 실수

- Promise.all 내부에 순차 await를 넣어 병렬이 깨짐
- 에러 핸들링 없이 통째로 실패
- 사용자에게 실패 이유를 전혀 노출하지 않음

## 마무리

병렬 처리의 핵심은 "속도"가 아니라 "실패 전략"입니다.
화면 성격에 맞춰 all과 allSettled를 섞어 쓰면 장애 상황에서도 UX를 지킬 수 있습니다.

## 추천 태그

`javascript,promise,async-await,promise-all,allsettled,frontend,api,실무패턴`
