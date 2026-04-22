export default async function handler(req, res) {
  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Vercel 서버 사이드에서 청약홈 API 호출
    const response = await fetch("https://www.applyhome.co.kr/ai/aib/selectSubscrptCalender.do", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Referer": "https://www.applyhome.co.kr/ai/aib/selectSubscrptCalenderView.do",
        "Origin": "https://www.applyhome.co.kr",
        "accept": "application/json, text/javascript, */*; q=0.01",
        "ajaxat": "Y",
        "gvpgmid": "AIB01M01",
        "x-requested-with": "XMLHttpRequest"
      },
      // 클라이언트에서 받은 body를 그대로 전달
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      throw new Error(`청약홈 API 응답 에러: ${response.status}`);
    }

    const data = await response.json();
    
    // 결과를 클라이언트에 반환
    res.status(200).json(data);
  } catch (error) {
    console.error("Vercel 서버리스 함수 오류:", error);
    res.status(500).json({ error: error.message });
  }
}
