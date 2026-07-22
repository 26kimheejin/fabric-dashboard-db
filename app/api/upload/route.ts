import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);
const norm = (v: any) => String(v == null ? "" : v).replace(/[\s\n\r]/g, "");
const toNum = (v: any) => {
  if (typeof v === "number") return v;
  if (v == null) return 0;
  const n = parseFloat(String(v).replace(/[,\s]/g, ""));
  return isNaN(n) ? 0 : n;
};

export async function POST(req: NextRequest) {
  try {
    const { biRows, lgRows } = await req.json();
    await sql`DROP TABLE IF EXISTS analysis_result`;
    await sql`CREATE TABLE analysis_result (
      id SERIAL PRIMARY KEY,
      style_code VARCHAR(50), style_name TEXT, season VARCHAR(50),
      rate DECIMAL(10,2), sales_qty INTEGER,
      axis_key VARCHAR(200), axis_type VARCHAR(20), qty DECIMAL(10,2),
      vendor VARCHAR(100), blend VARCHAR(100), fabric VARCHAR(100),
      br VARCHAR(10), color VARCHAR(100), part VARCHAR(50)
    )`;

    const biStyles: any[] = [];
    let styleCol = -1, yearCol = -1, seasonCol = -1, rateCol = -1, salesCol = -1, headerRow = -1;
    for (let i = 0; i < Math.min(biRows.length, 10); i++) {
      const r = biRows[i]; if (!r) continue;
      r.forEach((c: any, j: number) => {
        const t = norm(c);
        if (t.includes("스타일코드")) { styleCol = j; headerRow = i; }
        if (t.includes("계절연도")) yearCol = j;
        else if (t.startsWith("계절(")) seasonCol = j;
        if (t.includes("누적입고대비정판율")) rateCol = j;
        if (t === "누적판매량") salesCol = j;
      });
    }
    for (let i = headerRow + 1; i < biRows.length; i++) {
      const r = biRows[i]; if (!r) continue;
      const code = String(r[styleCol] || "").trim();
      const name = String(r[styleCol + 1] || "").trim();
      if (!code || code.includes("결과") || !name) continue;
      let rate = r[rateCol];
      if (typeof rate === "string") rate = parseFloat(rate.replace(/[%,\s]/g, ""));
      if (rate == null || isNaN(rate)) continue;
      biStyles.push({ code, name, season: String(r[yearCol] || "") + " " + String(r[seasonCol + 1] || r[seasonCol] || ""), rate, salesQty: salesCol >= 0 ? toNum(r[salesCol]) : 0 });
    }
    const maxRate = Math.max(...biStyles.map((s: any) => s.rate));
    if (maxRate <= 5) biStyles.forEach((s: any) => s.rate =