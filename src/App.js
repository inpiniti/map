import TopBar       from './components/TopBar/TopBar'
import EventFeed    from './components/EventFeed/EventFeed'
import MapView      from './components/MapView/MapView'
import DevicePanel  from './components/DevicePanel/DevicePanel'
import DispatchAlert from './components/DispatchAlert/DispatchAlert'
import BottomBar    from './components/BottomBar/BottomBar'
import useSimulation from './hooks/useSimulation'
import useWeather    from './hooks/useWeather'
import './App.css'

export default function App() {
  useSimulation()
  useWeather()

  return (
    <div className="app-root">
      {/* 지도 — 최하단 레이어 */}
      <MapView />

      {/* 상단 바 */}
      <TopBar />

      {/* 좌측 이벤트 피드 */}
      <EventFeed />

      {/* 우측 장치 상세 패널 (선택 시) */}
      <DevicePanel />

      {/* 하단 필터 바 */}
      <BottomBar />

      {/* 출동 요청 알림 (최상단) */}
      <DispatchAlert />
    </div>
  )
}
