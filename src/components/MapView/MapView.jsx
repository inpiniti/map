import { Fragment, useMemo, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useDeviceStore } from '../../store/deviceStore'
import './MapView.css'

// CartoDB Positron — 밝고 채도 낮은 라이트 배경, 완전 무료
const LIGHT_TILE = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const LIGHT_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

function createIcon(status, isSelected) {
  const needPulse = status === 'error' || status === 'warning'
  const cls = `device-marker-wrap marker-${status}${isSelected ? ' marker-selected' : ''}`
  const rings = needPulse
    ? '<div class="marker-ring"></div><div class="marker-ring marker-ring-2"></div>'
    : ''
  return L.divIcon({
    html: `<div class="${cls}">${rings}<div class="marker-core"></div></div>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

function createWorkerIcon() {
  return L.divIcon({
    html: '<div class="worker-marker-wrap"><div class="worker-marker-core">👷</div></div>',
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  })
}

function createRepairIcon() {
  return L.divIcon({
    html: '<div class="repair-marker-wrap"><span class="repair-marker-icon">🔧</span><span class="repair-marker-label">수리중</span></div>',
    className: '',
    iconSize: [56, 24],
    iconAnchor: [28, 12],
  })
}

const WORKER_ICON = createWorkerIcon()
const REPAIR_ICON = createRepairIcon()

function getDeviceZIndex(status) {
  if (status === 'error') return 500
  if (status === 'warning') return 300
  if (status === 'normal') return 100
  return 50
}

function FlyToSelected({ lat, lng }) {
  const map = useMap()
  useEffect(() => {
    if (lat == null || lng == null) return
    map.flyTo([lat, lng], Math.max(map.getZoom(), 13), { duration: 0.8 })
  }, [lat, lng]) // eslint-disable-line
  return null
}

function DeviceMarker({ device, isSelected, onSelect }) {
  const icon = useMemo(
    () => createIcon(device.status, isSelected),
    [device.status, isSelected]
  )
  const zIndexOffset = getDeviceZIndex(device.status)
  return (
    <Marker
      position={[device.location.lat, device.location.lng]}
      icon={icon}
      zIndexOffset={zIndexOffset}
      eventHandlers={{ click: () => onSelect(device.id) }}
      title={`${device.name} | 출력: ${device.outputPressure} kPa`}
    />
  )
}

export default function MapView() {
  const statusFilter = useDeviceStore(s => s.statusFilter)
  const cityFilter   = useDeviceStore(s => s.cityFilter)
  const selectedId   = useDeviceStore(s => s.selectedDeviceId)
  const setSelected  = useDeviceStore(s => s.setSelectedDevice)
  const devices      = useDeviceStore(s => s.devices)
  const workers      = useDeviceStore(s => s.workers)

  const selectedLat = useDeviceStore(s => {
    if (!s.selectedDeviceId) return null
    const d = s.devices.find(d => d.id === s.selectedDeviceId)
    return d?.location.lat ?? null
  })
  const selectedLng = useDeviceStore(s => {
    if (!s.selectedDeviceId) return null
    const d = s.devices.find(d => d.id === s.selectedDeviceId)
    return d?.location.lng ?? null
  })

  const filtered = useMemo(() =>
    devices.filter(d => {
      const byStatus = statusFilter === 'all' || d.status === statusFilter
      const byCity   = cityFilter   === 'all' || d.city   === cityFilter
      return byStatus && byCity
    }),
    [devices, statusFilter, cityFilter]
  )

  const deviceById = useMemo(() => {
    const map = new Map()
    devices.forEach(d => map.set(d.id, d))
    return map
  }, [devices])

  const dispatchedWorkers = useMemo(
    () => workers.filter(
      w => (w.status === 'dispatched' || w.status === 'repairing') && w.assignedDeviceId
    ),
    [workers]
  )

  const repairingDevices = useMemo(
    () => devices.filter(d => d.repairState === 'repairing'),
    [devices]
  )

  return (
    <div className="map-container">
      <MapContainer
        center={[36.5, 127.8]}
        zoom={7}
        style={{ width: '100%', height: '100%' }}
        attributionControl
        zoomControl
      >
        <TileLayer url={LIGHT_TILE} attribution={LIGHT_ATTR} subdomains="abcd" maxZoom={19} />
        <FlyToSelected lat={selectedLat} lng={selectedLng} />

        {/* 클러스터링 없이 개별 마커 표시 */}
        {filtered.map(d => (
          <DeviceMarker
            key={d.id}
            device={d}
            isSelected={d.id === selectedId}
            onSelect={setSelected}
          />
        ))}

        {/* 작업자: 할당된 경우만 지도 표시 */}
        {dispatchedWorkers.map(worker => {
          const target = deviceById.get(worker.assignedDeviceId)
          if (!target) return null

          return (
            <Fragment key={worker.id}>
              <Polyline
                positions={[
                  [worker.location.lat, worker.location.lng],
                  [target.location.lat, target.location.lng],
                ]}
                pathOptions={{
                  color: '#1B64DA',
                  weight: 3,
                  opacity: 0.85,
                  dashArray: '8 8',
                }}
              />

              <Marker
                position={[worker.location.lat, worker.location.lng]}
                icon={WORKER_ICON}
                zIndexOffset={700}
              >
                <Popup>
                  <div className="worker-card">
                    <div className="worker-card-title">작업자 정보</div>
                    <div className="worker-card-row"><strong>소속:</strong> {worker.department}</div>
                    <div className="worker-card-row"><strong>이름:</strong> {worker.name}</div>
                    <div className="worker-card-row"><strong>전화:</strong> {worker.phone}</div>
                    <div className="worker-card-row"><strong>목표:</strong> {target.name}</div>
                  </div>
                </Popup>
              </Marker>
            </Fragment>
          )
        })}

        {/* 장치 수리중 상태를 지도에서도 명확히 표시 */}
        {repairingDevices.map(device => (
          <Marker
            key={`repair-${device.id}`}
            position={[device.location.lat, device.location.lng]}
            icon={REPAIR_ICON}
            zIndexOffset={900}
          />
        ))}
      </MapContainer>
    </div>
  )
}
