'use client';
import { useEffect, useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#1e6ad4','#2e9e5e','#e67e22','#8e44ad','#c0392b','#16a085','#d35400','#2980b9'];

export default function Home() {
  const [data, setData] = useState<any[]>([]);
  const [axis, setAxis] = useState<'item'|'vendor'|'blend'|'br'>('item');
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const [topN, setTopN] = useState(30);

  const fetchData = async () => {
    const res = await fetch('/api/sales');
    const json = await res.json();
    if (Array.isArray(json)) setData(json);
  };

  useEffect(() => { fetchData(); }, []);

  const onDrop = useCallback(async (files: File[]) => {
    if (files.length < 2) { setMsg('❌ 파일 2개를 동시에 올려주세요!'); return; }
    setUploading(true);
    setMsg('파일 읽는 중...');

    let biRows: any[] = [], lgRows: any[] = [];

    for (const file of files) {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      if (wb.SheetNames.includes('스타일별판매재고')) {
        const ws = wb.Sheets['스타일별판매재고'];
        biRows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true }) as any[];
      } else {
        const yearSheet = wb.SheetNames.find(s => /^20\d\d$/.test(s));
        if (yearSheet) {
          lgRows = XLSX.utils.sheet_to_json(wb.Sheets[yearSheet], { header: 1, raw: true }) as any[];
        }
      }
    }

    if (!biRows.length) { setMsg('❌ BI 파일을 찾지 못했습니다.'); setUploading(false); return; }
    if (!lgRows.length) { setMsg('❌ 발주장부를 찾지 못했습니다.'); setUploading(false); return; }

    setMsg('서버에서 분석 중...');
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ biRows, lgRows }),
    });
    const json = await res.json();
    if (json.success) {
      setMsg(`✅ 분석 완료! ${json.inserted}건 저장됨`);
      fetchData();
    } else {
      setMsg('❌ 오류: ' + json.error);
    }
    setUploading(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: true });

  // 집계
  const axisKey = axis === 'item' ? 'fabric' : axis === 'vendor' ? 'vendor' : axis === 'blend' ? 'blend' : 'br';
  const aggMap: Record<string, number> = {};
  data.forEach((r: any) => {
    const k = r[axisKey] || '(미입력)';
    aggMap[k] = (aggMap[k] || 0) + Number(r.qty);
  });
  const aggData = Object.entries(aggMap)
    .map(([key, qty]) => ({ key, qty: Math.round(qty) }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, topN);

  const totalQty = aggData.reduce((s, x) => s + x.qty, 0);

  const AXIS_LABEL: Record<string, string> = {
    item: '소재 Item NO.별', vendor: '원단업체별', blend: '혼용률별', br: '브랜드별'
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6fa', fontFamily: 'Malgun Gothic, sans-serif' }}>
      {/* 헤더 */}
      <div style={{ background: '#1e3a5f', color: '#fff', padding: '18px 28px' }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>소재별 판매수량 대시보드</h1>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#b8c7d9' }}>Neon DB 연동 · 관리자가 업로드하면 누구나 볼 수 있습니다</p>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
        {/* 업로드 */}
        <div style={{ background: '#fff', borderRadius: 10, padding: 20, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
          <div {...getRootProps()} style={{ border: `2px dashed ${isDragActive ? '#1e6ad4' : '#9db4cc'}`, borderRadius: 10, padding: 34, textAlign: 'center', cursor: 'pointer', background: isDragActive ? '#e8f0fa' : '#fff' }}>
            <input {...getInputProps()} />
            <b style={{ color: '#1e3a5f' }}>여기에 파일 2개를 동시에 끌어다 놓거나 클릭해서 선택하세요</b><br />
            <span style={{ fontSize: 13, color: '#567' }}>① BI 다운로드 파일 (스타일별판매재고_*.xlsx) &nbsp;&nbsp;② 발주장부 (★발주장부통합★_*.xlsx)</span>
            {msg && <p style={{ marginTop: 12, fontWeight: 600, color: msg.startsWith('❌') ? '#c33' : '#157347' }}>{msg}</p>}
          </div>
        </div>

        {/* 탭 */}
        {data.length > 0 && (
          <>
            <div style={{ background: '#fff', borderRadius: 10, padding: 20, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                {(['item','vendor','blend','br'] as const).map(a => (
                  <button key={a} onClick={() => setAxis(a)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #cdd8e4', cursor: 'pointer', fontWeight: axis === a ? 700 : 400, background: axis === a ? '#1e3a5f' : '#fff', color: axis === a ? '#fff' : '#333' }}>
                    {AXIS_LABEL[a]}
                  </button>
                ))}
                <select value={topN} onChange={e => setTopN(Number(e.target.value))} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cdd8e4', marginLeft: 'auto' }}>
                  <option value={20}>상위 20개</option>
                  <option value={30}>상위 30개</option>
                  <option value={50}>상위 50개</option>
                </select>
              </div>

              <h2 style={{ fontSize: 15, color: '#1e3a5f', marginBottom: 12 }}>{AXIS_LABEL[axis]} 누적 발주수량 순위</h2>
              <ResponsiveContainer width="100%" height={Math.max(200, aggData.length * 28 + 60)}>
                <BarChart data={aggData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={v => v.toLocaleString()} />
                  <YAxis type="category" dataKey="key" width={160} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: any) => v.toLocaleString() + ' M'} />
                  <Bar dataKey="qty" radius={[0,4,4,0]}>
                    {aggData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 테이블 */}
            <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#eef2f7' }}>
                    <th style={{ padding: 8, textAlign: 'left', borderBottom: '2px solid #d5dfe9' }}>#</th>
                    <th style={{ padding: 8, textAlign: 'left', borderBottom: '2px solid #d5dfe9' }}>{AXIS_LABEL[axis].replace('별','')}</th>
                    <th style={{ padding: 8, textAlign: 'right', borderBottom: '2px solid #d5dfe9' }}>수량(M)</th>
                    <th style={{ padding: 8, textAlign: 'right', borderBottom: '2px solid #d5dfe9' }}>비중</th>
                  </tr>
                </thead>
                <tbody>
                  {aggData.map((x, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #eef0f4', background: i%2 ? '#f8fafc' : '#fff' }}>
                      <td style={{ padding: '7px 8px' }}>{i+1}</td>
                      <td style={{ padding: '7px 8px', color: COLORS[i % COLORS.length], fontWeight: 600 }}>{x.key}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'right' }}><b>{x.qty.toLocaleString()}</b></td>
                      <td style={{ padding: '7px 8px', textAlign: 'right' }}>{totalQty ? (x.qty/totalQty*100).toFixed(1) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {data.length === 0 && !uploading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#789' }}>
            <p style={{ fontSize: 16 }}>📂 위에서 파일 2개를 동시에 업로드하면 차트가 나타나요!</p>
          </div>
        )}
      </div>
    </div>
  );
}