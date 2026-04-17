import { useDeviceStore } from '../../store/deviceStore'
import './BottomBar.css'

const STATUS_FILTERS = [
  { key: 'all',     label: '전체' },
  { key: 'normal',  label: '정상',    color: '#00C851' },
  { key: 'warning', label: '경고',    color: '#FFB400' },
  { key: 'error',   label: '이상',    color: '#FF4444' },
  { key: 'offline', label: '오프라인', color: '#4a5568' },
]

const CITIES = [
  'all','서울','경기',
]

export default function BottomBar() {
  const statusFilter = useDeviceStore(s => s.statusFilter)
  const cityFilter   = useDeviceStore(s => s.cityFilter)
  const setStatus    = useDeviceStore(s => s.setStatusFilter)
  const setCity      = useDeviceStore(s => s.setCityFilter)

  // 개별 primitive 셀렉터
  const total   = useDeviceStore(s => s.devices.length)
  const normal  = useDeviceStore(s => s.devices.filter(d => d.status === 'normal').length)
  const warning = useDeviceStore(s => s.devices.filter(d => d.status === 'warning').length)
  const error   = useDeviceStore(s => s.devices.filter(d => d.status === 'error').length)
  const offline = useDeviceStore(s => s.devices.filter(d => d.status === 'offline').length)

  const countMap = { all: total, normal, warning, error, offline }

  return (
    <footer className="bottom-bar">
      <div className="filter-group">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.key}
            className={`filter-chip ${statusFilter === f.key ? 'active' : ''}`}
            style={statusFilter === f.key && f.color
              ? { borderColor: f.color, color: f.color } : {}}
            onClick={() => setStatus(f.key)}
          >
            {f.color && <span className="chip-dot" style={{ background: f.color }} />}
            {f.label}
            <span className="chip-count">{countMap[f.key] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="bottom-divider" />

      <div className="city-group">
        <span className="city-label">지역</span>
        <select
          className="city-select"
          value={cityFilter}
          onChange={e => setCity(e.target.value)}
        >
          {CITIES.map(c => (
            <option key={c} value={c}>{c === 'all' ? '전국' : c}</option>
          ))}
        </select>
      </div>

      <div className="bottom-summary">
        총 <strong>{total}</strong>개 장치 운영 중
      </div>
    </footer>
  )
}
