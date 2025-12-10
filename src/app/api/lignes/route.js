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

// GET - Liste de toutes les lignes
export async function GET() {
  let connection;
  try {
    connection = await getConnection();

    const [lignes] = await connection.execute(`
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
  } finally {
    if (connection) await connection.end();
  }
}

