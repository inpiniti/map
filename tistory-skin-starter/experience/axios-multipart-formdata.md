---
title: application/json에서 multipart/form-data로 전환 - Axios에서 파일을 제대로 보내는 법
author: JUNG YoungKyun
date: 2026-04-17
category: experience
layout: post
---

체납 중지의뢰 기능에서 사진 첨부가 추가되면서, 기존 `application/json` 방식으로는 파일 전송이 불가능해졌습니다.
`multipart/form-data`로 전환하면서 겪은 문제들을 정리합니다.

## 상황

- 기존: 텍스트 데이터만 `application/json`으로 전송
- 변경: 현장 사진(base64 또는 File 객체)을 함께 전송해야 함
- 서버는 `multipart/form-data` 요청을 기대하도록 수정 완료

## 문제 1: Content-Type 헤더 충돌

Axios 인터셉터에서 모든 요청에 `Content-Type`을 일괄 지정하고 있었습니다.

```javascript
// 기존 인터셉터 코드
instance.interceptors.request.use(function (config) {
  config.headers = {
    ...config.headers,
    ...authHeader(),
    // Content-Type: 'application/json' 이 포함됨
  };
  return config;
});
```

`FormData`를 body로 보낼 때 Axios는 자동으로 `Content-Type: multipart/form-data; boundary=...`를 설정합니다.
그런데 인터셉터에서 Content-Type을 덮어쓰면 `boundary` 값이 사라져 서버가 파싱에 실패합니다.

### 해결

```javascript
instance.interceptors.request.use(function (config) {
  if (!(config.data instanceof FormData)) {
    // 일반 JSON 요청: 헤더 그대로
    config.headers = {
      ...config.headers,
      ...authHeader(),
    };
  } else {
    // FormData 요청: Content-Type Axios가 자동 설정하도록 비워둠
    config.headers = {
      ...config.headers,
      ...authHeader(),
    };
    delete config.headers['Content-Type']; // 명시적으로 삭제
  }
  return config;
});
```

## 문제 2: base64 이미지를 FormData에 담는 방법

앱에서 캡처한 사진은 base64 Data URI 형태였습니다.
JSON 전송 시에는 문자열 그대로 넘길 수 있었지만, multipart에서는 Blob으로 변환해야 합니다.

```javascript
// base64 Data URI → Blob 변환
const dataURItoBlob = (dataURI) => {
  if (!dataURI) return null;
  try {
    const parts = dataURI.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mimeString = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(parts[1]); // base64 디코딩
    const u8arr = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }
    return new Blob([u8arr], { type: mimeString });
  } catch (error) {
    console.error('Failed to convert dataURI to Blob:', error);
    return null;
  }
};
```

## FormData 조립 예시

```javascript
const buildFormData = (payload) => {
  const formData = new FormData();

  // 텍스트 필드
  formData.append('useContNum', payload.useContNum);
  formData.append('stopReason', payload.stopReason);

  // 사진 배열
  payload.photos.forEach((photo, index) => {
    const blob = dataURItoBlob(photo.base64);
    if (blob) {
      formData.append(`photos[${index}]`, blob, `photo_${index}.jpg`);
    }
  });

  return formData;
};
```

## 핵심 정리

| 항목          | application/json                     | multipart/form-data                              |
| ------------- | ------------------------------------ | ------------------------------------------------ |
| 파일 전송     | 불가 (base64로 우회 가능하나 비효율) | 가능                                             |
| Content-Type  | `application/json`                   | `multipart/form-data; boundary=...` (Axios 자동) |
| boundary 처리 | 불필요                               | Axios가 자동 생성 - 절대 수동 지정 금지          |
| 인터셉터 주의 | 없음                                 | Content-Type 헤더 삭제 필요                      |

## 배운 점

- **`multipart/form-data`에서 `Content-Type`을 수동으로 지정하면 `boundary`가 누락되어 서버 파싱 실패**
- Axios는 `config.data`가 `FormData` 인스턴스인지 자동 감지해서 Content-Type을 올바르게 설정해주므로, 방해하지 않는 것이 중요하다
- base64 Data URI는 `atob` + `Uint8Array`로 Blob으로 변환해야 파일명과 MIME 타입을 정확히 전달할 수 있다

## 추천 태그

`axios,multipart,formdata,파일업로드,base64,실무버그,Content-Type,프론트엔드`
