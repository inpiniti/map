import Script from 'next/script';
import './globals.css';

export const metadata = {
  title: '청약홈 - 아파트 분양 정보',
  description: '전국 아파트 분양 일정 및 상세 정보를 확인하세요.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <Script
          strategy="beforeInteractive"
          src={`https://openapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${process.env.NEXT_PUBLIC_NAVER_CLIENT_ID}&submodules=geocoder`}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
