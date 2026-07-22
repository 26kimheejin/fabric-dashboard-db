import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const data = await sql`
      SELECT material, 
             SUM(sales_qty) as sales_qty,
             SUM(sales_amount) as sales_amount,
             SUM(return_qty) as return_qty,
             season
      FROM sales
      GROUP BY material, season
      ORDER BY sales_amount DESC
    `;
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}