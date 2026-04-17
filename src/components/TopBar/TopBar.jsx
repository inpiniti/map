import { useEffect, useRef, useState } from 'react'
import { useDeviceStore } from '../../store/deviceStore'
import './TopBar.css'

// 숫자 변경 시 플래시 효과
function KpiNum({ value, color }) {
  const ref  = useRef(null)
  const prev = useRef(value)
  useEffect(() => {
    if (prev.current !== value && ref.current) {
      ref.current.classList.remove('num-flash')
      void ref.current.offsetWidth
      ref.current.classList.add('num-flash')
      prev.current = value
    }
  }, [value])
  return <span ref={ref} style={{ color }} className="kpi-num">{value}</span>
}

function useClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return time
}

function WeatherIcon({ code }) {
  if (code <= 1)  return <>☀️</>
  if (code <= 3)  return <>⛅</>
  if (code <= 48) return <>🌫️</>
  if (code <= 67) return <>🌧️</>
  if (code <= 77) return <>❄️</>
  if (code <= 82) return <>🌦️</>
  return <>⛈️</>
}

export default function TopBar() {
  // 개별 primitive 셀렉터 — 새 객체 생성 없음 → 무한루프 없음
  const total   = useDeviceStore(s => s.devices.length)
  const normal  = useDeviceStore(s => s.devices.filter(d => d.status === 'normal').length)
  const warning = useDeviceStore(s => s.devices.filter(d => d.status === 'warning').length)
  const error   = useDeviceStore(s => s.devices.filter(d => d.status === 'error').length)
  const offline = useDeviceStore(s => s.devices.filter(d => d.status === 'offline').length)
  const weather    = useDeviceStore(s => s.weather)
  const waterLevel = useDeviceStore(s => s.waterLevel)
  const time = useClock()

  const timeStr = time.toLocaleTimeString('ko-KR', { hour12: false })
  const dateStr = time.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })

  return (
    <header className="topbar">
      {/* 로고 */}
      <div className="topbar-logo">
        <span className="logo-icon">⬡</span>
        <div>
          <div className="logo-title">정압관제시스템</div>
          <div className="logo-sub">Gas Pressure Control Center</div>
        </div>
        <div className="live-dot" style={{ marginLeft: 10 }} title="실시간 연결" />
      </div>

      {/* KPI */}
      <div className="topbar-kpi">
        <div className="kpi-item">
          <span className="kpi-label">전체</span>
          <KpiNum value={total} color="#e2e8f4" />
        </div>
        <div className="kpi-divider" />
        <div className="kpi-item">
          <span className="kpi-dot" style={{ background: '#00C851' }} />
          <span className="kpi-label">정상</span>
          <KpiNum value={normal} color="#00C851" />
        </div>
        <div className="kpi-item">
          <span className="kpi-dot" style={{ background: '#FFB400' }} />
          <span className="kpi-label">경고</span>
          <KpiNum value={warning} color="#FFB400" />
        </div>
        <div className="kpi-item kpi-item--alert" style={{ opacity: error > 0 ? 1 : 0.5 }}>
          <span className="kpi-dot" style={{ background: '#FF4444' }} />
          <span className="kpi-label">이상</span>
          <KpiNum value={error} color="#FF4444" />
        </div>
        <div className="kpi-item">
          <span className="kpi-dot" style={{ background: '#4a5568' }} />
          <span className="kpi-label">오프라인</span>
          <KpiNum value={offline} color="#7b8eab" />
        </div>
      </div>

      {/* 날씨 + 시계 */}
      <div className="topbar-right">
        {weather && (
          <div className="weather-widget">
            <span className="weather-icon"><WeatherIcon code={weather.weathercode} /></span>
            <div className="weather-info">
              <span className="weather-label">{weather.label}</span>
              <span className="weather-temp">{weather.temperature}°C</span>
            </div>
            {weather.rain > 0 && (
              <div className="weather-rain">
                <span>강수 {weather.rain}mm</span>
                <span className="water-level">수면 {waterLevel}cm</span>
              </div>
            )}
          </div>
        )}
        <div className="topbar-clock">
          <div className="clock-time">{timeStr}</div>
          <div className="clock-date">{dateStr}</div>
        </div>
      </div>
    </header>
  )
}
