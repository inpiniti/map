# map — 정압기 모니터링 & 원격 제어 시스템

## 프로젝트 개요

전국 약 500개의 **정압기(가스 압력 조절 장치)**를 지도 기반으로 실시간 모니터링하고 원격 제어하는 웹 시스템.
각 정압기는 RTU(Remote Terminal Unit)를 통해 서버로 IoT 데이터를 송신하며, 이 시스템은 그 데이터를 시각화하고 제어 명령을 내린다.

### 정압기란?
- 입력압(공급)은 가스 사용량에 따라 변동 (많이 쓰면 압 하락, 안 쓰면 압 상승)
- 정압기가 밸브를 풀거나 조여서 출력압을 일정하게 유지
- 이 조임/풀기 동작을 자동화하고 원격에서 모니터링/제어하는 것이 목표

---

## 디자인 방향

### 지도는 배경 역할만

참고 레퍼런스(사이버위협맵, 로봇모니터링, 해양모니터링 등)에서 공통적으로:
- 지도의 채도·명도를 낮춰 **배경화** — 실제 데이터가 시각적으로 앞으로 나옴
- 지도 위 레이어로 마커, 라인, 플로팅 패널을 올림
- 지도 자체의 POI(음식점, 상가 등) 표기는 최소화 또는 제거

### 전체 레이아웃 — Full-screen Map + Floating Panels

```
┌─────────────────────────────────────────────────────────────┐
│  TopBar: [로고]  정상 423 / 경고 12 / 이상 3 / 오프 62   [설정] │
├──────────┬──────────────────────────────────┬───────────────┤
│          │                                  │               │
│  Left    │                                  │  Right Panel  │
│  Panel   │        지도 (배경)               │  (마커 클릭   │
│          │                                  │   시 오픈)    │
│ 이벤트   │    ● ● ●  마커들                 │               │
│ 피드     │                                  │  정압기 상세  │
│ (실시간) │                                  │  + 제어       │
│          │                                  │               │
│          ├──────────────────────────────────┤               │
│          │  BottomBar: 필터 칩 + 지역 선택  │               │
└──────────┴──────────────────────────────────┴───────────────┘
```

---

## 기술 스택

| 영역 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | React (CRA) | 기설치 |
| 지도 | **Mapbox GL JS** (`react-map-gl`) | 스타일 완전 커스터마이징 가능, 채도/명도 조절, 한국 지도 지원 |
| 지도 대안 | Leaflet + CartoDB Positron/DarkMatter 타일 | 무료, 무채색 타일 기본 제공 |
| 차트 | Recharts | React 친화적 |
| 상태관리 | Zustand | 단순하고 빠름 |
| 실시간 | WebSocket (+ polling fallback) | 압력값 실시간 갱신 |
| HTTP | Axios | API 통신 |
| 스타일 | CSS Modules + TDS 디자인 토큰 | TDS 색상/타이포/간격 체계 |

### 지도 스타일 선택지

```
Mapbox 기준:
- mapbox://styles/mapbox/light-v11       → 밝은 무채색 (낮 모드)
- mapbox://styles/mapbox/dark-v11        → 어두운 무채색 (야간 모드)
- mapbox://styles/mapbox/navigation-night-v1  → 네비게이션 스타일 다크
- 커스텀 스타일: Mapbox Studio에서 POI 레이어 숨기고 채도 조절

Leaflet 무료 대안:
- CartoDB Positron  → 흰 배경, 연회색 도로, POI 최소
- CartoDB DarkMatter → 검정 배경, 회색 도로
- Stamen Toner Lite → 매우 단순한 흑백
```

---

## 디자인 시스템 — TDS (Toss Design System)

`.agents/skills/` 하위 skill들을 기반으로 TDS 가이드라인을 따른다.

### 색상 토큰
```css
/* 상태 색상 */
--tds-status-normal: #00C851;
--tds-status-warning: #FFB400;
--tds-status-error: #FF4444;
--tds-status-offline: #9EA3B2;

/* 브랜드 */
--tds-primary: #3182F6;

/* 배경/서피스 */
--tds-bg: #F9FAFB;            /* 라이트 모드 */
--tds-bg-dark: #0D1117;       /* 다크 모드 */
--tds-surface: #FFFFFF;
--tds-surface-dark: #161B22;

/* 텍스트 */
--tds-text-primary: #191F28;
--tds-text-secondary: #6B7684;

/* 기타 */
--tds-border: #E5E8EB;
```

### TDS UX 원칙
- 선택 UI는 바텀시트 패턴으로 통일 (칩/드롭다운 혼용 금지)
- 서비스 진입 직후 바텀시트 자동 오픈 금지 (다크패턴)
- 위험 동작(시스템 OFF, 강제 밸브 조작)은 반드시 확인 모달 제공
- 버튼 라벨은 동작이 명확하게 ("밸브 열기" O / "확인" X)

---

## 주요 기능 — 레퍼런스 모니터링 시스템 반영

### 1. TopBar — 전체 KPI 요약
```
[로고]  전체: 500  |  정상: 423 ●  |  경고: 12 ●  |  이상: 3 ●  |  오프라인: 62 ●   [알람] [설정]
```
- 숫자 클릭 시 해당 상태 필터 자동 적용

### 2. 지도 레이어
- 기본: 채도 낮은 배경 지도 (Mapbox light/dark)
- 마커: 상태별 색상 원형 마커, 클러스터링 지원
- (선택) 가스 공급 라인 표시 레이어 (GeoJSON polyline)
- (선택) 이상 발생 지역 히트맵 오버레이

### 3. Left Panel — 실시간 이벤트 피드
레퍼런스 4번 이미지(해양 모니터링) 참고
```
┌─────────────────┐
│ 실시간 이벤트   │
│ ─────────────── │
│ 🔴 14:32 강남001│
│    출력압 이상  │
│    2.1 → 1.4kPa │
│                 │
│ 🟡 14:28 서초003│
│    경고 임계 도달│
│                 │
│ 🟢 14:25 마포012│
│    정상 복구    │
│ ─────────────── │
│ (스크롤)        │
└─────────────────┘
```
- 최신 이벤트가 위로 올라오는 피드 형태
- 항목 클릭 시 해당 마커로 지도 이동 + 상세 패널 오픈

### 4. Right Panel — 정압기 상세 & 제어
마커 클릭 시 슬라이드 오픈

**상단: 장치 정보**
- 이름, 주소, 마지막 통신 시각
- 상태 배지 (정상/경고/이상/오프라인)
- 시스템 ON/OFF 토글

**중단: 실시간 수치**
```
입력압          출력압         목표압
3.2 kPa  →    2.0 kPa  /   2.0 kPa
            [━━━━━━━━━━━━━━━] 100%
```
- 도넛 게이지 또는 선형 게이지로 목표 달성률 표시
- 최근 1시간 압력 추이 미니 차트 (Recharts)

**하단: 제어 패널**
- 목표압 설정 (슬라이더 + 수치 입력)
- 밸브 열기 / 닫기 버튼 (확인 모달 포함)
- 고급 설정 버튼 → 바텀시트
  - 1회 조정 각도 (°)
  - 조정 주기 (초)
  - 알람 상한/하한 임계값

### 5. BottomBar — 필터 & 지역 선택
```
[전체] [정상] [경고] [이상] [오프라인]     지역: [전국 ▾]     줌: [맞춤]
```

### 6. 통계 뷰 (선택, 별도 탭)
레퍼런스 1번 이미지 참고
- 시간대별 이상 발생 빈도 차트
- 지역별 평균 압력 히트맵
- 장치별 가동률 순위

---

## 데이터 모델

```typescript
interface Device {
  id: string
  name: string                // "서울 강남 001"
  address: string
  location: { lat: number; lng: number }
  status: 'normal' | 'warning' | 'error' | 'offline'
  systemOn: boolean

  // 압력 (단위: kPa)
  inputPressure: number       // 입력압 (변동)
  outputPressure: number      // 출력압 (제어 결과)
  targetPressure: number      // 목표압 (설정값)

  // 제어 파라미터
  valveOpenRate: number       // 밸브 개도율 (0~100%)
  adjustAngle: number         // 1회 조정 각도 (°)
  adjustInterval: number      // 조정 주기 (초)

  // 알람 임계값
  alarmMin: number
  alarmMax: number

  lastUpdate: string          // ISO 8601
}

interface DeviceEvent {
  id: string
  deviceId: string
  deviceName: string
  type: 'error' | 'warning' | 'recovery' | 'control'
  message: string
  prevValue?: number
  newValue?: number
  timestamp: string
}

interface PressureRecord {
  timestamp: string
  inputPressure: number
  outputPressure: number
  targetPressure: number
}
```

---

## 폴더 구조

```
src/
├── components/
│   ├── Map/
│   │   ├── MapView.jsx           # Mapbox/Leaflet 지도 컨테이너
│   │   ├── DeviceMarker.jsx      # 상태별 마커
│   │   └── ClusterLayer.jsx      # 클러스터링
│   ├── TopBar/
│   │   └── TopBar.jsx            # KPI 요약 + 로고
│   ├── EventFeed/
│   │   └── EventFeed.jsx         # 실시간 이벤트 피드 (Left Panel)
│   ├── DevicePanel/
│   │   ├── DevicePanel.jsx       # Right Panel 컨테이너
│   │   ├── PressureGauge.jsx     # 압력 게이지
│   │   ├── PressureChart.jsx     # 추이 미니 차트
│   │   └── ControlPanel.jsx      # 제어 UI
│   ├── BottomBar/
│   │   └── BottomBar.jsx         # 필터 + 지역 선택
│   └── common/                   # TDS 공통 컴포넌트
│       ├── Button.jsx
│       ├── Badge.jsx
│       ├── Card.jsx
│       ├── Toggle.jsx
│       ├── BottomSheet.jsx
│       └── ConfirmModal.jsx      # 위험 동작 확인 모달
├── hooks/
│   ├── useDevices.js             # 장치 목록 + 실시간 구독
│   └── useControl.js             # 제어 명령 전송
├── store/
│   └── deviceStore.js            # Zustand 전역 상태
├── api/
│   └── deviceApi.js              # REST API + WebSocket 클라이언트
├── mock/
│   └── devices.js                # 500개 mock 데이터 (개발용)
└── styles/
    └── tds-tokens.css            # TDS 디자인 토큰 변수
```

---

## 개발 순서

1. **TDS 토큰 + 공통 컴포넌트** — Button, Badge, Card, Toggle, BottomSheet, ConfirmModal
2. **지도 연동 + 마커 렌더링** — Mapbox or Leaflet, mock 500개 데이터, 클러스터링
3. **TopBar + BottomBar** — KPI 요약, 필터 칩
4. **EventFeed (Left Panel)** — 실시간 이벤트 피드 UI
5. **DevicePanel (Right Panel)** — 압력 수치, 게이지, 미니 차트, 제어 패널
6. **실시간 연동** — WebSocket 또는 폴링
7. **통계 뷰** — (선택) 시간대별/지역별 분석

---

## 작업자 시스템

### 개요
- 작업자는 **평소에 지도에 표시되지 않음**
- 정압기 이상(error) 발생 → 출동 요청 알림에서 **작업자 할당** 가능
- 할당된 작업자만 지도에 표시됨

### 작업자 데이터 모델
```typescript
interface Worker {
  id: string
  name: string
  department: string        // 소속 팀
  phone: string
  location: { lat: number; lng: number }  // 현재 위치
  status: 'available' | 'dispatched' | 'offline'
  assignedDeviceId: string | null         // 할당된 정압기 ID
}
```

### 지도 표현
- **작업자 마커**: 사람 아이콘, 파란색 원형 마커 (할당된 경우만 표시)
- **이동 라인**: 작업자 위치 → 목표 정압기 까지 파란색 점선 폴리라인
- **마커 클릭**: 소속, 이름, 전화번호 팝업 표시

### 흐름
1. 이상(error) 발생 → DispatchAlert 표시
2. "작업자 할당" 클릭 → 가용 작업자 목록 표시 (소속/이름/거리)
3. 작업자 선택 → 할당 완료
4. 지도에 작업자 마커 + 파란 점선 표시
5. 정압기 정상 복구 → 작업자 마커/라인 제거 (자동)

### 이슈 메시지 상세화
- 단순 문구 대신 실제 압력값 기반 동적 메시지 생성
- 예) "출력압 과압: 2.84 kPa (목표 2.0 kPa 대비 +0.84 kPa, 42% 초과)"
- 상태별 원인 추정 포함

---

## 참고 사항

- 실제 백엔드 API 스펙 확정 전까지 mock 데이터(`src/mock/devices.js`)로 개발 진행
- Mapbox 사용 시 API 키는 `.env`의 `REACT_APP_MAPBOX_TOKEN`으로 관리
- Leaflet 무료 대안 사용 시 CartoDB DarkMatter/Positron 타일 URL 사용
- `.agents/skills/` — tds-guide, tds-rule, tds-skills 참조
