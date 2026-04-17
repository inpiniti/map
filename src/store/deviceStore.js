import { create } from 'zustand'
import { generateDevices } from '../mock/generateDevices'

const MAX_EVENTS = 60
const MAX_WORKERS = 60

function randomInRange(min, max) {
  return min + Math.random() * (max - min)
}

function generateWorkers(devices) {
  const byCity = devices.reduce((acc, device) => {
    if (!acc[device.city]) acc[device.city] = []
    acc[device.city].push(device)
    return acc
  }, {})

  const cities = Object.keys(byCity)
  const workers = []

  for (let i = 0; i < MAX_WORKERS; i += 1) {
    const city = cities[i % cities.length]
    const baseDevice = byCity[city][Math.floor(Math.random() * byCity[city].length)]
    workers.push({
      id: `WKR-${String(i + 1).padStart(3, '0')}`,
      name: `${city} ${String(i + 1).padStart(2, '0')}팀`,
      department: `${city} 안전관리센터`,
      phone: `010-${String(1000 + i).padStart(4, '0')}-${String(7000 + i).padStart(4, '0')}`,
      location: {
        lat: parseFloat((baseDevice.location.lat + randomInRange(-0.03, 0.03)).toFixed(5)),
        lng: parseFloat((baseDevice.location.lng + randomInRange(-0.03, 0.03)).toFixed(5)),
      },
      status: 'available',
      assignedDeviceId: null,
      missionStatus: 'idle',
      repairTicksLeft: 0,
    })
  }

  return workers
}

function distanceSq(a, b) {
  const dLat = a.lat - b.lat
  const dLng = a.lng - b.lng
  return dLat * dLat + dLng * dLng
}

const initialDevices = generateDevices()
const initialWorkers = generateWorkers(initialDevices)

export const useDeviceStore = create((set, get) => ({
  // ── 원시 상태 ───────────────────────────────
  devices:         initialDevices,
  workers:         initialWorkers,
  selectedDeviceId: null,
  events:          [],
  dispatchAlerts:  [],
  statusFilter:    'all',
  cityFilter:      'all',
  weather:         null,
  waterLevel:      0,

  // ── 액션 ────────────────────────────────────
  setSelectedDevice: (id) => set({ selectedDeviceId: id }),

  updateDevices: (updates) => set(state => {
    const map = new Map(updates.map(u => [u.id, u]))
    const nextDevices = state.devices.map(d => {
      if (!map.has(d.id)) return d
      const merged = { ...d, ...map.get(d.id) }
      if (merged.status === 'normal') {
        return {
          ...merged,
          assignedWorkerId: null,
          repairState: 'none',
        }
      }
      return merged
    })

    // 이상/경고에서 정상 복구되면 할당 작업자 자동 해제
    const recoveredDeviceIds = new Set(
      updates
        .filter(u => u.status === 'normal')
        .map(u => u.id)
    )

    const nextWorkers = recoveredDeviceIds.size === 0
      ? state.workers
      : state.workers.map(w => (
          recoveredDeviceIds.has(w.assignedDeviceId)
            ? {
                ...w,
                status: 'available',
                assignedDeviceId: null,
                missionStatus: 'idle',
                repairTicksLeft: 0,
              }
            : w
        ))

    return {
      devices: nextDevices,
      workers: nextWorkers,
    }
  }),

  updateDeviceControl: (deviceId, patch) => set(state => ({
    devices: state.devices.map(d =>
      d.id === deviceId ? { ...d, ...patch } : d
    )
  })),

  updateWorkers: (updates) => set(state => {
    const map = new Map(updates.map(u => [u.id, u]))
    return {
      workers: state.workers.map(w => (
        map.has(w.id) ? { ...w, ...map.get(w.id) } : w
      ))
    }
  }),

  addEvent: (event) => set(state => ({
    events: [event, ...state.events].slice(0, MAX_EVENTS)
  })),

  addDispatchAlert: (alert) => set(state => {
    const withoutSameDevice = state.dispatchAlerts.filter(a => a.deviceId !== alert.deviceId)
    return {
      dispatchAlerts: [alert, ...withoutSameDevice]
    }
  }),

  dismissDispatchAlert: (id) => set(state => ({
    dispatchAlerts: state.dispatchAlerts.filter(a => a.id !== id)
  })),

  assignWorkerToDevice: (deviceId) => {
    const { workers, devices } = get()
    const target = devices.find(d => d.id === deviceId)
    if (!target) return
    if (target.assignedWorkerId) return

    const availableWorkers = workers.filter(w => w.status === 'available')
    if (availableWorkers.length === 0) {
      get().addEvent({
        id: `evt-dispatch-fail-${Date.now()}`,
        deviceId: target.id,
        deviceName: target.name,
        city: target.city,
        type: 'dispatch',
        message: '가용 작업자가 없어 출동 지시를 보류했습니다',
        timestamp: new Date().toISOString(),
        location: target.address,
      })
      return
    }

    const selectedWorker = availableWorkers
      .slice()
      .sort((a, b) => (
        distanceSq(a.location, target.location) - distanceSq(b.location, target.location)
      ))[0]

    set(state => ({
      dispatchAlerts: state.dispatchAlerts.filter(a => a.deviceId !== deviceId),
      workers: state.workers.map(w => (
        w.id === selectedWorker.id
          ? {
              ...w,
              status: 'dispatched',
              assignedDeviceId: deviceId,
              missionStatus: 'moving',
              repairTicksLeft: 0,
            }
          : w
      )),
      devices: state.devices.map(d => (
        d.id === deviceId
          ? {
              ...d,
              assignedWorkerId: selectedWorker.id,
              repairState: 'dispatched',
            }
          : d
      )),
    }))

    get().addEvent({
      id: `evt-dispatch-${Date.now()}`,
      deviceId: target.id,
      deviceName: target.name,
      city: target.city,
      type: 'dispatch',
      message: `${selectedWorker.department} ${selectedWorker.name} 출동 배정 (${selectedWorker.phone})`,
      timestamp: new Date().toISOString(),
      location: target.address,
    })
  },

  dispatchTeam: (id) => {
    const { dispatchAlerts } = get()
    const alert = dispatchAlerts.find(a => a.id === id)
    if (!alert) return
    get().assignWorkerToDevice(alert.deviceId)
  },

  setStatusFilter: (f) => set({ statusFilter: f }),
  setCityFilter:   (c) => set({ cityFilter: c }),
  setWeather:      (w) => set({ weather: w }),
  setWaterLevel:   (v) => set({ waterLevel: v }),
}))
