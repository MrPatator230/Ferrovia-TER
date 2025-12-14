import { NextResponse } from 'next/server';
import pool from '@/lib/db_horaires';

// GET - Liste de tous les services annuels
export async function GET() {
  try {
    const [services] = await pool.execute(`
      SELECT * FROM services_annuels
      ORDER BY date_debut DESC
    `);

    return NextResponse.json({
      success: true,
      services
    });
  } catch (error) {
    console.error('Erreur GET services annuels:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la récupération des services annuels'
    }, { status: 500 });
  }
}

