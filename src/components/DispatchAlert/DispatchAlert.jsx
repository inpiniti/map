import { useDeviceStore } from '../../store/deviceStore'
import './DispatchAlert.css'

function timeFmt(ts) {
  return new Date(ts).toLocaleTimeString('ko-KR', { hour12: false })
}

export default function DispatchAlert() {
  const alerts      = useDeviceStore(s => s.dispatchAlerts)
  const dismiss     = useDeviceStore(s => s.dismissDispatchAlert)
  const dispatch    = useDeviceStore(s => s.dispatchTeam)
  const setSelected = useDeviceStore(s => s.setSelectedDevice)

  if (alerts.length === 0) return null

  // 최대 3개만 표시
  const visible = alerts.slice(0, 3)

  return (
    <div className="dispatch-stack">
      {visible.map((alert, i) => (
        <div
          key={alert.id}
          className="dispatch-card"
          style={{ zIndex: 900 - i, transform: `translateY(${i * 6}px) scale(${1 - i * 0.02})` }}
        >
          <div className="dispatch-header">
            <div className="dispatch-urgent">
              <span className="dispatch-blink">🚨</span>
              <span className="dispatch-title">출동 요청</span>
              {alerts.length > 1 && (
                <span className="dispatch-queue">{alerts.length}건 대기</span>
              )}
            </div>
            <span className="dispatch-time">{timeFmt(alert.timestamp)}</span>
          </div>

          <div className="dispatch-body">
            <div className="dispatch-device">
              <span className="dispatch-dot" />
              {alert.deviceName}
            </div>
            <div className="dispatch-addr">{alert.address}</div>
            <div className="dispatch-issue">{alert.issue}</div>
            <div className="dispatch-pressure">
              출력압 <strong style={{ color: '#FF4444' }}>{alert.outputPressure} kPa</strong>
              &nbsp;→&nbsp; 목표 <strong style={{ color: '#7b8eab' }}>{alert.targetPressure} kPa</strong>
            </div>
          </div>

          <div className="dispatch-actions">
            <button
              className="dispatch-btn dispatch-btn--secondary"
              onClick={() => { dismiss(alert.id); setSelected(alert.deviceId) }}
            >
              현황 확인
            </button>
            <button
              className="dispatch-btn dispatch-btn--primary"
              onClick={() => dispatch(alert.id)}
            >
              🚔 출동 지시
            </button>
            <button
              className="dispatch-btn dispatch-btn--ghost"
              onClick={() => dismiss(alert.id)}
              title="알림 무시"
            >✕</button>
          </div>
        </div>
      ))}
    </div>
  )
}
