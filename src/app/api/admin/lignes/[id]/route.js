import { NextResponse } from 'next/server';
import pool from '@/lib/db_horaires';

function safeParseJSON(x, fallback) {
  if (x == null) return fallback;
  if (typeof x === 'object') return x;
  try { return JSON.parse(x); } catch(e) { return fallback; }
}

export async function GET(_req, { params }) {
  try {
    const resolvedParams = params && typeof params.then === 'function' ? await params : params;
    const id = resolvedParams?.id;
    const idNum = Number.isNaN(Number(id)) ? null : parseInt(id,10);
    if (!idNum) return NextResponse.json({ error: 'Id invalide' }, { status: 400 });
    const [rows] = await pool.execute('SELECT * FROM lignes WHERE id = ?', [idNum]);
    if (!rows || rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const r = rows[0];
    r.stops = safeParseJSON(r.stops, []);
    r.communications = safeParseJSON(r.communications, null);
    return NextResponse.json(r);
  } catch (e) {
    console.error('GET /api/admin/lignes/[id] error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const resolvedParams = params && typeof params.then === 'function' ? await params : params;
    const id = resolvedParams?.id;
    const idNum = Number.isNaN(Number(id)) ? null : parseInt(id,10);
    if (!idNum) return NextResponse.json({ error: 'Id invalide' }, { status: 400 });
    const body = await request.json();
    const nom = body.nom != null ? (String(body.nom).trim() || null) : null;
    const code = body.code != null ? (String(body.code).trim() || null) : null;
    const stops = body.stops != null ? (Array.isArray(body.stops) ? body.stops : safeParseJSON(body.stops, [])) : null;
    const communications = body.communications != null ? (typeof body.communications === 'string' ? safeParseJSON(body.communications, null) : body.communications) : null;

    // read existing
    const [existingRows] = await pool.execute('SELECT * FROM lignes WHERE id = ?', [idNum]);
    if (!existingRows || existingRows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const existing = existingRows[0];

    const finalNom = nom !== null ? nom : existing.nom;
    if (!finalNom) return NextResponse.json({ error: 'Nom requis' }, { status: 400 });

    const finalCode = code !== null ? code : existing.code;
    const finalStops = stops !== null ? JSON.stringify(stops) : existing.stops;
    const finalComms = communications !== null ? JSON.stringify(communications) : existing.communications;

    await pool.execute('UPDATE lignes SET nom = ?, code = ?, stops = ?, communications = ? WHERE id = ?', [finalNom, finalCode, finalStops, finalComms, idNum]);
    const [rows] = await pool.execute('SELECT * FROM lignes WHERE id = ?', [idNum]);
    const r = rows && rows[0] ? rows[0] : null;
    if (r) {
      r.stops = safeParseJSON(r.stops, []);
      r.communications = safeParseJSON(r.communications, null);
    }
    return NextResponse.json(r);
  } catch (e) {
    console.error('PUT /api/admin/lignes/[id] error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const resolvedParams = params && typeof params.then === 'function' ? await params : params;
    const id = resolvedParams?.id;
    const idNum = Number.isNaN(Number(id)) ? null : parseInt(id,10);
    if (!idNum) return NextResponse.json({ error: 'Id invalide' }, { status: 400 });
    await pool.execute('DELETE FROM lignes WHERE id = ?', [idNum]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/admin/lignes/[id] error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
