import { useShallow } from 'zustand/react/shallow'
import { useDeviceStore } from '../../store/deviceStore'
import './EventFeed.css'

const STATUS_CONFIG = {
  error:   { color: '#F04452', bg: 'rgba(240,68,82,0.08)',  label: '이상', icon: '🔴' },
  warning: { color: '#FF9500', bg: 'rgba(255,149,0,0.08)',  label: '경고', icon: '🟡' },
}

function timeDiff(ts) {
  if (!ts) return ''
  const sec = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (sec < 60)   return `${sec}초 전`
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`
  return `${Math.floor(sec / 3600)}시간 전`
}

// 개별 아이템 — 자기 장치 데이터만 구독 (shallow 비교)
function IssueItem({ deviceId }) {
  const device     = useDeviceStore(useShallow(s => s.devices.find(d => d.id === deviceId) ?? null))
  const setSelected = useDeviceStore(s => s.setSelectedDevice)
  const isSelected  = useDeviceStore(s => s.selectedDeviceId === deviceId)
  const assignWorker = useDeviceStore(s => s.assignWorkerToDevice)

  if (!device) return null

  const cfg = STATUS_CONFIG[device.status]
  if (!cfg) return null

  return (
    <div
      className={`issue-item ${isSelected ? 'issue-item--selected' : ''}`}
      style={{ borderLeftColor: cfg.color, background: isSelected ? cfg.bg : undefined }}
      onClick={() => setSelected(isSelected ? null : deviceId)}
    >
      <div className="issue-header">
        <span className="issue-badge" style={{ color: cfg.color, background: cfg.bg }}>
          {cfg.icon} {cfg.label}
        </span>
        <span className="issue-time">{timeDiff(device.lastIssueTime)}</span>
      </div>
      <div className="issue-name">{device.name}</div>
      {device.lastIssue && (
        <div className="issue-reason">{device.lastIssue}</div>
      )}

      {device.repairState === 'dispatched' && (
        <div className="issue-repair-state issue-repair-state--dispatch">🚔 출동중</div>
      )}
      {device.repairState === 'repairing' && (
        <div className="issue-repair-state issue-repair-state--repair">🔧 수리중 (작업자 도착)</div>
      )}

      {device.status === 'error' && !device.assignedWorkerId && (
        <button
          className="issue-assign-btn"
          onClick={(e) => {
            e.stopPropagation()
            assignWorker(device.id)
          }}
        >
          작업자 할당
        </button>
      )}

      <div className="issue-pressure">
        출력 <strong style={{ color: cfg.color }}>{device.outputPressure} kPa</strong>
        &nbsp;/&nbsp;목표 {device.targetPressure} kPa
      </div>
    </div>
  )
}

export default function EventFeed() {
  // ✅ ID 배열만 추출 — 문자열 배열을 useShallow로 안정적으로 비교
  //    device 객체가 바뀌어도 status가 변하지 않으면 같은 배열 반환
  const errorIds = useDeviceStore(
    useShallow(s =>
      s.devices
        .filter(d => d.status === 'error')
        .map(d => d.id)
    )
  )
  const warningIds = useDeviceStore(
    useShallow(s =>
      s.devices
        .filter(d => d.status === 'warning')
        .map(d => d.id)
    )
  )

  const issueIds    = [...errorIds, ...warningIds]
  const totalIssues = issueIds.length

  return (
    <aside className="event-feed">
      <div className="feed-header">
        <div className="feed-title-row">
          <span className="feed-title">현재 이슈</span>
          {totalIssues === 0 && (
            <span className="feed-all-ok">✓ 전체 정상</span>
          )}
        </div>
        {totalIssues > 0 && (
          <div className="feed-summary">
            {errorIds.length > 0 && (
              <span className="feed-count feed-count--error">{errorIds.length} 이상</span>
            )}
            {warningIds.length > 0 && (
              <span className="feed-count feed-count--warning">{warningIds.length} 경고</span>
            )}
          </div>
        )}
      </div>

      <div className="feed-list">
        {totalIssues === 0 && (
          <div className="feed-empty">
            <div className="feed-empty-icon">✅</div>
            <div>모든 장치가 정상 운영 중입니다</div>
          </div>
        )}
        {/* error 먼저, warning 다음 */}
        {errorIds.map(id => <IssueItem key={id} deviceId={id} />)}
        {warningIds.map(id => <IssueItem key={id} deviceId={id} />)}
      </div>
    </aside>
  )
}
