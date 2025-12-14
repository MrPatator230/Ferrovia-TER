import { NextResponse } from 'next/server';
import pool from '@/lib/db_horaires';

function safeParseJSON(input, fallback) {
  if (input == null) return fallback;
  if (typeof input === 'object') return input;
  try { return JSON.parse(input); } catch (e) { return fallback; }
}

export async function PUT(request, { params }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams?.id;
    const idNum = Number.isNaN(Number(id)) ? null : parseInt(id, 10);
    if (!idNum) return NextResponse.json({ error: 'Id invalide' }, { status: 400 });

    const body = await request.json();
    const stationId = body?.station_id && !Number.isNaN(Number(body.station_id)) ? parseInt(body.station_id, 10) : null;
    const quaisInput = body?.quais; // peut être string ("3A"), CSV ("3A,4B"), ou array
    if (!stationId) return NextResponse.json({ error: 'station_id requis' }, { status: 400 });

    let quais;
    if (Array.isArray(quaisInput)) {
      quais = quaisInput.map(String).map(s => s.trim()).filter(Boolean);
    } else if (typeof quaisInput === 'string') {
      try {
        const parsed = JSON.parse(quaisInput);
        if (Array.isArray(parsed)) {
          quais = parsed.map(String).map(s => s.trim()).filter(Boolean);
        } else {
          quais = [String(quaisInput).trim()].filter(Boolean);
        }
      } catch (_e) {
        quais = String(quaisInput).split(',').map(s => s.trim()).filter(Boolean);
      }
    } else if (typeof quaisInput === 'number') {
      quais = [String(quaisInput)];
    } else {
      quais = [];
    }

    const [rows] = await pool.execute('SELECT stops FROM horaires WHERE id = ?', [idNum]);
    if (!rows || rows.length === 0) return NextResponse.json({ error: 'Horaire introuvable' }, { status: 404 });
    const currentStops = safeParseJSON(rows[0]?.stops, []);
    const stopsArr = Array.isArray(currentStops) ? currentStops : [];

    // trouver le stop concerné par station_id, sinon en créer un minimal
    let found = stopsArr.find(s => s && s.station_id === stationId);
    if (!found) {
      found = { station_id: stationId, depart_time: null, arrivee_time: null };
      stopsArr.push(found);
    }

    // injecter/mettre à jour la balise "quais"
    found.quais = quais; // stocker en tableau pour cohérence

    const updatedStopsJson = JSON.stringify(stopsArr);
    await pool.execute('UPDATE horaires SET stops = ? WHERE id = ?', [updatedStopsJson, idNum]);

    return NextResponse.json({ ok: true, id: idNum, station_id: stationId, quais });
  } catch (e) {
    console.error('PUT /api/admin/horaires/[id]/quais error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

