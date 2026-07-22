import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  try {
    const { rows } = await req.json();

    // 테이블 없으면 만들기
    await sql`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        material VARCHAR(100),
        sales_qty INTEGER,
        sales_amount BIGINT,
        return_qty INTEGER,
        season VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // 기존 데이터 삭제 후 새로 넣기
    await sql`DELETE FROM sales`;

    for (const row of rows) {
      await sql`
        INSERT INTO sales (material, sales_qty, sales_amount, return_qty, season)
        VALUES (
          ${row.material || row['소재'] || '기타'},
          ${Number(row.sales_qty || row['판매수량'] || 0)},
          ${Number(row.sales_amount || row['판매금액'] || 0)},
          ${Number(row.return_qty || row['반품수량'] || 0)},
          ${row.season || row['시즌'] || '-'}
        )
      `;
    }

    return NextResponse.json({ success: true, count: rows.length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}