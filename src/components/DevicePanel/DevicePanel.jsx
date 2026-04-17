import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useDeviceStore } from '../../store/deviceStore'
import PressureChart from './PressureChart'
import './DevicePanel.css'

const STATUS_CONFIG = {
  normal:  { color: '#00C851', label: '정상' },
  warning: { color: '#FFB400', label: '경고' },
  error:   { color: '#FF4444', label: '이상' },
  offline: { color: '#4a5568', label: '오프라인' },
}

function Gauge({ value, max, color, label, unit = 'kPa' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="gauge-wrap">
      <div className="gauge-label">{label}</div>
      <div className="gauge-value" style={{ color }}>
        {value.toFixed(2)}<span className="gauge-unit">{unit}</span>
      </div>
      <div className="gauge-bar">
        <div className="gauge-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="confirm-overlay">
      <div className="confirm-box">
        <div className="confirm-icon">⚠️</div>
        <div className="confirm-msg">{message}</div>
        <div className="confirm-btns">
          <button className="btn btn-ghost" onClick={onCancel}>취소</button>
          <button className="btn btn-danger" onClick={onConfirm}>확인</button>
        </div>
      </div>
    </div>
  )
}

export default function DevicePanel() {
  // selectedDeviceId는 primitive → 안전
  const selectedId       = useDeviceStore(s => s.selectedDeviceId)
  const setSelected      = useDeviceStore(s => s.setSelectedDevice)
  const updateDeviceControl = useDeviceStore(s => s.updateDeviceControl)

  // 선택된 장치 객체: shallow 비교로 무한루프 방지
  const device = useDeviceStore(
    useShallow(s => s.devices.find(d => d.id === s.selectedDeviceId) ?? null)
  )

  const [targetInput, setTargetInput] = useState('')
  const [confirm, setConfirm]         = useState(null)

  if (!selectedId || !device) return null

  const cfg       = STATUS_CONFIG[device.status] ?? STATUS_CONFIG.normal
  const deviation = (device.outputPressure - device.targetPressure).toFixed(2)
  const deviationPct = Math.abs(
    ((device.outputPressure - device.targetPressure) / device.targetPressure) * 100
  ).toFixed(1)

  const devColor = Math.abs(parseFloat(deviation)) > 0.3 ? '#FF4444'
                 : Math.abs(parseFloat(deviation)) > 0.15 ? '#FFB400'
                 : '#00C851'

  const handleSystemToggle = () => {
    if (device.systemOn) {
      setConfirm({
        message: `"${device.name}" 시스템을 종료하시겠습니까?\n종료 시 자동 제어가 중단됩니다.`,
        action:  () => updateDeviceControl(device.id, { systemOn: false, status: 'offline' }),
      })
    } else {
      updateDeviceControl(device.id, { systemOn: true, status: 'normal' })
    }
  }

  const handleValve = (action) => {
    setConfirm({
      message: action === 'open'
        ? `"${device.name}" 밸브를 완전 개방하시겠습니까?`
        : `"${device.name}" 밸브를 완전 폐쇄하시겠습니까?`,
      action: () => updateDeviceControl(device.id, {
        valveOpenRate: action === 'open' ? 100 : 0,
      }),
    })
  }

  const handleSetTarget = () => {
    const v = parseFloat(targetInput)
    if (isNaN(v) || v < 0.5 || v > 5.0) return
    updateDeviceControl(device.id, { targetPressure: v })
    setTargetInput('')
  }

  return (
    <>
      <aside className="device-panel">
        {/* 헤더 */}
        <div className="dp-header">
          <div>
            <div className="dp-name">{device.name}</div>
            <div className="dp-addr">{device.address}</div>
          </div>
          <div className="dp-header-right">
            <span className="dp-badge"
              style={{ background: `${cfg.color}22`, color: cfg.color, borderColor: `${cfg.color}44` }}>
              {cfg.label}
            </span>
            <button className="dp-close" onClick={() => setSelected(null)}>✕</button>
          </div>
        </div>

        <div className="dp-body">
          {/* 시스템 토글 */}
          <div className="dp-row dp-row--between">
            <span className="dp-section-label">시스템 전원</span>
            <button
              className={`toggle-btn ${device.systemOn ? 'toggle-on' : 'toggle-off'}`}
              onClick={handleSystemToggle}
            >
              <span className="toggle-thumb" />
              <span className="toggle-label">{device.systemOn ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* 압력 게이지 */}
          <div className="dp-section">
            <div className="dp-section-label">실시간 압력 (kPa)</div>
            <div className="gauge-grid">
              <Gauge label="입력압" value={device.inputPressure}  max={5} color="#3182F6" />
              <Gauge label="출력압" value={device.outputPressure} max={5} color={devColor} />
              <Gauge label="목표압" value={device.targetPressure} max={5} color="#7b8eab" />
            </div>
            <div className="deviation-row">
              <span>편차</span>
              <span style={{ color: devColor }}>
                {deviation > 0 ? '+' : ''}{deviation} kPa ({deviationPct}%)
              </span>
            </div>
          </div>

          {/* 밸브 */}
          <div className="dp-section">
            <div className="dp-section-label">밸브 개도율</div>
            <div className="valve-bar-wrap">
              <div className="valve-bar">
                <div className="valve-fill" style={{ width: `${device.valveOpenRate}%` }} />
              </div>
              <span className="valve-pct">{device.valveOpenRate}%</span>
            </div>
            <div className="valve-btns">
              <button className="btn btn-sm btn-ghost" onClick={() => handleValve('open')}>완전 개방</button>
              <button className="btn btn-sm btn-ghost" onClick={() => handleValve('close')}>완전 폐쇄</button>
            </div>
          </div>

          {/* 목표압 설정 */}
          <div className="dp-section">
            <div className="dp-section-label">목표압 설정</div>
            <div className="target-input-row">
              <input
                className="target-input"
                type="number"
                placeholder={device.targetPressure}
                value={targetInput}
                min={0.5} max={5.0} step={0.1}
                onChange={e => setTargetInput(e.target.value)}
              />
              <span className="target-unit">kPa</span>
              <button className="btn btn-primary btn-sm" onClick={handleSetTarget}>적용</button>
            </div>
          </div>

          {/* 차트 */}
          <div className="dp-section">
            <div className="dp-section-label">압력 추이 (최근 30회)</div>
            <PressureChart history={device.history} targetPressure={device.targetPressure} />
          </div>

          {/* 파라미터 */}
          <div className="dp-section">
            <div className="dp-section-label">제어 파라미터</div>
            <div className="param-grid">
              <div className="param-item">
                <span className="param-label">조정 각도</span>
                <span className="param-value">{device.adjustAngle}°</span>
              </div>
              <div className="param-item">
                <span className="param-label">조정 주기</span>
                <span className="param-value">{device.adjustInterval}초</span>
              </div>
              <div className="param-item">
                <span className="param-label">알람 하한</span>
                <span className="param-value">{device.alarmMin} kPa</span>
              </div>
              <div className="param-item">
                <span className="param-label">알람 상한</span>
                <span className="param-value">{device.alarmMax} kPa</span>
              </div>
            </div>
          </div>

          <div className="dp-footer">
            마지막 수신: {new Date(device.lastUpdate).toLocaleTimeString('ko-KR')}
          </div>
        </div>
      </aside>

      {confirm && (
        <ConfirmModal
          message={confirm.message}
          onConfirm={() => { confirm.action(); setConfirm(null) }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  )
}
