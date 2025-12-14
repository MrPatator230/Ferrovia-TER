import { NextResponse } from 'next/server';
import pool from '@/lib/db_horaires';

// GET - Liste de toutes les lignes
export async function GET() {
  try {
    const [lignes] = await pool.execute(`
      SELECT id, nom, code
      FROM lignes
      ORDER BY nom ASC
    `);

    return NextResponse.json({
      success: true,
      lignes
    });
  } catch (error) {
    console.error('Erreur GET lignes:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la récupération des lignes'
    }, { status: 500 });
  }
}

