import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // 청약홈 API 호출
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
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      return NextResponse.json({ error: `청약홈 API 응답 에러: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Next.js API Route Error (subscrpt):", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
