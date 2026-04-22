import React from 'react';
import './App.css';

const STORAGE_KEY = 'housing_filter_settings';

const App = () => {
  // 오늘 날짜 기준 초기화
  const today = new Date();
  const [year, setYear] = React.useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = React.useState(today.getMonth() + 1);

  // 로컬스토리지에서 이전 설정 불러오기
  const getSavedSettings = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to load settings:", e);
      return null;
    }
  };

  const savedSettings = getSavedSettings();

  // 공급유형 상태 (초기값은 전체 선택)
  const [aptChecked, setAptChecked] = React.useState(savedSettings?.aptChecked ?? true);
  const [aptSubTypes, setAptSubTypes] = React.useState(savedSettings?.aptSubTypes ?? {
    special: true, first: true, second: true, none: true, arbitrary: true, illegal: true
  });
  const [otherSupplies, setOtherSupplies] = React.useState(savedSettings?.otherSupplies ?? {
    officetel: true,
    publicRental: true
  });

  // 공급지역 상태 (초기값은 전체 선택)
  const [seoulChecked, setSeoulChecked] = React.useState(savedSettings?.seoulChecked ?? true);
  
  const [metroChecked, setMetroChecked] = React.useState(savedSettings?.metroChecked ?? true);
  const [metroSubTypes, setMetroSubTypes] = React.useState(savedSettings?.metroSubTypes ?? {
    광주: true, 대구: true, 대전: true, 부산: true, 세종: true, 울산: true, 인천: true
  });

  const [provinceChecked, setProvinceChecked] = React.useState(savedSettings?.provinceChecked ?? true);
  const [provinceSubTypes, setProvinceSubTypes] = React.useState(savedSettings?.provinceSubTypes ?? {
    강원: true, 경기: true, 경남: true, 경북: true, 전남: true, 전북: true, 제주: true, 충남: true, 충북: true
  });

  // 설정이 변경될 때마다 로컬스토리지에 저장
  React.useEffect(() => {
    const settings = {
      aptChecked, aptSubTypes, otherSupplies,
      seoulChecked, metroChecked, metroSubTypes,
      provinceChecked, provinceSubTypes
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [aptChecked, aptSubTypes, otherSupplies, seoulChecked, metroChecked, metroSubTypes, provinceChecked, provinceSubTypes]);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const [fullData, setFullData] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  // 데이터 가져오기 (실제 API 호출 - Proxy 이용)
  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const targetMonth = `${year}${String(selectedMonth).padStart(2, '0')}`;
      console.log(`Fetching data for: ${targetMonth}`);
      
      // 개발 환경과 배포 환경(Vercel)에 따라 엔드포인트 구분
      const apiUrl = process.env.NODE_ENV === 'development' 
        ? "/ai/aib/selectSubscrptCalender.do" 
        : "/api/subscrpt";

      const response = await fetch(apiUrl, {
        "headers": {
          "accept": "application/json, text/javascript, */*; q=0.01",
          "ajaxat": "Y",
          "content-type": "application/json",
          "gvpgmid": "AIB01M01",
          "x-requested-with": "XMLHttpRequest",
        },
        "body": JSON.stringify({
          "reqData": {
            "inqirePd": targetMonth
          }
        }),
        "method": "POST"
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("API Response received:", result);
      
      if (result && result.schdulList) {
        setFullData(result.schdulList);
      } else {
        setFullData([]);
      }
    } catch (error) {
      console.error("데이터 조회 실패:", error);
      // 에러 발생 시 데이터 초기화
      setFullData([]);
    } finally {
      setLoading(false);
    }
  }, [year, selectedMonth]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 필터링된 데이터 계산
  const filteredData = React.useMemo(() => {
    return fullData.filter(item => {
      // 1. 공급 유형 필터
      let typeMatch = false;

      // 아파트 체크 여부
      if (aptChecked) {
        // 하위 항목 체크 여부 (RCEPT_SE 매핑)
        const typeMap = {
          special: "01",
          first: "02",
          second: "03",
          none: "06",
          arbitrary: "11",
          illegal: "04"
        };
        
        // 해당 항목이 체크되어 있고 데이터의 RCEPT_SE와 일치하는가?
        Object.entries(typeMap).forEach(([key, code]) => {
          if (aptSubTypes[key] && item.RCEPT_SE === code) typeMatch = true;
        });

        // HOUSE_SECD가 01인 경우 아파트로 간주 (RCEPT_SE가 위 맵에 없는 경우라도 아파트 대분류 체크 시 포함할지 여부)
        // 여기서는 명확하게 체크된 하위 항목만 매칭함
      }

      // 오피스텔/기타 등
      if (otherSupplies.officetel && (item.HOUSE_SECD === "02" || item.HOUSE_SECD === "03")) typeMatch = true;
      // 공공지원 민감임대
      if (otherSupplies.publicRental && item.HOUSE_SECD === "06") typeMatch = true;

      if (!typeMatch) return false;

      // 2. 공급 지역 필터
      let regionMatch = false;
      const regionNm = item.SUBSCRPT_AREA_CODE_NM;

      if (seoulChecked && regionNm === "서울") regionMatch = true;
      if (metroChecked && metroSubTypes[regionNm]) regionMatch = true;
      if (provinceChecked && provinceSubTypes[regionNm]) regionMatch = true;

      return regionMatch;
    });
  }, [fullData, aptChecked, aptSubTypes, otherSupplies, seoulChecked, metroChecked, metroSubTypes, provinceChecked, provinceSubTypes]);

  // 타입 라벨 변환
  const getTypeLabel = (item) => {
    if (item.HOUSE_SECD === "01") {
      switch(item.RCEPT_SE) {
        case "01": return "특별공급";
        case "02": return "1순위";
        case "03": return "2순위";
        case "06": return "무순위";
        case "07": return "임의공급";
        default: return "아파트";
      }
    } else if (item.HOUSE_SECD === "11") {
      return "오피스텔";
    } else if (item.HOUSE_SECD === "02") {
      return "도시형";
    } else if (item.HOUSE_SECD === "03") {
      return "민간임대";
    }
    return "기타공급";
  };

  return (
    <div className="container">
      {/* 1. 최상단 헤더 */}
      <header className="top-header">
        <div className="header-left">
          <div className="brand-logo">
             <span className="logo-icon">🏢</span>
             <span className="logo-text">청약홈</span>
          </div>
        </div>
        <div className="header-actions">
          <span className="settings-icon">⚙️</span>
        </div>
      </header>

      {/* 2. 서브 내비게이션 영역 -> 연도 선택기로 변경 */}
      <div className="sub-nav-section year-selector-section">
        <div className="year-selector">
          <button className="year-nav-btn" onClick={() => setYear(year - 1)}>‹</button>
          <span className="current-year">{year}</span>
          <button className="year-nav-btn" onClick={() => setYear(year + 1)}>›</button>
        </div>
      </div>

      {/* 3. 메인 검색 바 -> 월 선택기로 변경 */}
      <div className="main-search-bar month-selector-bar">
        {months.map((m) => (
          <div 
            key={m} 
            className={`month-item ${selectedMonth === m ? 'active' : ''}`}
            onClick={() => setSelectedMonth(m)}
          >
            <span className="month-text">{m}월</span>
          </div>
        ))}
      </div>

      {/* 4. 메인 컨텐츠 영역 */}
      <div className="main-container">
        {/* 왼쪽 사이드바 */}
        <aside className="sidebar">
          {/* 공급 유형 필터 카드 */}
          <div className="filter-section">
            <div className="filter-header">
              <h3>공급유형</h3>
              <span className="reset" onClick={() => {
                setAptChecked(true);
                setAptSubTypes({
                  special: true, first: true, second: true, none: true, arbitrary: true, illegal: true
                });
                setOtherSupplies({ officetel: false, publicRental: false });
              }}>초기화</span>
            </div>
            
            <div className="filter-group">
               {/* 아파트 부모 체크박스 */}
               <div className="filter-option parent">
                 <label>
                   <input 
                    type="checkbox" 
                    checked={aptChecked} 
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setAptChecked(checked);
                      setAptSubTypes({
                        special: checked, first: checked, second: checked,
                        none: checked, arbitrary: checked, illegal: checked
                      });
                    }}
                   /> 
                   <span>아파트</span>
                 </label>
               </div>

               {/* 아파트 하위 항목 (Indented) */}
               <div className="sub-filter-group visible">
                  {Object.entries({
                    special: '특별공급',
                    first: '1순위',
                    second: '2순위',
                    none: '무순위',
                    arbitrary: '임의공급',
                    illegal: '불법행위재공급'
                  }).map(([key, label]) => (
                    <div className="filter-option sub" key={key}>
                      <label>
                        <input 
                          type="checkbox" 
                          checked={aptSubTypes[key]} 
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            const newSub = { ...aptSubTypes, [key]: isChecked };
                            setAptSubTypes(newSub);
                            if (isChecked) setAptChecked(true);
                            else if (!Object.values(newSub).some(v => v)) setAptChecked(false);
                          }}
                        /> 
                        <span>{label}</span>
                      </label>
                    </div>
                  ))}
               </div>

               {/* 기타 공급 유형 */}
               <div className="filter-option">
                 <label>
                   <input 
                    type="checkbox" 
                    checked={otherSupplies.officetel}
                    onChange={(e) => setOtherSupplies({...otherSupplies, officetel: e.target.checked})}
                   /> 
                   <span>오피스텔/생활숙박시설/도시형생활주택/민간임대</span>
                 </label>
               </div>
               <div className="filter-option">
                 <label>
                   <input 
                    type="checkbox" 
                    checked={otherSupplies.publicRental}
                    onChange={(e) => setOtherSupplies({...otherSupplies, publicRental: e.target.checked})}
                   /> 
                   <span>공공지원 민간임대</span>
                 </label>
               </div>
            </div>
          </div>

          {/* 공급 지역 필터 카드 */}
          <div className="filter-section">
            <div className="filter-header">
              <h3>공급지역</h3>
              <span className="reset" onClick={() => {
                setSeoulChecked(true);
                setMetroChecked(false);
                setMetroSubTypes(Object.keys(metroSubTypes).reduce((obj, k) => ({...obj, [k]: false}), {}));
                setProvinceChecked(true);
                setProvinceSubTypes(Object.keys(provinceSubTypes).reduce((obj, k) => ({...obj, [k]: k === '경기'}), {}));
              }}>초기화</span>
            </div>

            <div className="filter-group">
               {/* 서울 */}
               <div className="filter-option parent">
                 <label>
                   <input type="checkbox" checked={seoulChecked} onChange={(e) => setSeoulChecked(e.target.checked)} /> 
                   <span>서울</span>
                 </label>
               </div>

               {/* 광역 */}
               <div className="filter-option parent">
                 <label>
                   <input 
                    type="checkbox" 
                    checked={metroChecked} 
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setMetroChecked(checked);
                      setMetroSubTypes(Object.keys(metroSubTypes).reduce((obj, k) => ({...obj, [k]: checked}), {}));
                    }} 
                   /> 
                   <span>광역</span>
                 </label>
               </div>
               <div className="sub-filter-group visible">
                  {Object.keys(metroSubTypes).map(name => (
                    <div className="filter-option sub" key={name}>
                      <label>
                        <input 
                          type="checkbox" 
                          checked={metroSubTypes[name]} 
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            const newSub = { ...metroSubTypes, [name]: isChecked };
                            setMetroSubTypes(newSub);
                            if (isChecked) setMetroChecked(true);
                            else if (!Object.values(newSub).some(v => v)) setMetroChecked(false);
                          }}
                        /> 
                        <span>{name}</span>
                      </label>
                    </div>
                  ))}
               </div>

               {/* 도 */}
               <div className="filter-option parent">
                 <label>
                   <input 
                    type="checkbox" 
                    checked={provinceChecked} 
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setProvinceChecked(checked);
                      setProvinceSubTypes(Object.keys(provinceSubTypes).reduce((obj, k) => ({...obj, [k]: checked}), {}));
                    }} 
                   /> 
                   <span>도</span>
                 </label>
               </div>
               <div className="sub-filter-group visible">
                  {Object.keys(provinceSubTypes).map(name => (
                    <div className="filter-option sub" key={name}>
                      <label>
                        <input 
                          type="checkbox" 
                          checked={provinceSubTypes[name]} 
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            const newSub = { ...provinceSubTypes, [name]: isChecked };
                            setProvinceSubTypes(newSub);
                            if (isChecked) setProvinceChecked(true);
                            else if (!Object.values(newSub).some(v => v)) setProvinceChecked(false);
                          }}
                        /> 
                        <span>{name}</span>
                      </label>
                    </div>
                  ))}
               </div>
            </div>
          </div>

        </aside>

        {/* 중앙 결과 섹션 */}
        <main className="results">
          {/* 상단 날짜 카운트 요약 */}
          <div className="results-header">
             <div className="found-count">
               {loading ? "데이터를 불러오는 중..." : (
                 <>총 <strong>{filteredData.length}개</strong>의 청약 정보가 있습니다.</>
               )}
             </div>
             <div className="sort-actions">
               <span>추천순 ▾</span>
             </div>
          </div>

          {loading ? (
            <div className="loading-state">잠시만 기다려 주세요...</div>
          ) : filteredData.length > 0 ? (
            filteredData.map((house, idx) => (
              <HousingCard 
                key={`${house.HOUSE_MANAGE_NO}-${house.RCEPT_SE}-${idx}`} 
                data={house} 
                getTypeLabel={getTypeLabel}
              />
            ))
          ) : (
            <div className="no-results">
              <span className="no-results-icon">📂</span>
              <p>선택하신 필터 조건에 맞는 청약 정보가 없습니다.</p>
              <p className="sub-text">다른 지역이나 공급 유형을 선택해 보세요.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

// 네이버 지도 컴포넌트
const NaverMap = ({ address, houseName, isDetailLoading }) => {
  const mapElement = React.useRef(null);
  const mapRef = React.useRef(null);
  const markerRef = React.useRef(null);
  const infoWindowRef = React.useRef(null);
  const lastCallRef = React.useRef(''); // 마지막으로 검색 "시작"한 주소
  const [status, setStatus] = React.useState('loading');

  React.useEffect(() => {
    // 1. 상세 데이터가 도착할 때까지 아예 실행하지 않고 기다립니다 (1회 호출 핵심)
    if (isDetailLoading || !address || !address.includes(' ') || lastCallRef.current === address) {
      // 주소에 공백이 없으면(단순 지역명) 상세 주소가 아니라고 판단하여 대기함
      return;
    }
    
    lastCallRef.current = address;
    console.log(`[Map] Final Single Call for: ${address}`);

    let retryCount = 0;
    const initMap = () => {
      const { naver } = window;
      if (!naver || !naver.maps || !naver.maps.Service || !naver.maps.Service.geocode) {
        if (retryCount < 50) {
          retryCount++;
          setTimeout(initMap, 100);
          return;
        }
        setStatus('error');
        return;
      }

      // 지도 생성 (없을 때만)
      if (!mapRef.current && mapElement.current) {
        mapRef.current = new naver.maps.Map(mapElement.current, {
          center: new naver.maps.LatLng(37.5665, 126.9780),
          zoom: 16,
          mapTypeControl: true
        });
      }

      const renderMap = (coords, isFallback) => {
        if (mapRef.current) {
          mapRef.current.setCenter(coords);
          if (markerRef.current) markerRef.current.setMap(null);
          markerRef.current = new naver.maps.Marker({ position: coords, map: mapRef.current, animation: naver.maps.Animation.DROP });
          if (infoWindowRef.current) infoWindowRef.current.close();
          infoWindowRef.current = new naver.maps.InfoWindow({
            content: `<div style="padding:15px;min-width:200px;line-height:1.6;border-radius:8px;"><h4 style="margin:0 0 5px;font-size:15px;color:#3182f6;font-weight:800;">${houseName}</h4><p style="margin:0;font-size:13px;color:#4e5968;">${isFallback ? '주소를 찾을 수 없어 서울 시청으로 표시합니다.' : address}</p></div>`
          });
          infoWindowRef.current.open(mapRef.current, markerRef.current);
          setStatus('ready');
        }
      };

      // 1. 괄호 밖 주소 (기본)
      const cleanAddress = address.replace(/\(.*?\)/g, '').split(',')[0].trim();
      // 2. 괄호 안 주소 추출
      const match = address.match(/\((.*?)\)/);
      const insideAddress = match ? match[1].replace(/일원|일대/g, '').trim() : null;
      
      const tryGeocode = (query, nextStep) => {
        naver.maps.Service.geocode({ query }, (s, response) => {
          if (s === naver.maps.Service.Status.OK && response.v2.addresses[0]) {
            const res = response.v2.addresses[0];
            renderMap(new naver.maps.LatLng(res.y, res.x), false);
          } else if (nextStep) {
            nextStep();
          } else {
            renderMap(new naver.maps.LatLng(37.5665, 126.9780), true);
          }
        });
      };

      // 단계별 실행: 괄호 밖 -> 괄호 안 -> 원본 -> 서울시청
      tryGeocode(cleanAddress, () => {
        if (insideAddress && insideAddress.length > 5) {
          tryGeocode(insideAddress, () => tryGeocode(address));
        } else {
          tryGeocode(address);
        }
      });
    };

    initMap();
  }, [address, houseName, isDetailLoading]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#f2f4f6' }}>
      <div ref={mapElement} style={{ width: '100%', height: '100%' }} />
      {status === 'loading' && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#8b95a1', fontSize: '14px' }}>
          네이버 지도를 불러오는 중...
        </div>
      )}
      {status === 'error' && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#f04452', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
          네이버 지도 서비스를 로드할 수 없습니다.<br/>
          (Client ID와 서비스를 확인해주세요)
        </div>
      )}
    </div>
  );
};

// 청약 정보 카드 컴포넌트
const HousingCard = ({ data, getTypeLabel }) => {
  const [expanded, setExpanded] = React.useState(false);
  const [detail, setDetail] = React.useState(null);
  const [loadingDetail, setLoadingDetail] = React.useState(false);
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr.includes('.') || dateStr.includes('~')) return dateStr;
    return `${dateStr.slice(0, 4)}.${dateStr.slice(4, 6)}.${dateStr.slice(6, 8)}`;
  };

  const getDayName = (dayCode) => {
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    return days[parseInt(dayCode)] || '화';
  };

  const fetchingRef = React.useRef(false);

  React.useEffect(() => {
    if (!expanded || detail || fetchingRef.current) return;

    const loadData = async () => {
      fetchingRef.current = true;
      setLoadingDetail(true);
      try {
        const apiUrl = process.env.NODE_ENV === 'development' 
          ? "/ai/aia/selectAPTLttotPblancDetail.do" 
          : "/api/detail";

        const params = new URLSearchParams();
        params.append('houseManageNo', data.HOUSE_MANAGE_NO);
        params.append('pblancNo', data.PBLANC_NO);
        params.append('houseSecd', data.HOUSE_SECD);
        params.append('gvPgmId', "AIB01M01");

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString()
        });

        if (!response.ok) throw new Error("상세 정보 로드 실패");
        
        const html = await response.text();
        const clean = (str) => str ? str.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : "";
        
        // 테이블 추출 함수 (헤더 텍스트로 찾기)
        const findTableByHeader = (headerText) => {
          const tables = html.match(/<table[^>]*>.*?<\/table>/gs) || [];
          return tables.find(t => t.includes(headerText)) || "";
        };

        const extract = (regex) => {
          const match = html.match(regex);
          return match ? match[1] : "";
        };

        const result = {
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
          developer: clean(extract(/<th scope="row">시행사<\/th>\s*<td>(.*?)<\/td>/s)),
          contractor: clean(extract(/<th scope="row">시공사<\/th>\s*<td>(.*?)<\/td>/s))
        };

        // 공통 테이블 파싱 함수 (헤더 텍스트로 인덱스 찾기)
        const parseTableWithHeaders = (tableHtml, searchHeaders) => {
          const rows = tableHtml.match(/<tr[^>]*>(.*?)<\/tr>/gs) || [];
          if (rows.length < 2) return [];

          // 헤더 인덱스 매핑
          const headerRow = rows[0];
          const headerCells = headerRow.match(/<th[^>]*>(.*?)<\/th>/gs) || headerRow.match(/<td[^>]*>(.*?)<\/td>/gs) || [];
          const headerTexts = headerCells.map(c => clean(c));
          
          const indices = {};
          searchHeaders.forEach(sh => {
            indices[sh.key] = headerTexts.findIndex(ht => ht.includes(sh.label));
          });

          // 데이터 추출
          return rows.slice(1).filter(r => r.includes('</td>')).map(row => {
            const cells = row.match(/<td[^>]*>(.*?)<\/td>/gs) || [];
            const cols = cells.map(c => clean(c));
            
            const item = { isTotal: row.includes('계') || row.includes('합계') };
            searchHeaders.forEach(sh => {
              const idx = indices[sh.key];
              // 인덱스를 못 찾았을 경우 끝에서부터의 역추적 방지 위해 명시적으로 idx 체크
              item[sh.key] = (idx !== -1 && idx < cols.length) ? cols[idx] : "-";
            });
            return item;
          }).filter(it => it.type !== "-");
        };

        // 공급대상 파싱 (지능형)
        const supplyTable = findTableByHeader('공급면적') || findTableByHeader('공급대상');
        result.supplyList = parseTableWithHeaders(supplyTable, [
          { key: 'type', label: '주택형' },
          { key: 'area', label: '면적' },
          { key: 'gen', label: '일반' },
          { key: 'spec', label: '특별' },
          { key: 'total', label: '합계' }
        ]);

        // 분양가 파싱 (지능형)
        const priceTable = findTableByHeader('분양금액') || findTableByHeader('공급금액');
        result.priceList = parseTableWithHeaders(priceTable, [
          { key: 'type', label: '주택형' },
          { key: 'price', label: '금액' }
        ]);

        setDetail(result);
      } catch (error) {
        console.error("데이터 파싱 실패:", error);
      } finally {
        setLoadingDetail(false);
        fetchingRef.current = false;
      }
    };

    loadData();
  }, [expanded, detail, data]);

  return (
    <div className={`housing-card ${expanded ? 'expanded' : ''}`}>
      <div className="card-main" onClick={() => setExpanded(!expanded)}>
        <div className="house-header">
          <div className="house-icon">🏢</div>
          <div className="house-title-group">
            <h1 className="house-name">{data.HOUSE_NM}</h1>
            <div className="house-meta">
              <span>공고번호: {data.PBLANC_NO}</span>
              <span className="separator">|</span>
              <span>{data.SUBSCRPT_AREA_CODE_NM}</span>
            </div>
          </div>
        </div>

        <div className="house-info-summary">
          <div className="info-block">
             <label>접수 일자</label>
             <div className="value">{formatDate(data.IN_DATE)} <span className="day">({getDayName(data.IN_DAY)})</span></div>
          </div>
          <div className="info-block">
             <label>구분</label>
             <div className="value highlight">{getTypeLabel ? getTypeLabel(data) : "청약정보"}</div>
          </div>
        </div>

        <button className="expand-action-btn">
          {expanded ? "접기 ▲" : "상세보기 ▼"}
        </button>
      </div>

      {expanded && (
        <div className="card-detail-v2">
          <div className="detail-layout">
            {/* Left Content: Scrollable Area */}
            <div className="detail-left">
              {loadingDetail ? (
                <div className="loading-spinner-box">상세 데이터를 불러오는 중입니다...</div>
              ) : detail ? (
                <div className="scroll-content-area">
                  {/* 일정 섹션 */}
                  <div className="content-section">
                    <h3 className="section-title-v2">🗓 청약 일정</h3>
                    <div className="vertical-timeline">
                      <div className="timeline-entry">
                        <div className="entry-time">{formatDate(detail.timeline.announcement)}</div>
                        <div className="entry-node"></div>
                        <div className="entry-info">
                          <h4>모집공고 게시 <span className="p-badge">공고</span></h4>
                        </div>
                      </div>
                      <div className="timeline-entry">
                        <div className="entry-time">{detail.timeline.special || '-'}</div>
                        <div className="entry-node"></div>
                        <div className="entry-info">
                          <h4>특별공급 접수</h4>
                        </div>
                      </div>
                      <div className="timeline-entry active">
                        <div className="entry-time">{detail.timeline.first || '-'}</div>
                        <div className="entry-node"></div>
                        <div className="entry-info">
                          <h4>일반공급 1순위 접수</h4>
                        </div>
                      </div>
                      <div className="timeline-entry">
                        <div className="entry-time">{formatDate(detail.timeline.winner)}</div>
                        <div className="entry-node"></div>
                        <div className="entry-info">
                          <h4>당첨자 발표</h4>
                        </div>
                      </div>
                      <div className="timeline-entry last">
                        <div className="entry-time">{detail.timeline.contract}</div>
                        <div className="entry-node"></div>
                        <div className="entry-info">
                          <h4>계약 체결</h4>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 공급대상 섹션 */}
                  <div className="content-section">
                    <h3 className="section-title-v2">🏠 공급 대상 <small>(괄호는 면적)</small></h3>
                    <table className="tos-table-v2">
                      <thead>
                        <tr><th>주택형</th><th>면적</th><th>일반</th><th>특별</th><th>합계</th></tr>
                      </thead>
                      <tbody>
                        {detail.supplyList.map((s, i) => (
                          <tr key={i} className={s.isTotal ? 'total-row' : ''}>
                            <td className="bold">{s.type}</td>
                            <td>{s.area}</td>
                            <td>{s.gen}</td>
                            <td>{s.spec}</td>
                            <td className="total-val">{s.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 분양가 섹션 */}
                  <div className="content-section">
                    <h3 className="section-title-v2">💰 분양가 상세 <small>(최고가 기준, 만원)</small></h3>
                    <table className="tos-table-v2">
                      <thead>
                        <tr><th>주택형</th><th>공급금액</th></tr>
                      </thead>
                      <tbody>
                        {detail.priceList.map((p, i) => (
                          <tr key={i}>
                            <td className="bold">{p.type}</td>
                            <td className="price-val">{p.price}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : <div className="error-msg">정보를 불러올 수 없습니다.</div>}
            </div>

            {/* Right Map: Fixed or Large View */}
            <div className="detail-right">
              <div className="map-sticky-container">
                <div className="large-map-box">
                  <NaverMap 
                    key={data.PBLANC_NO}
                    address={detail?.location || data.SUBSCRPT_AREA_CODE_NM} 
                    houseName={data.HOUSE_NM} 
                    isDetailLoading={loadingDetail}
                  />
                </div>
                <div className="map-meta-info">
                  <p className="location-label">📍 {detail?.location || data.SUBSCRPT_AREA_CODE_NM}</p>
                  <div className="extra-info-grid">
                    <div className="e-item"><label>시행사</label><span>{detail?.developer || '-'}</span></div>
                    <div className="e-item"><label>시공사</label><span>{detail?.contractor || '-'}</span></div>
                  </div>
                  <button className="full-apply-btn" onClick={() => window.open('https://www.applyhome.co.kr/', '_blank')}>인터넷 청약 바로가기</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
