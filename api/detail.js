export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Vercel 서버에서 청약홈 상세 정보 API 호출
    // req.body는 이미 파싱된 객체일 수 있으므로 다시 문자열화 필요할 수 있음
    const bodyStr = typeof req.body === 'string' ? req.body : new URLSearchParams(req.body).toString();

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
    const clean = (str) => str ? str.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : "";

    // 정규식을 이용한 데이터 추출
    const extract = (regex) => {
      const match = html.match(regex);
      return match ? match[1] : "";
    };

    // 타임라인 데이터 추출을 위한 특수 처리 (당첨자 발표일 등 a태그 포함 가능성)
    const extractWithTag = (regex) => {
      const match = html.match(regex);
      return match ? match[0] : "";
    };

    const data = {
      houseNm: clean(extract(/<th scope="col" colspan="2">(.*?)<\/th>/)),
      location: clean(extract(/<td>공급위치\s*<\/td>\s*<td[^>]*>(.*?)<\/td>/s)),
      scale: clean(extract(/<td>공급규모<\/td>\s*<td[^>]*>(.*?)<\/td>/s)),
      timeline: {
        announcement: clean(extract(/<th scope="row">모집공고일<\/th>\s*<td[^>]*>(.*?)<\/td>/s)).split('(')[0].trim(),
        special: clean(extract(/<td id="spSuplyRceptPd">(.*?)<\/td>/s)),
        first: clean(extract(/<td id="rnk1CrsRceptPd">(.*?)<\/td>/s)),
        second: clean(extract(/<td id="rnk2CrsRceptPd">(.*?)<\/td>/s)),
        winner: clean(extract(/<th scope="row" rowspan="1">당첨자 발표일<\/th>\s*<td[^>]*>(.*?)<\/td>/s)).split('(')[0].trim(),
        contract: clean(extract(/<th scope="row" rowspan="1">계약일<\/th>\s*<td[^>]*>(.*?)<\/td>/s))
      },
      supplyList: [],
      priceList: [],
      developer: clean(extract(/<th scope="row">시행사<\/th>\s*<td>(.*?)<\/td>/s) || extract(/<th scope="col">시행사<\/th>.*?<td>(.*?)<\/td>/s)),
      contractor: clean(extract(/<th scope="row">시공사<\/th>\s*<td>(.*?)<\/td>/s) || extract(/<th scope="col">시공사<\/th>.*?<td>(.*?)<\/td>/s))
    };

    // 공급대상 파싱
    const supplyRows = html.match(/<tr>\s*<td[^>]*>(?:민영|국민)<\/td>.*?<\/tr>/gs) || [];
    data.supplyList = supplyRows.map(row => {
      const cols = row.match(/<td[^>]*>(.*?)<\/td>/gs).map(c => clean(c));
      return { 
        type: cols[1], 
        area: cols[2], 
        gen: cols[3], 
        spec: cols[4], 
        total: cols[5] 
      };
    });

    // 금액 파싱
    const priceRows = html.match(/<tr>\s*<td>\d+.*?<\/td>\s*<td class="txt_r">.*?<\/td>.*?<\/tr>/gs) || [];
    data.priceList = priceRows.map(row => {
      const typeMatch = row.match(/<td>(.*?)<\/td>/);
      const priceMatch = row.match(/<td class="txt_r">(.*?)<\/td>/);
      return { 
        type: typeMatch ? clean(typeMatch[1]) : "", 
        price: priceMatch ? clean(priceMatch[1]) : "" 
      };
    });

    res.status(200).json(data);
  } catch (error) {
    console.error("Detail Proxy Error:", error);
    res.status(500).json({ error: error.message });
  }
}
