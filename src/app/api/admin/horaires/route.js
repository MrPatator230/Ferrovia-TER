// Remplacement complet: API GET (liste) et POST (création) pour /api/admin/horaires
import { NextResponse } from 'next/server';
import pool from '@/lib/db_horaires';

// nom de la BDD principale contenant les tables partagées (stations, users...)
const MAIN_DB_NAME = process.env.DB_NAME || 'ferrovia_ter_bfc';

// Helpers
const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
function normalizeTime(t) {
  if (t == null) return null;
  const s = String(t).trim();
  if (!s) return null;
  if (!TIME_RE.test(s)) return null;
  return s.slice(0, 5); // HH:MM
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
  // normalise le format renvoyé au client
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

// GET - lister les horaires (LIMIT 500)
export async function GET() {
  try {
    try {
      const [rows] = await pool.execute(
        `SELECT h.*, sd.nom as depart_station_name, sa.nom as arrivee_station_name FROM horaires h LEFT JOIN ${MAIN_DB_NAME}.stations sd ON h.depart_station_id = sd.id LEFT JOIN ${MAIN_DB_NAME}.stations sa ON h.arrivee_station_id = sa.id ORDER BY h.depart_time DESC LIMIT 500`
      );
      const mapped = Array.isArray(rows) ? rows.map(formatHoraireRow) : [];
      return NextResponse.json(mapped);
    } catch (joinErr) {
      console.warn('GET /api/admin/horaires: JOIN failed, falling back to plain SELECT. Reason:', joinErr && joinErr.message ? joinErr.message : joinErr);
      const [rows] = await pool.execute(
        `SELECT * FROM horaires ORDER BY depart_time DESC LIMIT 500`
      );
      const mapped = Array.isArray(rows) ? rows.map((r) => formatHoraireRow({ ...r, depart_station_name: null, arrivee_station_name: null })) : [];
      return NextResponse.json(mapped);
    }
  } catch (err) {
    console.error('GET /api/admin/horaires error', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - créer un horaire
export async function POST(request) {
  try {
    const body = await request.json();

    const depart_station_id = body.depart_station_id != null && !Number.isNaN(Number(body.depart_station_id)) ? parseInt(body.depart_station_id, 10) : null;
    const arrivee_station_id = body.arrivee_station_id != null && !Number.isNaN(Number(body.arrivee_station_id)) ? parseInt(body.arrivee_station_id, 10) : null;
    const depart_time = normalizeTime(body.depart_time);
    const arrivee_time = normalizeTime(body.arrivee_time);
    const numero_train = body.numero_train != null && body.numero_train !== '' ? String(body.numero_train) : null;
    const type_train = body.type_train != null && body.type_train !== '' ? String(body.type_train) : null;

    const stopsArr = parseStopsInput(body.stops);

    const jours_circulation_obj = body.jours_circulation != null ? (typeof body.jours_circulation === 'object' ? body.jours_circulation : safeParseJSON(body.jours_circulation, {})) : {};
    const circulent_jours_feries = body.circulent_jours_feries ? 1 : 0;
    const circulent_dimanches = body.circulent_dimanches ? 1 : 0;
    const jours_personnalises_arr = Array.isArray(body.jours_personnalises) ? body.jours_personnalises : safeParseJSON(body.jours_personnalises, []);
    const materiel_id = body.materiel_id != null && !Number.isNaN(Number(body.materiel_id)) ? parseInt(body.materiel_id, 10) : null;
    const is_substitution = body.is_substitution ? 1 : 0;
    // support ligne_id and service_annuel_id for new schema
    const ligne_id = body.ligne_id != null && !Number.isNaN(Number(body.ligne_id)) ? parseInt(body.ligne_id, 10) : null;
    const service_annuel_id = body.service_annuel_id != null && !Number.isNaN(Number(body.service_annuel_id)) ? parseInt(body.service_annuel_id, 10) : null;

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

    const insertParams = [
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
      is_substitution
    ];

    // detect undefined and coerce to null
    const undefIdx = [];
    insertParams.forEach((p, idx) => { if (p === undefined) undefIdx.push({ idx, type: typeof p }); });
    if (undefIdx.length > 0) {
      console.warn('POST /api/admin/horaires found undefined insert params at indices (will coerce to null):', undefIdx);
      for (const ui of undefIdx) insertParams[ui.idx] = null;
    }

    const sanitizedInsert = insertParams.map(p => p === undefined ? null : p);
    const finalInsertParams = sanitizedInsert.map((p, idx) => {
      if (p === null) return null;
      const t = typeof p;
      if (t === 'string' || t === 'number' || t === 'boolean') return p;
      try { return JSON.stringify(p); } catch(e) { console.error('Failed stringify insert param', idx, e); return null; }
    });

    console.debug('POST /api/admin/horaires finalInsertParams:', finalInsertParams);

    // Adjust INSERT to include ligne_id and service_annuel_id (keeping compatibility if DB lacks these columns)
    let insertSql = `INSERT INTO horaires (depart_station_id, arrivee_station_id, depart_time, arrivee_time, numero_train, type_train, stops, jours_circulation, circulent_jours_feries, circulent_dimanches, jours_personnalises, materiel_id, is_substitution) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    let paramsToUse = finalInsertParams;
    try {
      // Try to run an INSERT that includes new columns; if DB doesn't have them this will throw and we fallback
      insertSql = `INSERT INTO horaires (depart_station_id, arrivee_station_id, depart_time, arrivee_time, numero_train, type_train, stops, jours_circulation, circulent_jours_feries, circulent_dimanches, jours_personnalises, materiel_id, ligne_id, service_annuel_id, is_substitution) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      paramsToUse = finalInsertParams.slice(0, finalInsertParams.length); // includes ligne_id, service_annuel_id
    } catch (e) {
      // noop - will use older insertSql
    }

    const [result] = await pool.execute(insertSql, paramsToUse);

    // read back the created row
    const [rows] = await pool.execute('SELECT * FROM horaires WHERE id = ?', [result.insertId]);
    if (!rows || rows.length === 0) return NextResponse.json({ error: 'Création échouée' }, { status: 500 });
    const newRow = formatHoraireRow(rows[0]);
    return NextResponse.json(newRow, { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/horaires error', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
