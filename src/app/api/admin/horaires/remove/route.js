import { NextResponse } from 'next/server';
import pool from '@/lib/db_horaires';

export async function POST(request) {
  try {
    const body = await request.json();
    const id = body && body.id != null ? (Number.isNaN(Number(body.id)) ? null : parseInt(body.id, 10)) : null;
    if (!id) return NextResponse.json({ error: 'Id invalide ou manquant' }, { status: 400 });

    // Optionnel: vérifier existence
    const [rows] = await pool.execute('SELECT id FROM horaires WHERE id = ?', [id]);
    if (!rows || rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await pool.execute('DELETE FROM horaires WHERE id = ?', [id]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('POST /api/admin/horaires/remove error', e);
    return NextResponse.json({ error: 'Erreur serveur', debug: e && e.message ? e.message : String(e) }, { status: 500 });
  }
}

