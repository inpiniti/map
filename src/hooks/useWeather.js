import { useEffect, useRef } from 'react'
import { useDeviceStore } from '../store/deviceStore'

// Open-Meteo 무료 API — API 키 불필요
const WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast' +
  '?latitude=37.5665&longitude=126.9780' +
  '&current=temperature_2m,precipitation,rain,weathercode,windspeed_10m' +
  '&timezone=Asia%2FSeoul'

const WMO_LABEL = {
  0: '맑음', 1: '대체로 맑음', 2: '구름 많음', 3: '흐림',
  45: '안개', 48: '안개',
  51: '이슬비', 53: '이슬비', 55: '이슬비',
  61: '비', 63: '비', 65: '강한 비',
  71: '눈', 73: '눈', 75: '강한 눈',
  80: '소나기', 81: '소나기', 82: '강한 소나기',
  95: '뇌우', 96: '뇌우', 99: '강한 뇌우',
}

export default function useWeather() {
  const { setWeather, setWaterLevel } = useDeviceStore()
  const waterRef = useRef(0)

  useEffect(() => {
    async function fetchWeather() {
      try {
        const res = await fetch(WEATHER_URL)
        const data = await res.json()
        const c = data.current

        const weatherData = {
          temperature:  c.temperature_2m,
          precipitation: c.precipitation,
          rain:         c.rain,
          weathercode:  c.weathercode,
          windspeed:    c.windspeed_10m,
          label:        WMO_LABEL[c.weathercode] ?? '알 수 없음',
          updatedAt:    new Date().toISOString(),
        }
        setWeather(weatherData)

        // 수면 높이 시뮬레이션: 강수량 누적 + 자연 감소
        waterRef.current = Math.min(
          waterRef.current + (c.precipitation || 0) * 3,
          80
        )
      } catch {
        // 네트워크 실패 시 더미 날씨
        setWeather({
          temperature: 14,
          precipitation: 0,
          rain: 0,
          weathercode: 1,
          windspeed: 3.2,
          label: '맑음',
          updatedAt: new Date().toISOString(),
        })
      }
    }

    fetchWeather()
    const weatherTimer = setInterval(fetchWeather, 5 * 60 * 1000) // 5분마다

    // 수면 높이: 30초마다 자연 감소
    const waterTimer = setInterval(() => {
      waterRef.current = Math.max(0, waterRef.current * 0.97)
      setWaterLevel(parseFloat(waterRef.current.toFixed(1)))
    }, 30_000)

    return () => {
      clearInterval(weatherTimer)
      clearInterval(waterTimer)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
