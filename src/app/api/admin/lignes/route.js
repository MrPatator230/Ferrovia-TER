import { NextResponse } from 'next/server';
import pool from '@/lib/db_horaires';

// GET - liste des lignes (limitées)
export async function GET() {
  try {
    const [rows] = await pool.execute('SELECT * FROM lignes ORDER BY nom ASC LIMIT 1000');
    const data = Array.isArray(rows) ? rows.map(r => ({
      ...r,
      stops: typeof r.stops === 'string' ? JSON.parse(r.stops) : r.stops,
      communications: typeof r.communications === 'string' ? JSON.parse(r.communications) : r.communications,
    })) : [];
    return NextResponse.json(data);
  } catch (e) {
    console.error('GET /api/admin/lignes error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - créer une ligne
export async function POST(request) {
  try {
    const body = await request.json();
    const nom = body.nom ? String(body.nom).trim() : null;
    const code = body.code ? String(body.code).trim() : null;
    const stops = Array.isArray(body.stops) ? body.stops : (body.stops ? JSON.parse(body.stops) : []);
    const communications = body.communications ? (typeof body.communications === 'string' ? JSON.parse(body.communications) : body.communications) : null;

    if (!nom) return NextResponse.json({ error: 'Nom requis' }, { status: 400 });

    const [result] = await pool.execute('INSERT INTO lignes (nom, code, stops, communications) VALUES (?, ?, ?, ?)', [nom, code, JSON.stringify(stops), communications ? JSON.stringify(communications) : null]);
    const [rows] = await pool.execute('SELECT * FROM lignes WHERE id = ?', [result.insertId]);
    const row = rows && rows[0] ? rows[0] : null;
    if (row) {
      row.stops = typeof row.stops === 'string' ? JSON.parse(row.stops) : row.stops;
      row.communications = typeof row.communications === 'string' ? JSON.parse(row.communications) : row.communications;
    }
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    console.error('POST /api/admin/lignes error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

