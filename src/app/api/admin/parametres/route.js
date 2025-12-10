import pool from '../../../../../src/lib/db';

export async function GET() {
  try {
    const [rows] = await pool.query('SELECT id, cle, valeur_json, updated_at FROM parametres ORDER BY id DESC LIMIT 1');
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({}), { status: 200 });
    }
    const row = rows[0];
    const json = row.valeur_json ? JSON.parse(row.valeur_json) : {};
    return new Response(JSON.stringify(json), { status: 200 });
  } catch (err) {
    console.error('GET /api/admin/parametres error', err);
    return new Response(JSON.stringify({ error: 'DB error' }), { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const text = JSON.stringify(body);
    // upsert simple: insert new row
    const [res] = await pool.query('INSERT INTO parametres (cle, valeur_json) VALUES (?, ?) ', ['global', text]);
    return new Response(JSON.stringify({ ok: true, id: res.insertId }), { status: 200 });
  } catch (err) {
    console.error('POST /api/admin/parametres error', err);
    return new Response(JSON.stringify({ error: 'DB error' }), { status: 500 });
  }
}

