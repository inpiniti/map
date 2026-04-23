import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const bodyStr = new URLSearchParams(formData).toString();

    const response = await fetch("https://www.applyhome.co.kr/ai/aia/selectAPTLttotPblancDetail.do", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": "https://www.applyhome.co.kr/ai/aib/selectSubscrptCalenderView.do",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"
      },
      body: bodyStr
    });

    const html = await response.text();
    
    // 이스케이프 제거 및 태그 정리 함수
    const clean = (str) => str ? str.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() : "";

    // 날짜만 추출하는 함수 (숫자, ., -, ~ 만 남김)
    const cleanDate = (str) => {
      const cleaned = clean(str).split('(')[0].trim();
      return cleaned.replace(/[^0-9.\-~ ]/g, '').trim();
    };

    // 정규식을 이용한 데이터 추출
    const extract = (regex) => {
      const match = html.match(regex);
      return match ? match[1] : "";
    };

    const data = {
      houseNm: clean(extract(/<th scope="col" colspan="2">(.*?)<\/th>/)),
      location: clean(extract(/<td>공급위치\s*<\/td>\s*<td[^>]*>(.*?)<\/td>/s)),
      scale: clean(extract(/<td>공급규모<\/td>\s*<td[^>]*>(.*?)<\/td>/s)),
      timeline: {
        announcement: cleanDate(extract(/<th scope="row">모집공고일<\/th>\s*<td[^>]*>(.*?)<\/td>/s)),
        special: cleanDate(extract(/<td id="spSuplyRceptPd">(.*?)<\/td>/s)),
        first: cleanDate(extract(/<td id="rnk1CrsRceptPd">(.*?)<\/td>/s)),
        second: cleanDate(extract(/<td id="rnk2CrsRceptPd">(.*?)<\/td>/s)),
        winner: cleanDate(extract(/<th scope="row" rowspan="1">당첨자 발표일<\/th>\s*<td[^>]*>(.*?)<\/td>/s)),
        contract: cleanDate(extract(/<th scope="row" rowspan="1">계약일<\/th>\s*<td[^>]*>(.*?)<\/td>/s))
      },
      supplyList: [],
      priceList: [],
      developer: clean(extract(/<th scope="row">시행사<\/th>\s*<td>(.*?)<\/td>/s) || extract(/<th scope="col">시행사<\/th>.*?<td>(.*?)<\/td>/s)),
      contractor: clean(extract(/<th scope="row">시공사<\/th>\s*<td>(.*?)<\/td>/s) || extract(/<th scope="col">시공사<\/th>.*?<td>(.*?)<\/td>/s))
    };

    // 1. 공급대상 파싱
    const supplyRows = html.match(/<tr>(.*?)<\/tr>/gs) || [];
    const supplyList = supplyRows.map(row => {
      const cells = row.match(/<td[^>]*>(.*?)<\/td>/gs);
      if (!cells || cells.length < 4) return null;
      const cols = cells.map(c => clean(c));

      // 주택형 찾기 (보통 '084.' 형식을 포함함)
      let typeIdx = cols.findIndex(c => /\d{3}\./.test(c) || /^[A-Z0-9]+[A-Z]$/.test(c));
      if (typeIdx === -1) typeIdx = cols.length > 5 ? 1 : 0; // 못 찾으면 추측

      const type = cols[typeIdx];
      const area = cols[typeIdx + 1];
      const gen = cols[typeIdx + 2];
      const spec = cols[typeIdx + 3];
      const total = cols[typeIdx + 4];

      if (!type || !/\d/.test(total || "")) return null;

      return { type, area, gen, spec, total };
    }).filter(Boolean);

    // 2. 금액 파싱
    const priceRows = html.match(/<tr>(.*?)<\/tr>/gs) || [];
    const priceMap = {};
    priceRows.forEach(row => {
      const cells = row.match(/<td[^>]*>(.*?)<\/td>/gs);
      if (!cells || cells.length < 2) return;
      const cols = cells.map(c => clean(c));
      
      // 금액 컬럼 찾기 (txt_r 클래스가 있거나 숫자에 콤마 포함)
      let priceIdx = -1;
      const priceCellMatch = row.match(/<td class="txt_r">(.*?)<\/td>/);
      if (priceCellMatch) {
        priceIdx = cells.findIndex(c => c.includes(priceCellMatch[1]));
      } else {
        priceIdx = cols.findIndex(c => /[\d,]{4,}/.test(c));
      }

      if (priceIdx > 0) {
        const type = cols[priceIdx - 1]; // 금액 바로 앞이 보통 주택형
        const price = cols[priceIdx];
        if (type && price) priceMap[type] = price;
      }
    });

    // 3. 데이터 병합 (Combined List)
    const combinedList = supplyList
      .filter(item => {
        const totalNum = parseInt(item.total.replace(/[^0-9]/g, ''));
        return totalNum > 0; // 합계가 0보다 큰 것만 포함
      })
      .map(item => ({
        ...item,
        price: priceMap[item.type] || ""
      }));

    return NextResponse.json({
      ...data,
      combinedList
    });
  } catch (error) {
    console.error("Next.js API Route Error (detail):", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
