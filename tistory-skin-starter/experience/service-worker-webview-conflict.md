---
title: "Service Worker가 WebView 앱을 망가뜨릴 수 있다 — 하이브리드 환경 처리"
author: dev
date: 2026-03-18
category: experience
layout: post
---

# Service Worker가 WebView 앱을 망가뜨릴 수 있다

## 문제의 시작

React 앱을 Vite로 마이그레이션하면서 Service Worker를 도입했다. 오프라인 캐싱, 더 빠른 재방문 로딩이 목적이었다. 개발 환경에서는 잘 됐다.

그런데 Android WebView로 앱을 감싼 하이브리드 앱에서 문제가 터졌다. 일부 기기에서 앱이 로딩된 후 특정 페이지(메뉴얼 등)가 완전히 뜨지 않거나, 캐시된 낡은 화면을 보여주는 현상이 발생했다.

## Service Worker와 WebView의 충돌

Service Worker는 브라우저의 기능이다. Android WebView도 Chromium 기반이라 Service Worker를 지원하긴 한다. 문제는 **WebView의 Service Worker 동작이 일반 브라우저와 미묘하게 다르다**는 것이다.

1. **Scope 충돌**: 네이티브 앱이 WebView 컨텍스트를 여러 개 열면 Service Worker의 scope가 예상대로 동작하지 않을 수 있다
2. **업데이트 타이밍**: WebView는 앱 생명주기에 따라 재활성화될 때 SW 업데이트 타이밍이 브라우저와 다르다
3. **보안 컨텍스트**: 일부 기기의 WebView에서 `isSecureContext`가 `false`로 보고되어 SW 등록 자체가 실패하기도 한다

## 기존 코드의 문제

```js
// Before: 환경 구분 없이 무조건 등록
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register(serviceWorkerUrl, { scope: serviceWorkerScope })
    .then((registration) => {
      console.log("ServiceWorker 등록 성공:", registration.scope);
    })
    .catch((error) => {
      console.error("ServiceWorker 등록 실패:", error);
    });
}
```

WebView 환경인지 확인하지 않고 무조건 Service Worker를 등록했다. 등록에 실패하더라도 에러 로그만 찍고 넘어갔는데, 문제는 **이전에 등록된 SW가 남아서 캐시된 파일을 계속 서빙하는 것**이었다.

## 하이브리드 WebView 환경 감지

WebView 여부를 UA 문자열과 네이티브 브리지로 감지한다:

```js
function isHybridWebViewEnvironment() {
  const ua = navigator.userAgent || "";

  // Android WebView: UA에 'wv' 포함, 또는 Version/X.X Chrome/X.X Mobile 패턴
  const isAndroidWebView =
    /\bwv\b|; wv\)|Version\/[\d.]+.*Chrome\/[\d.]+ Mobile/i.test(ua);

  // iOS WebView: iPhone/iPad/iPod + AppleWebKit + Safari 없음 (Safari 앱은 Safari가 있음)
  const isIOSWebView =
    /iPhone|iPad|iPod/i.test(ua) &&
    /AppleWebKit/i.test(ua) &&
    !/Safari/i.test(ua);

  // 네이티브 브리지 존재 여부 (ReactNative, Flutter, iOS WKWebView)
  const hasNativeBridge =
    typeof window.ReactNativeWebView !== "undefined" ||
    typeof window.flutter_inappwebview !== "undefined" ||
    (window.webkit && window.webkit.messageHandlers);

  return Boolean(isAndroidWebView || isIOSWebView || hasNativeBridge);
}
```

## 수정된 등록 로직

```js
const isProductionBuild = import.meta.env.PROD;

const shouldRegisterServiceWorker =
  isProductionBuild && window.isSecureContext && !isHybridWebViewEnvironment();

if ("serviceWorker" in navigator) {
  if (shouldRegisterServiceWorker) {
    // 일반 브라우저 환경에서만 등록
    navigator.serviceWorker
      .register(serviceWorkerUrl, { scope: serviceWorkerScope })
      .then((registration) => {
        console.log("ServiceWorker 등록 성공:", registration.scope);
      })
      .catch((error) => {
        console.error("ServiceWorker 등록 실패:", error);
      });
  } else {
    // WebView / 개발환경에서는 이전 SW 정리
    console.log("ServiceWorker 등록 건너뜀:", {
      isProductionBuild,
      isSecureContext: window.isSecureContext,
      isHybridWebView: isHybridWebViewEnvironment(),
    });

    // 핵심: 이전에 등록된 SW가 있으면 모두 해제
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      })
      .catch(() => {});
  }
}
```

핵심은 **WebView 환경에서 등록을 건너뛸 때, 기존에 등록된 SW도 함께 해제**하는 것이다. 이전 버전이 남아서 앱을 방해하는 현상을 막을 수 있다.

## 왜 개발에서는 안 보였을까

개발 환경에서는 크게 두 가지 이유로 문제가 안 보였다:

1. `import.meta.env.PROD`가 `false`여서 SW 자체가 등록되지 않았다
2. 개발자 도구가 있는 일반 Chrome에서 테스트했기 때문에 WebView 특유의 동작이 재현되지 않았다

실제 Android 기기에서 앱을 빌드해서 테스트해야만 재현할 수 있는 버그였다.

## User-Agent 감지의 한계

UA 기반 WebView 감지는 완벽하지 않다. 일부 커스텀 WebView는 UA를 변조하거나, 네이티브 브리지를 노출하지 않는다. 더 확실한 방법은 **네이티브 앱 측에서 Window 객체에 플래그를 주입**하는 것이다:

```js
// 네이티브 앱 (Android Kotlin)
webView.evaluateJavascript("window.__IS_WEBVIEW__ = true", null);

// JS에서 확인
const isWebView = window.__IS_WEBVIEW__ === true;
```

하지만 UA+브리지 감지 방식만으로도 대부분의 경우를 커버할 수 있었다.

## 정리

- Service Worker는 일반 브라우저와 WebView에서 동작이 다를 수 있다
- WebView에서 SW를 사용하면 캐시 오염, 업데이트 미반영 등의 문제가 생길 수 있다
- 환경을 감지해서 WebView에서는 SW 등록을 건너뛰고, **기존 등록된 SW도 해제**해야 한다
- 개발에서 `PROD=false`로 테스트하면 절대 재현 안 된다 — 반드시 빌드 후 기기에서 테스트하자

## 추천 태그

`service-worker,webview,hybrid,캐시,오프라인,프론트엔드,실무버그,안드로이드,iOS`
