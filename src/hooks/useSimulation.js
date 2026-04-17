import { useEffect } from 'react'
import { useDeviceStore } from '../store/deviceStore'

const TICK_MS = 5000

function makeIssueMessage(outputPressure, targetPressure, inputPressure, status) {
  const diff = outputPressure - targetPressure
  const absDiff = Math.abs(diff)
  const ratioPct = ((absDiff / targetPressure) * 100).toFixed(0)
  const sign = diff >= 0 ? '+' : '-'
  const direction = diff >= 0 ? '과압' : '저압'
  const pressureSummary = `출력압 ${direction}: ${outputPressure.toFixed(2)} kPa (목표 ${targetPressure.toFixed(2)} kPa 대비 ${sign}${absDiff.toFixed(2)} kPa, ${ratioPct}% ${diff >= 0 ? '초과' : '하회'})`

  if (status === 'error') {
    if (diff >= 0) {
      return `${pressureSummary}. 밸브를 추가로 조여 압력을 낮추는 조치가 필요합니다.`
    }
    return `${pressureSummary}. 공급 저하 또는 누출 가능성을 우선 점검해야 합니다. (입력압 ${inputPressure.toFixed(2)} kPa)`
  }

  if (diff >= 0) {
    return `${pressureSummary}. 제어 편차가 누적 중이므로 모니터링을 강화하세요.`
  }
  return `${pressureSummary}. 목표압 복귀를 위해 단계적 밸브 개방이 필요합니다.`
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }
function rand(a, b) { return a + Math.random() * (b - a) }

function distance(a, b) {
  const dLat = a.lat - b.lat
  const dLng = a.lng - b.lng
  return Math.sqrt(dLat * dLat + dLng * dLng)
}

function moveToward(from, to, ratio) {
  return {
    lat: parseFloat((from.lat + (to.lat - from.lat) * ratio).toFixed(5)),
    lng: parseFloat((from.lng + (to.lng - from.lng) * ratio).toFixed(5)),
  }
}

export default function useSimulation() {
  useEffect(() => {
    // 초기 진입 시 이미 이상 상태인 장치도 출동 알림 큐에 올린다.
    const bootstrap = () => {
      const { devices, addDispatchAlert, workers } = useDeviceStore.getState()
      const assignedSet = new Set(
        workers
          .filter(w => w.assignedDeviceId)
          .map(w => w.assignedDeviceId)
      )

      const initialErrors = devices
        .filter(d => d.status === 'error' && !assignedSet.has(d.id))
        .slice(0, 3)

      initialErrors.forEach(d => {
        addDispatchAlert({
          id: `dispatch-init-${Date.now()}-${d.id}`,
          deviceId: d.id,
          deviceName: d.name,
          city: d.city,
          address: d.address,
          issue: d.lastIssue || makeIssueMessage(d.outputPressure, d.targetPressure, d.inputPressure, 'error'),
          outputPressure: d.outputPressure,
          targetPressure: d.targetPressure,
          timestamp: new Date().toISOString(),
        })
      })
    }

    bootstrap()

    const timer = setInterval(() => {
      const {
        devices,
        workers,
        updateDevices,
        updateWorkers,
        addDispatchAlert,
        addEvent,
      } = useDeviceStore.getState()

      const deviceById = new Map(devices.map(d => [d.id, d]))

      const workerUpdates = []
      const repairDeviceUpdates = []

      for (const worker of workers) {
        if (!worker.assignedDeviceId) continue

        const target = deviceById.get(worker.assignedDeviceId)
        if (!target) {
          workerUpdates.push({
            id: worker.id,
            status: 'available',
            assignedDeviceId: null,
            missionStatus: 'idle',
            repairTicksLeft: 0,
          })
          continue
        }

        if (worker.missionStatus === 'repairing' || worker.status === 'repairing') {
          const nextLeft = Math.max(0, (worker.repairTicksLeft || 0) - 1)
          if (nextLeft === 0) {
            workerUpdates.push({
              id: worker.id,
              status: 'available',
              assignedDeviceId: null,
              missionStatus: 'idle',
              repairTicksLeft: 0,
              location: target.location,
            })

            repairDeviceUpdates.push({
              id: target.id,
              status: 'normal',
              outputPressure: parseFloat((target.targetPressure + rand(-0.03, 0.03)).toFixed(2)),
              inputPressure: parseFloat((target.targetPressure + rand(0.25, 0.5)).toFixed(2)),
              repairState: 'none',
              assignedWorkerId: null,
              lastIssue: null,
              lastIssueTime: null,
              lastUpdate: new Date().toISOString(),
            })

            addEvent({
              id: `evt-repaired-${Date.now()}-${target.id}`,
              deviceId: target.id,
              deviceName: target.name,
              city: target.city,
              type: 'recovery',
              message: `${worker.name} 현장 수리 완료, 장치 정상 복구`,
              timestamp: new Date().toISOString(),
              location: target.address,
            })
          } else {
            workerUpdates.push({
              id: worker.id,
              status: 'repairing',
              missionStatus: 'repairing',
              repairTicksLeft: nextLeft,
            })
          }
          continue
        }

        const nextLocation = moveToward(worker.location, target.location, 0.35)
        const remainDist = distance(nextLocation, target.location)

        if (remainDist < 0.0025) {
          workerUpdates.push({
            id: worker.id,
            location: target.location,
            status: 'repairing',
            missionStatus: 'repairing',
            repairTicksLeft: 2,
          })

          if (target.repairState !== 'repairing') {
            repairDeviceUpdates.push({
              id: target.id,
              repairState: 'repairing',
              lastIssue: `작업자 도착: ${worker.name} 수리 진행 중`,
              lastIssueTime: new Date().toISOString(),
              lastUpdate: new Date().toISOString(),
            })

            addEvent({
              id: `evt-arrived-${Date.now()}-${target.id}`,
              deviceId: target.id,
              deviceName: target.name,
              city: target.city,
              type: 'control',
              message: `${worker.name} 현장 도착, 수리 작업 시작`,
              timestamp: new Date().toISOString(),
              location: target.address,
            })
          }
        } else {
          workerUpdates.push({
            id: worker.id,
            location: nextLocation,
            status: 'dispatched',
            missionStatus: 'moving',
          })
        }
      }

      const count = Math.floor(rand(12, 23))
      const picked = new Set()
      while (picked.size < count) picked.add(Math.floor(Math.random() * devices.length))

      const updates = []

      for (const idx of picked) {
        const d = devices[idx]
        if (!d.systemOn) continue
        if (d.assignedWorkerId && d.repairState !== 'none') continue

        // 입력압 랜덤워크
        const inputDelta = rand(-0.18, 0.18)
        const newInput = parseFloat(clamp(d.inputPressure + inputDelta, 1.5, 5.0).toFixed(2))

        // 밸브 자동 보정
        const error = d.outputPressure - d.targetPressure
        const correction = error * rand(0.4, 0.7) + rand(-0.08, 0.08)
        const newOutput = parseFloat(clamp(d.outputPressure - correction, 0.8, 4.5).toFixed(2))

        const newValve = parseFloat(clamp(
          d.valveOpenRate + (error > 0 ? rand(-3, 0) : rand(0, 3)),
          0, 100
        ).toFixed(1))

        // 히스토리 갱신
        const newHistory = [
          ...d.history,
          { timestamp: new Date().toISOString(), inputPressure: newInput, outputPressure: newOutput, targetPressure: d.targetPressure }
        ].slice(-30)

        // 상태 판정
        const deviation = Math.abs(newOutput - d.targetPressure)
        let newStatus = 'normal'
        if      (deviation > 0.32) newStatus = 'error'
        else if (deviation > 0.16) newStatus = 'warning'

        const prevStatus = d.status

        // 핵심 규칙: 이상(error) 상태는 수리 완료 전까지 자연복구 금지
        if (prevStatus === 'error' && d.repairState === 'none') {
          newStatus = 'error'
        }

        // 이슈 메시지 결정
        let newLastIssue = d.lastIssue
        let newLastIssueTime = d.lastIssueTime

        if (newStatus === 'warning' && prevStatus === 'normal') {
          newLastIssue     = makeIssueMessage(newOutput, d.targetPressure, newInput, 'warning')
          newLastIssueTime = new Date().toISOString()
        } else if (newStatus === 'error' && prevStatus !== 'error') {
          newLastIssue     = makeIssueMessage(newOutput, d.targetPressure, newInput, 'error')
          newLastIssueTime = new Date().toISOString()
        } else if (newStatus === 'warning' && prevStatus === 'warning') {
          // 기존 경고를 유지하되, 편차가 커지면 최신 수치로 메시지 갱신
          const prevAbs = Math.abs(d.outputPressure - d.targetPressure)
          if (Math.abs(newOutput - d.targetPressure) > prevAbs + 0.05) {
            newLastIssue = makeIssueMessage(newOutput, d.targetPressure, newInput, 'warning')
            newLastIssueTime = new Date().toISOString()
          }
        } else if (newStatus === 'error' && prevStatus === 'error') {
          const prevAbs = Math.abs(d.outputPressure - d.targetPressure)
          if (Math.abs(newOutput - d.targetPressure) > prevAbs + 0.05) {
            newLastIssue = makeIssueMessage(newOutput, d.targetPressure, newInput, 'error')
            newLastIssueTime = new Date().toISOString()
          }
        } else if (newStatus === 'normal') {
          newLastIssue     = null
          newLastIssueTime = null
        }

        // 새 이상 발생 시 출동 요청
        if (newStatus === 'error' && prevStatus !== 'error') {
          addDispatchAlert({
            id:         `dispatch-${Date.now()}-${d.id}`,
            deviceId:   d.id,
            deviceName: d.name,
            city:       d.city,
            address:    d.address,
            issue:      newLastIssue,
            outputPressure: newOutput,
            targetPressure: d.targetPressure,
            timestamp:  new Date().toISOString(),
          })
        }

        updates.push({
          id: d.id,
          inputPressure:  newInput,
          outputPressure: newOutput,
          valveOpenRate:  newValve,
          status:         newStatus,
          history:        newHistory,
          lastUpdate:     new Date().toISOString(),
          lastIssue:      newLastIssue,
          lastIssueTime:  newLastIssueTime,
        })
      }

      const mergedUpdates = [...updates, ...repairDeviceUpdates]
      if (mergedUpdates.length > 0) {
        updateDevices(mergedUpdates)
      }
      if (workerUpdates.length > 0) {
        updateWorkers(workerUpdates)
      }
    }, TICK_MS)

    return () => clearInterval(timer)
  }, [])
}
