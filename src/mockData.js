export const SUBSCRIPTION_DATA = [
  {
    id: 1,
    title: '북수원이목지구 대방 디에트르 더 리체Ⅱ(A3BL)',
    location: '경기도 수원시 장안구 이목동 종전부동산 이목지구 도시개발사업 A3블록 공동주택용지',
    scale: '1744세대',
    contact: '1688-4007',
    announcementDate: '2025-04-25',
    schedule: {
      special: { date: '2025-05-07', type: '특별공급' },
      priority1: { date: '2025-05-08', type: '1순위' },
      priority2: { date: '2025-05-09', type: '2순위' },
      winner: { date: '2025-05-15', type: '당첨자 발표' },
      contract: { start: '2025-05-26', end: '2025-05-28', type: '계약일' }
    },
    price: [
      { type: '084.8536A', amount: '114,087', deposit: '없음' },
      { type: '084.3693B', amount: '107,673', deposit: '없음' },
      { type: '084.9796C', amount: '103,066', deposit: '없음' },
      { type: '084.8536P', amount: '158,747', deposit: '없음' }
    ],
    isSpecial: true,
    region: '경기',
    coordinates: [37.289, 127.009]
  },
  {
    id: 2,
    title: '고양 더샵포레나',
    location: '경기도 고양시 일산동구',
    scale: '800세대',
    contact: '1588-0000',
    announcementDate: '2025-04-20',
    schedule: {
      special: { date: '2025-05-12', type: '특별공급' },
      priority1: { date: '2025-05-13', type: '1순위' },
      winner: { date: '2025-05-20', type: '당첨자 발표' }
    },
    price: [{ type: '084.A', amount: '89,000', deposit: '없음' }],
    isSpecial: true,
    region: '경기',
    coordinates: [37.658, 126.832]
  },
  {
    id: 3,
    title: '동탄 꿈의숲 자연앤 데시앙',
    location: '경기도 화성시 동탄2신도시',
    scale: '1200세대',
    contact: '1577-1234',
    announcementDate: '2025-04-22',
    schedule: {
      special: { date: '2025-05-19', type: '특별공급' },
      priority1: { date: '2025-05-20', type: '1순위' },
      winner: { date: '2025-05-27', type: '당첨자 발표' }
    },
    price: [{ type: '084.B', amount: '95,000', deposit: '없음' }],
    isSpecial: true,
    region: '경기',
    coordinates: [37.199, 127.114]
  },
  {
    id: 4,
    title: '평택 브레인시티 10BL',
    location: '경기도 평택시 브레인시티',
    scale: '1500세대',
    contact: '1688-9999',
    announcementDate: '2025-04-25',
    schedule: {
      special: { date: '2025-05-26', type: '특별공급' },
      priority1: { date: '2025-05-27', type: '1순위' },
      winner: { date: '2025-06-03', type: '당첨자 발표' }
    },
    price: [{ type: '084.P', amount: '78,000', deposit: '없음' }],
    isSpecial: true,
    region: '경기',
    coordinates: [37.024, 127.086]
  }
];

export const SUPPLY_TYPES = ['아파트', '오피스텔/생활숙박시설/도시형생활주택/민간임대', '공공지원민간임대'];
export const CATEGORIES = ['특별공급', '1순위', '2순위', '무순위', '임의공급', '불법행위재공급'];
export const REGIONS = [
  '서울', '광주', '대구', '대전', '부산', '세종', '울산', '인천',
  '강원', '경기', '경남', '경북', '전남', '전북', '제주', '충남', '충북'
];
