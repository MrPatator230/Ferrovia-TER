import { NextResponse } from 'next/server';
import pool from '@/lib/db_horaires';

// nom de la BDD principale contenant les tables partagées (stations, users...)
const MAIN_DB_NAME = process.env.DB_NAME || 'horaires';

const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
function normalizeTime(t) {
  if (!t) return null;
  if (typeof t !== 'string') return null;
  const s = t.trim();
  if (!s) return null;
  if (TIME_RE.test(s)) return s.slice(0, 5); // HH:MM
  return null;
}

function safeParseJSON(input, fallback) {
  if (input == null) return fallback;
  if (typeof input === 'object') return input;
  try { return JSON.parse(input); } catch (e) { return fallback; }
}

function parseStopsInput(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((s) => ({
    station_id: s && s.station_id != null && !Number.isNaN(Number(s.station_id)) ? parseInt(s.station_id, 10) : null,
    depart_time: normalizeTime(s && s.depart_time ? s.depart_time : null),
    arrivee_time: normalizeTime(s && s.arrivee_time ? s.arrivee_time : null),
  }));
}

function formatHoraireRow(r) {
  const row = { ...r };
  row.stops = safeParseJSON(row.stops, []);
  if (Array.isArray(row.stops)) {
    row.stops = row.stops.map((s) => ({
      ...s,
      depart_time: s && s.depart_time ? String(s.depart_time).slice(0, 5) : null,
      arrivee_time: s && s.arrivee_time ? String(s.arrivee_time).slice(0, 5) : null,
    }));
  } else {
    row.stops = [];
  }
  row.jours_circulation = safeParseJSON(row.jours_circulation, {});
  row.jours_personnalises = safeParseJSON(row.jours_personnalises, []);
  row.circulent_jours_feries = Boolean(row.circulent_jours_feries);
  row.circulent_dimanches = Boolean(row.circulent_dimanches);
  row.is_substitution = Boolean(row.is_substitution);
  row.depart_time = row.depart_time ? String(row.depart_time).slice(0, 5) : null;
  row.arrivee_time = row.arrivee_time ? String(row.arrivee_time).slice(0, 5) : null;
  return row;
}

async function fetchHoraireById(id) {
  if (!id) return null;
  const idNum = Number.isNaN(Number(id)) ? null : parseInt(id, 10);
  if (!idNum) return null;
  try {
    try {
      const [rows] = await pool.execute(
        `SELECT h.*, sd.nom as depart_station_name, sa.nom as arrivee_station_name FROM horaires h LEFT JOIN ${MAIN_DB_NAME}.stations sd ON h.depart_station_id = sd.id LEFT JOIN ${MAIN_DB_NAME}.stations sa ON h.arrivee_station_id = sa.id WHERE h.id = ?`,
        [idNum]
      );
      if (!rows || rows.length === 0) return null;
      const r = rows[0];
      return formatHoraireRow(r);
    } catch (joinErr) {
      console.warn('fetchHoraireById: JOIN failed, falling back to plain SELECT. Reason:', joinErr && joinErr.message ? joinErr.message : joinErr);
      const [rows] = await pool.execute(
        `SELECT * FROM horaires WHERE id = ?`,
        [idNum]
      );
      if (!rows || rows.length === 0) return null;
      const r = { ...rows[0], depart_station_name: null, arrivee_station_name: null };
      return formatHoraireRow(r);
    }
  } catch (e) {
    console.error('fetchHoraireById error', e);
    return null;
  }
}

export async function GET(_request, { params }) {
  try {
    const id = params?.id;
    const r = await fetchHoraireById(id);
    if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(r);
  } catch (e) {
    console.error('GET /api/admin/horaires/[id] error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams?.id;
    const idNum = Number.isNaN(Number(id)) ? null : parseInt(id, 10);
    if (!idNum) return NextResponse.json({ error: 'Id invalide' }, { status: 400 });

    const body = await request.json();

    // Fetch existing record for partial updates
    const [existingRows] = await pool.execute('SELECT * FROM horaires WHERE id = ?', [idNum]);
    if (!existingRows || existingRows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const existing = existingRows[0];

    const depart_station_id = body.depart_station_id != null ? (Number.isNaN(Number(body.depart_station_id)) ? null : parseInt(body.depart_station_id, 10)) : (existing.depart_station_id != null ? existing.depart_station_id : null);
    const arrivee_station_id = body.arrivee_station_id != null ? (Number.isNaN(Number(body.arrivee_station_id)) ? null : parseInt(body.arrivee_station_id, 10)) : (existing.arrivee_station_id != null ? existing.arrivee_station_id : null);
    const depart_time = body.depart_time != null ? normalizeTime(body.depart_time) : (existing.depart_time ? String(existing.depart_time).slice(0, 5) : null);
    const arrivee_time = body.arrivee_time != null ? normalizeTime(body.arrivee_time) : (existing.arrivee_time ? String(existing.arrivee_time).slice(0, 5) : null);
    const numero_train = body.numero_train != null ? (body.numero_train === '' ? null : String(body.numero_train)) : (existing.numero_train != null ? String(existing.numero_train) : null);
    const type_train = body.type_train != null ? (body.type_train === '' ? null : String(body.type_train)) : (existing.type_train != null ? String(existing.type_train) : null);

    const stopsArr = body.stops != null ? parseStopsInput(body.stops) : (existing.stops ? (typeof existing.stops === 'string' ? safeParseJSON(existing.stops, []) : existing.stops) : []);

    const jours_circulation_obj = body.jours_circulation != null ? (typeof body.jours_circulation === 'object' ? body.jours_circulation : safeParseJSON(body.jours_circulation, {})) : (existing.jours_circulation ? (typeof existing.jours_circulation === 'string' ? safeParseJSON(existing.jours_circulation, {}) : existing.jours_circulation) : {});
    const circulent_jours_feries = body.circulent_jours_feries != null ? (body.circulent_jours_feries ? 1 : 0) : (existing.circulent_jours_feries ? 1 : 0);
    const circulent_dimanches = body.circulent_dimanches != null ? (body.circulent_dimanches ? 1 : 0) : (existing.circulent_dimanches ? 1 : 0);
    const jours_personnalises_arr = body.jours_personnalises != null ? (Array.isArray(body.jours_personnalises) ? body.jours_personnalises : safeParseJSON(body.jours_personnalises, [])) : (existing.jours_personnalises ? (typeof existing.jours_personnalises === 'string' ? safeParseJSON(existing.jours_personnalises, []) : existing.jours_personnalises) : []);
    const materiel_id = body.materiel_id != null ? (Number.isNaN(Number(body.materiel_id)) ? null : parseInt(body.materiel_id, 10)) : (existing.materiel_id != null ? existing.materiel_id : null);
    const is_substitution = body.is_substitution != null ? (body.is_substitution ? 1 : 0) : (existing.is_substitution ? 1 : 0);
    // support ligne_id and service_annuel_id
    const ligne_id = body.ligne_id != null ? (Number.isNaN(Number(body.ligne_id)) ? null : parseInt(body.ligne_id, 10)) : (existing.ligne_id != null ? existing.ligne_id : null);
    const service_annuel_id = body.service_annuel_id != null ? (Number.isNaN(Number(body.service_annuel_id)) ? null : parseInt(body.service_annuel_id, 10)) : (existing.service_annuel_id != null ? existing.service_annuel_id : null);

    // validation
    const missing = {};
    if (!depart_station_id) missing.depart_station_id = 'missing_or_invalid';
    if (!arrivee_station_id) missing.arrivee_station_id = 'missing_or_invalid';
    if (!depart_time) missing.depart_time = 'missing_or_invalid_time_format';
    if (!arrivee_time) missing.arrivee_time = 'missing_or_invalid_time_format';

    stopsArr.forEach((s, idx) => {
      if (!s.station_id) missing[`stops[${idx}].station_id`] = 'missing_or_invalid';
      if (!s.depart_time) missing[`stops[${idx}].depart_time`] = 'missing_or_invalid_time_format';
      if (!s.arrivee_time) missing[`stops[${idx}].arrivee_time`] = 'missing_or_invalid_time_format';
    });

    if (Object.keys(missing).length > 0) {
      return NextResponse.json({ error: 'Champs requis manquants ou invalides', missing }, { status: 400 });
    }

    const stopsJson = JSON.stringify(stopsArr);
    const joursCirculationJson = JSON.stringify(jours_circulation_obj);
    const joursPersonnalisesJson = JSON.stringify(jours_personnalises_arr);

    const sqlParams = [
      depart_station_id,
      arrivee_station_id,
      depart_time,
      arrivee_time,
      numero_train,
      type_train,
      stopsJson,
      joursCirculationJson,
      circulent_jours_feries,
      circulent_dimanches,
      joursPersonnalisesJson,
      materiel_id,
      ligne_id,
      service_annuel_id,
      is_substitution,
      idNum,
    ].map((p) => (typeof p === 'undefined' ? null : p));

    // include ligne_id and service_annuel_id (if DB supports) - try to run extended update
    let sql = `UPDATE horaires SET depart_station_id = ?, arrivee_station_id = ?, depart_time = ?, arrivee_time = ?, numero_train = ?, type_train = ?, stops = ?, jours_circulation = ?, circulent_jours_feries = ?, circulent_dimanches = ?, jours_personnalises = ?, materiel_id = ?, is_substitution = ? WHERE id = ?`;
    try {
      sql = `UPDATE horaires SET depart_station_id = ?, arrivee_station_id = ?, depart_time = ?, arrivee_time = ?, numero_train = ?, type_train = ?, stops = ?, jours_circulation = ?, circulent_jours_feries = ?, circulent_dimanches = ?, jours_personnalises = ?, materiel_id = ?, ligne_id = ?, service_annuel_id = ?, is_substitution = ? WHERE id = ?`;
    } catch (e) { /* noop */ }

    await pool.execute(sql, sqlParams);

    const updated = await fetchHoraireById(idNum);
    if (!updated) return NextResponse.json({ error: 'Mis à jour réussie mais lecture impossible' }, { status: 500 });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('PUT /api/admin/horaires/[id] error', e);
    return NextResponse.json({ error: 'Erreur serveur', debug: e && e.message ? e.message : String(e) }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams?.id;
    const idNum = Number.isNaN(Number(id)) ? null : parseInt(id, 10);
    if (!idNum) return NextResponse.json({ error: 'Id invalide' }, { status: 400 });
    await pool.execute('DELETE FROM horaires WHERE id = ?', [idNum]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/admin/horaires/[id] error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
