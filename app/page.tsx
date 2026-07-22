'use client';
import { useEffect, useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#6366f1','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];

export default function Home() {
  const [data, setData] = useState<any[]>([]);
  const [filter, setFilter] = useState('전체');
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchData = async () => {
    const res = await fetch('/api/sales');
    const json = await res.json();
    if (Array.isArray(json)) setData(json);
  };

  useEffect(() => { fetchData(); }, []);

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);
    setUploading(true);
    setMsg('업로드 중...');
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    });
    const json = await res.json();
    if (json.success) {
      setMsg(`✅ ${json.count}개 데이터 저장 완료!`);
      fetchData();
    } else {
      setMsg('❌ 오류: ' + json.error);
    }
    setUploading(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'text/csv': ['.csv'] } });

  const seasons = ['전체', ...Array.from(new Set(data.map((d: any) => d.season)))];
  const filtered = filter === '전체' ? data : data.filter((d: any) => d.season === filter);

  const totalAmt = filtered.reduce((s: number, d: any) => s + Number(d.sales_amount), 0);
  const totalQty = filtered.reduce((s: number, d: any) => s + Number(d.sales_qty), 0);
  const totalReturn = filtered.reduce((s: number, d: any) => s + Number(d.return_qty), 0);
  const returnRate = totalQty ? ((totalReturn / totalQty) * 100).toFixed(1) : '0.0';

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>🧵 소재별 판매 대시보드</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>Neon DB 연동 · 실시간 데이터</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {seasons.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: filter === s ? '#6366f1' : '#334155', color: filter === s ? '#fff' : '#94a3b8' }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>
        {/* 업로드 */}
        <div {...getRootProps()} style={{ border: `2px dashed ${isDragActive ? '#6366f1' : '#334155'}`, borderRadius: 12, padding: 20, textAlign: 'center', cursor: 'pointer', background: isDragActive ? '#1e1b4b' : '#1e293b', marginBottom: 28 }}>
          <input {...getInputProps()} />
          <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>
            {uploading ? '업로드 중...' : msg || '📂 엑셀(xlsx) 또는 CSV 파일을 여기 드래그하거나 클릭해서 업로드 (관리자용)'}
          </p>
        </div>

        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: '총 판매금액', value: `₩${(totalAmt/1000000).toFixed(1)}M` },
            { label: '총 판매수량', value: `${totalQty.toLocaleString()}개` },
            { label: '반품수량', value: `${totalReturn.toLocaleString()}개` },
            { label: '반품률', value: `${returnRate}%` },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: '#1e293b', borderRadius: 12, padding: '20px 24px', border: '1px solid #334155' }}>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>{label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* 차트 */}
        {filtered.length > 0 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, border: '1px solid #334155' }}>
                <h3 style={{ margin: '0 0 16px', color: '#f1f5f9', fontSize: 15 }}>소재별 판매금액</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={filtered}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="material" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tickFormatter={v => `${(v/1000000).toFixed(0)}M`} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => `₩${Number(v).toLocaleString()}`} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
                    <Bar dataKey="sales_amount" radius={[4,4,0,0]}>
                      {filtered.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, border: '1px solid #334155' }}>
                <h3 style={{ margin: '0 0 16px', color: '#f1f5f9', fontSize: 15 }}>소재별 매출 점유율</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={filtered} dataKey="sales_amount" nameKey="material" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }: any) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                      {filtered.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => `₩${Number(v).toLocaleString()}`} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 테이블 */}
            <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, border: '1px solid #334155' }}>
              <h3 style={{ margin: '0 0 16px', color: '#f1f5f9', fontSize: 15 }}>소재별 상세 데이터</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    {['소재','시즌','판매금액','판매수량','반품수량','반품률'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#94a3b8' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row: any, i: number) => {
                    const rr = row.sales_qty ? ((row.return_qty / row.sales_qty)*100).toFixed(1) : '0.0';
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #1e293b', background: i%2 ? '#0f172a' : 'transparent' }}>
                        <td style={{ padding: '10px 12px', color: COLORS[i%COLORS.length], fontWeight: 600 }}>● {row.material}</td>
                        <td style={{ padding: '10px 12px' }}>{row.season}</td>
                        <td style={{ padding: '10px 12px' }}>₩{Number(row.sales_amount).toLocaleString()}</td>
                        <td style={{ padding: '10px 12px' }}>{Number(row.sales_qty).toLocaleString()}</td>
                        <td style={{ padding: '10px 12px' }}>{Number(row.return_qty).toLocaleString()}</td>
                        <td style={{ padding: '10px 12px', color: Number(rr)>5 ? '#ef4444' : '#10b981' }}>{rr}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
            <p style={{ fontSize: 18 }}>📂 위에서 엑셀 파일을 업로드하면 차트가 나타나요!</p>
          </div>
        )}
      </div>
    </div>
  );}
