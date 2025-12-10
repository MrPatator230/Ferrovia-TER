import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: 'horaires',
  charset: 'utf8mb4'
};

async function getConnection() {
  return await mysql.createConnection(dbConfig);
}

// GET - Liste de tous les services annuels
export async function GET() {
  let connection;
  try {
    connection = await getConnection();

    const [services] = await connection.execute(`
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
  } finally {
    if (connection) await connection.end();
  }
}

