// 서울/경기 500개 정압기 Mock 데이터 생성기

const CITIES = [
  { name: '서울', lat: 37.5665, lng: 126.9780, count: 250,
    districts: ['강남구','강서구','마포구','종로구','중구','송파구','영등포구','동작구','관악구','서초구','용산구','성동구'] },
  { name: '경기', lat: 37.4138, lng: 127.5183, count: 250,
    districts: ['수원시','성남시','고양시','용인시','부천시','안양시','평택시','화성시','남양주시','파주시','김포시','의정부시','광명시','군포시','시흥시','오산시','하남시'] },
]

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }

function randBetween(a, b) { return a + Math.random() * (b - a) }

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function generateHistory(targetPressure) {
  const history = []
  let output = targetPressure + randBetween(-0.05, 0.05)
  let input  = targetPressure + randBetween(0.3, 0.8)
  const now = Date.now()
  for (let i = 29; i >= 0; i--) {
    input  = clamp(input  + randBetween(-0.12, 0.12), 1.5, 5.0)
    output = clamp(output + randBetween(-0.06, 0.06), 0.8, 4.5)
    history.push({
      timestamp: new Date(now - i * 5000).toISOString(),
      inputPressure:  parseFloat(input.toFixed(2)),
      outputPressure: parseFloat(output.toFixed(2)),
      targetPressure: parseFloat(targetPressure.toFixed(2)),
    })
  }
  return history
}

export function generateDevices() {
  const devices = []
  let seq = 1

  for (const city of CITIES) {
    for (let i = 0; i < city.count; i++) {
      const district = pickRandom(city.districts)
      const latOffset = randBetween(-0.08, 0.08)
      const lngOffset = randBetween(-0.09, 0.09)
      const targetPressure = parseFloat(randBetween(1.8, 2.4).toFixed(2))
      const inputPressure  = parseFloat((targetPressure + randBetween(0.2, 0.9)).toFixed(2))
      const outputPressure = parseFloat((targetPressure + randBetween(-0.08, 0.08)).toFixed(2))

      // 초기 상태: 90% 정상, 7% 경고, 2% 이상, 1% 오프라인
      const r = Math.random()
      let status = 'normal'
      if      (r > 0.99) status = 'offline'
      else if (r > 0.97) status = 'error'
      else if (r > 0.90) status = 'warning'

      const id = `DEV-${String(seq).padStart(4, '0')}`
      devices.push({
        id,
        name: `${city.name} ${district} ${String(i + 1).padStart(3, '0')}`,
        city: city.name,
        address: `${city.name} ${district} 가스공급로 ${Math.floor(Math.random() * 200) + 1}`,
        location: {
          lat: parseFloat((city.lat + latOffset).toFixed(5)),
          lng: parseFloat((city.lng + lngOffset).toFixed(5)),
        },
        status,
        systemOn: status !== 'offline',

        // 압력 (kPa)
        inputPressure,
        outputPressure,
        targetPressure,
        valveOpenRate: parseFloat(randBetween(30, 80).toFixed(1)),

        // 제어 파라미터
        adjustAngle:    parseFloat(randBetween(2, 8).toFixed(1)),
        adjustInterval: Math.floor(randBetween(5, 30)),
        alarmMin: parseFloat((targetPressure - 0.4).toFixed(2)),
        alarmMax: parseFloat((targetPressure + 0.4).toFixed(2)),

        lastUpdate: new Date().toISOString(),
        history: generateHistory(targetPressure),
        lastIssue: null,       // 현재 이슈 메시지 (warning/error 시 설정)
        lastIssueTime: null,   // 이슈 발생 시각
        assignedWorkerId: null,
        repairState: 'none',   // none | dispatched | repairing
      })
      seq++
    }
  }

  return devices
}
