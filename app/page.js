"use client";

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
      if (typeof window === 'undefined') return null;
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to load settings:", e);
      return null;
    }
  };

  const [aptChecked, setAptChecked] = React.useState(true);
  const [aptSubTypes, setAptSubTypes] = React.useState({
    special: true, first: true, second: true, none: true, arbitrary: true, illegal: true
  });
  const [otherSupplies, setOtherSupplies] = React.useState({
    officetel: true,
    publicRental: true
  });
  const [seoulChecked, setSeoulChecked] = React.useState(true);
  const [metroChecked, setMetroChecked] = React.useState(true);
  const [metroSubTypes, setMetroSubTypes] = React.useState({
    광주: true, 대구: true, 대전: true, 부산: true, 세종: true, 울산: true, 인천: true
  });
  const [provinceChecked, setProvinceChecked] = React.useState(true);
  const [provinceSubTypes, setProvinceSubTypes] = React.useState({
    강원: true, 경기: true, 경남: true, 경북: true, 전남: true, 전북: true, 제주: true, 충남: true, 충북: true
  });

  // 하이드레이션 이후 로컬스토리지 값 적용
  React.useEffect(() => {
    const saved = getSavedSettings();
    if (saved) {
      if (saved.aptChecked !== undefined) setAptChecked(saved.aptChecked);
      if (saved.aptSubTypes !== undefined) setAptSubTypes(saved.aptSubTypes);
      if (saved.otherSupplies !== undefined) setOtherSupplies(saved.otherSupplies);
      if (saved.seoulChecked !== undefined) setSeoulChecked(saved.seoulChecked);
      if (saved.metroChecked !== undefined) setMetroChecked(saved.metroChecked);
      if (saved.metroSubTypes !== undefined) setMetroSubTypes(saved.metroSubTypes);
      if (saved.provinceChecked !== undefined) setProvinceChecked(saved.provinceChecked);
      if (saved.provinceSubTypes !== undefined) setProvinceSubTypes(saved.provinceSubTypes);
    }
  }, []);

  // 설정이 변경될 때마다 로컬스토리지에 저장
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
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

  // 데이터 가져오기 (Next.js API Route 이용)
  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const targetMonth = `${year}${String(selectedMonth).padStart(2, '0')}`;
      
      const apiUrl = "/api/subscrpt";

      const response = await fetch(apiUrl, {
        "headers": {
          "content-type": "application/json",
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
      
      if (result && result.schdulList) {
        setFullData(result.schdulList);
      } else {
        setFullData([]);
      }
    } catch (error) {
      console.error("데이터 조회 실패:", error);
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

      if (aptChecked) {
        const typeMap = {
          special: "01",
          first: "02",
          second: "03",
          none: "06",
          arbitrary: "11",
          illegal: "04"
        };
        
        Object.entries(typeMap).forEach(([key, code]) => {
          if (aptSubTypes[key] && item.RCEPT_SE === code) typeMatch = true;
        });
      }

      if (otherSupplies.officetel && (item.HOUSE_SECD === "02" || item.HOUSE_SECD === "03")) typeMatch = true;
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
      {/* 1. 최상단 헤더 (앱명 + 연도 선택기 + 설정) */}
      <header className="top-header">
        <div className="header-left">
          <div className="brand-logo">
             <span className="logo-icon">
               <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-house"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
             </span>
             <span className="logo-text">HousingLink</span>
          </div>
        </div>

        <div className="year-selector">
          <button className="year-nav-btn" onClick={() => setYear(year - 1)}>‹</button>
          <span className="current-year">{year}</span>
          <button className="year-nav-btn" onClick={() => setYear(year + 1)}>›</button>
        </div>

        <div className="header-actions">
          <span className="settings-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg>
          </span>
        </div>
      </header>

      {/* 2. 월 선택 바 */}
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
               <div className="filter-option parent">
                 <label>
                   <input type="checkbox" checked={seoulChecked} onChange={(e) => setSeoulChecked(e.target.checked)} /> 
                   <span>서울</span>
                 </label>
               </div>

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
          <div className="results-header">
             <div className="found-count">
               {loading ? "데이터를 불러오는 중..." : (
                 <>총 <strong>{filteredData.length}개</strong>의 청약 정보가 있습니다.</>
               )}
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
  const lastCallRef = React.useRef('');
  const [status, setStatus] = React.useState('loading');

  React.useEffect(() => {
    if (isDetailLoading || !address || !address.includes(' ') || lastCallRef.current === address) {
      return;
    }
    
    lastCallRef.current = address;

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

      const cleanAddress = address.replace(/\(.*?\)/g, '').split(',')[0].trim();
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
    // 이미 '.', '-', '~' 등이 포함된 경우 (이미 포맷팅된 날짜나 범위 날짜)
    if (dateStr.includes('.') || dateStr.includes('-') || dateStr.includes('~')) {
      return dateStr.replace(/\s+/g, ' ').trim();
    }
    // 숫자 8자리(YYYYMMDD)인 경우에만 포맷팅 적용
    if (/^\d{8}$/.test(dateStr)) {
      return `${dateStr.slice(0, 4)}.${dateStr.slice(4, 6)}.${dateStr.slice(6, 8)}`;
    }
    return dateStr;
  };

  const renderDate = (dateStr) => {
    const formatted = formatDate(dateStr);
    if (formatted.includes('~')) {
      const parts = formatted.split('~');
      return (
        <div className="date-range-vertical">
          <div className="date-part">{parts[0].trim()}</div>
          <div className="date-sep">~</div>
          <div className="date-part">{parts[1].trim()}</div>
        </div>
      );
    }
    return formatted;
  };

  const getDayName = (dayCode) => {
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    return days[parseInt(dayCode)] || '화';
  };

  const formatSupplyPrice = (priceStr) => {
    if (!priceStr) return '';
    // 숫자가 아닌 문자 제거 (콤마 등)
    const priceNum = parseInt(priceStr.toString().replace(/[^0-9]/g, ''), 10);
    if (isNaN(priceNum)) return priceStr;

    const uk = Math.floor(priceNum / 10000);
    const man = priceNum % 10000;

    if (uk > 0) {
      return (
        <>
          <span style={{ fontWeight: '700', color: '#ff6b01' }}>{uk}</span>
          <span style={{ fontSize: '12px', marginLeft: '1px', marginRight: '4px', color: '#4e5968' }}>억</span>
          {man > 0 && (
            <>
              <span>{man.toLocaleString()}</span>
              <span style={{ fontSize: '11px', marginLeft: '1px', color: '#8b95a1' }}>만원</span>
            </>
          )}
        </>
      );
    }
    return (
      <>
        <span>{man.toLocaleString()}</span>
        <span style={{ fontSize: '11px', marginLeft: '1px', color: '#8b95a1' }}>만원</span>
      </>
    );
  };

  const fetchingRef = React.useRef(false);

  React.useEffect(() => {
    if (!expanded || detail || fetchingRef.current) return;

    const loadData = async () => {
      fetchingRef.current = true;
      setLoadingDetail(true);
      try {
        const apiUrl = "/api/detail";

        const formData = new FormData();
        formData.append('houseManageNo', data.HOUSE_MANAGE_NO);
        formData.append('pblancNo', data.PBLANC_NO);
        formData.append('houseSecd', data.HOUSE_SECD);
        formData.append('gvPgmId', "AIB01M01");

        const response = await fetch(apiUrl, {
          method: "POST",
          body: formData
        });

        if (!response.ok) throw new Error("상세 정보 로드 실패");
        
        const result = await response.json();
        setDetail(result);
      } catch (error) {
        console.error("데이터 로드 실패:", error);
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
          <div className="house-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3182f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-building-2"><path d="M10 12h4"/><path d="M10 8h4"/><path d="M14 21v-3a2 2 0 0 0-4 0v3"/><path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"/><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/></svg>
          </div>
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
        <div className="card-detail-v3">
          {loadingDetail ? (
            <div className="loading-spinner-box">상세 데이터를 불러오는 중입니다...</div>
          ) : detail ? (
            <div className="detail-container">
              {/* 1단: 상단 요약 바 */}
              <div className="detail-summary-bar">
                <div className="summary-item">
                  <span className="label">공급규모</span>
                  <span className="value">{detail.scale}</span>
                </div>
                <div className="summary-divider"></div>
                <div className="summary-item">
                  <span className="label">시행사</span>
                  <span className="value">{detail.developer}</span>
                </div>
                <div className="summary-divider"></div>
                <div className="summary-item">
                  <span className="label">시공사</span>
                  <span className="value">{detail.contractor}</span>
                </div>
              </div>

              {/* 2단: 일정 및 지도 병렬 배치 */}
              <div className="detail-mid-section">
                <div className="schedule-column">
                  <div className="vertical-timeline mini">
                    <div className="timeline-entry">
                      <div className="entry-time">{renderDate(detail.timeline.announcement)}</div>
                      <div className="entry-node"></div>
                      <div className="entry-info"><h4>모집공고</h4></div>
                    </div>
                    <div className="timeline-entry">
                      <div className="entry-time">{renderDate(detail.timeline.special)}</div>
                      <div className="entry-node"></div>
                      <div className="entry-info"><h4>특별공급</h4></div>
                    </div>
                    <div className="timeline-entry active">
                      <div className="entry-time">{renderDate(detail.timeline.first)}</div>
                      <div className="entry-node"></div>
                      <div className="entry-info"><h4>일반1순위</h4></div>
                    </div>
                    <div className="timeline-entry">
                      <div className="entry-time">{renderDate(detail.timeline.winner)}</div>
                      <div className="entry-node"></div>
                      <div className="entry-info"><h4>당첨발표</h4></div>
                    </div>
                    <div className="timeline-entry last">
                      <div className="entry-time">{renderDate(detail.timeline.contract)}</div>
                      <div className="entry-node"></div>
                      <div className="entry-info"><h4>계약체결</h4></div>
                    </div>
                  </div>
                </div>
                
                <div className="map-column">
                  <div className="compact-map-box">
                    <NaverMap 
                      address={detail.location} 
                      houseName={detail.houseNm}
                      isDetailLoading={loadingDetail}
                      zoom={14}
                    />
                  </div>
                </div>
              </div>

              {/* 3단: 하단 공급 정보 표 */}
              <div className="detail-bottom-section">
                <table className="tos-table-v3">
                  <thead>
                    <tr>
                      <th>주택형</th>
                      <th>면적</th>
                      <th>일반</th>
                      <th>특별</th>
                      <th>합계</th>
                      <th className="txt-right">공급금액(최고가)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.combinedList && detail.combinedList.map((s, i) => (
                      <tr key={i}>
                        <td className="bold">{s.type}</td>
                        <td>{s.area}</td>
                        <td>{s.gen}</td>
                        <td>{s.spec}</td>
                        <td className="total-val">{s.total}</td>
                        <td className="price-val txt-right">{formatSupplyPrice(s.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default App;
