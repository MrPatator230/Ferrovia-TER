import { NextResponse } from 'next/server';
import pool from '@/lib/db_horaires';

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

export async function POST(request) {
  try {
    const body = await request.json();
    const id = body.id != null ? (Number.isNaN(Number(body.id)) ? null : parseInt(body.id, 10)) : null;
    if (!id) return NextResponse.json({ error: 'Id invalide ou manquant' }, { status: 400 });

    // reuse existing [id] PUT logic but read id from body
    // Fetch existing row
    const [existingRows] = await pool.execute('SELECT * FROM horaires WHERE id = ?', [id]);
    if (!existingRows || existingRows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const existing = existingRows[0];

    // helpers to resolve station codes
    async function fetchStationCodesByIds(ids) {
      if (!ids || ids.length === 0) return {};
      const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
      const { data, error } = await pool.client.from('stations').select('id, code').in('id', uniqueIds);
      if (error || !data) { console.warn('fetchStationCodesByIds error', error); return {}; }
      const map = {};
      data.forEach(s => { if (s && s.id != null) map[String(s.id)] = s.code || null; });
      return map;
    }

    const incoming_depart_station_id = body.depart_station_id != null ? (Number.isNaN(Number(body.depart_station_id)) ? null : parseInt(body.depart_station_id, 10)) : null;
    const incoming_arrivee_station_id = body.arrivee_station_id != null ? (Number.isNaN(Number(body.arrivee_station_id)) ? null : parseInt(body.arrivee_station_id, 10)) : null;

    const incoming_depart_station_code = typeof body.depart_station_code === 'string' ? (body.depart_station_code.trim().toUpperCase() || null) : null;
    const incoming_arrivee_station_code = typeof body.arrivee_station_code === 'string' ? (body.arrivee_station_code.trim().toUpperCase() || null) : null;

    let depart_station_code = incoming_depart_station_code;
    let arrivee_station_code = incoming_arrivee_station_code;

    if (!depart_station_code && incoming_depart_station_id) {
      const map = await fetchStationCodesByIds([incoming_depart_station_id]);
      depart_station_code = map[String(incoming_depart_station_id)] || null;
    }
    if (!arrivee_station_code && incoming_arrivee_station_id) {
      const map = await fetchStationCodesByIds([incoming_arrivee_station_id]);
      arrivee_station_code = map[String(incoming_arrivee_station_id)] || null;
    }

    if (!depart_station_code) depart_station_code = existing.depart_station_code || existing.depart_station_id || null;
    if (!arrivee_station_code) arrivee_station_code = existing.arrivee_station_code || existing.arrivee_station_id || null;

    // stops
    let incomingStops = [];
    if (body.stops != null) {
      incomingStops = Array.isArray(body.stops) ? body.stops : safeParseJSON(body.stops, []);
    } else if (existing.stops) {
      incomingStops = typeof existing.stops === 'string' ? safeParseJSON(existing.stops, []) : existing.stops;
    }

    const idsInStops = incomingStops.filter(s => s && s.station_id != null).map(s => parseInt(s.station_id, 10));
    let idToCode = {};
    if (idsInStops.length > 0) idToCode = await fetchStationCodesByIds(idsInStops);

    const normalizedStops = incomingStops.map(s => {
      const station_code = s.station_code ? (String(s.station_code).trim().toUpperCase()) : (s.station_id ? (idToCode[String(s.station_id)] || null) : null);
      return {
        station_code: station_code,
        depart_time: normalizeTime(s.depart_time),
        arrivee_time: normalizeTime(s.arrivee_time)
      };
    });

    const depart_time = body.depart_time != null ? normalizeTime(body.depart_time) : (existing.depart_time ? String(existing.depart_time).slice(0,5) : null);
    const arrivee_time = body.arrivee_time != null ? normalizeTime(body.arrivee_time) : (existing.arrivee_time ? String(existing.arrivee_time).slice(0,5) : null);
    const numero_train = body.numero_train != null ? (body.numero_train === '' ? null : String(body.numero_train)) : (existing.numero_train != null ? String(existing.numero_train) : null);
    const type_train = body.type_train != null ? (body.type_train === '' ? null : String(body.type_train)) : (existing.type_train != null ? String(existing.type_train) : null);

    const jours_circulation_obj = body.jours_circulation != null ? (typeof body.jours_circulation === 'object' ? body.jours_circulation : safeParseJSON(body.jours_circulation, {})) : (existing.jours_circulation ? (typeof existing.jours_circulation === 'string' ? safeParseJSON(existing.jours_circulation, {}) : existing.jours_circulation) : {});
    const circulent_jours_feries = body.circulent_jours_feries != null ? (body.circulent_jours_feries ? 1 : 0) : (existing.circulent_jours_feries ? 1 : 0);
    const circulent_dimanches = body.circulent_dimanches != null ? (body.circulent_dimanches ? 1 : 0) : (existing.circulent_dimanches ? 1 : 0);
    const jours_personnalises_arr = body.jours_personnalises != null ? (Array.isArray(body.jours_personnalises) ? body.jours_personnalises : safeParseJSON(body.jours_personnalises, [])) : (existing.jours_personnalises ? (typeof existing.jours_personnalises === 'string' ? safeParseJSON(existing.jours_personnalises, []) : existing.jours_personnalises) : []);
    const materiel_id = body.materiel_id != null ? (Number.isNaN(Number(body.materiel_id)) ? null : parseInt(body.materiel_id, 10)) : (existing.materiel_id != null ? existing.materiel_id : null);
    const is_substitution = body.is_substitution != null ? (body.is_substitution ? 1 : 0) : (existing.is_substitution ? 1 : 0);
    const ligne_id = body.ligne_id != null ? (Number.isNaN(Number(body.ligne_id)) ? null : parseInt(body.ligne_id, 10)) : (existing.ligne_id != null ? existing.ligne_id : null);
    const service_annuel_id = body.service_annuel_id != null ? (Number.isNaN(Number(body.service_annuel_id)) ? null : parseInt(body.service_annuel_id, 10)) : (existing.service_annuel_id != null ? existing.service_annuel_id : null);

    const missing = {};
    if (!depart_station_code) missing.depart_station_code = 'missing_or_invalid_code';
    if (!arrivee_station_code) missing.arrivee_station_code = 'missing_or_invalid_code';
    if (!depart_time) missing.depart_time = 'missing_or_invalid_time_format';
    if (!arrivee_time) missing.arrivee_time = 'missing_or_invalid_time_format';

    normalizedStops.forEach((s, idx) => {
      if (!s.station_code) missing[`stops[${idx}].station_code`] = 'missing_or_invalid_code';
      if (!s.depart_time) missing[`stops[${idx}].depart_time`] = 'missing_or_invalid_time_format';
      if (!s.arrivee_time) missing[`stops[${idx}].arrivee_time`] = 'missing_or_invalid_time_format';
    });

    if (Object.keys(missing).length > 0) {
      return NextResponse.json({ error: 'Champs requis manquants ou invalides', missing }, { status: 400 });
    }

    const stopsJson = JSON.stringify(normalizedStops);
    const joursCirculationJson = JSON.stringify(jours_circulation_obj);
    const joursPersonnalisesJson = JSON.stringify(jours_personnalises_arr);

    const sqlParams = [
      depart_station_code,
      arrivee_station_code,
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
      id,
    ].map((p) => (typeof p === 'undefined' ? null : p));

    let sql = `UPDATE horaires SET depart_station_code = ?, arrivee_station_code = ?, depart_time = ?, arrivee_time = ?, numero_train = ?, type_train = ?, stops = ?, jours_circulation = ?, circulent_jours_feries = ?, circulent_dimanches = ?, jours_personnalises = ?, materiel_id = ?, is_substitution = ? WHERE id = ?`;
    try {
      sql = `UPDATE horaires SET depart_station_code = ?, arrivee_station_code = ?, depart_time = ?, arrivee_time = ?, numero_train = ?, type_train = ?, stops = ?, jours_circulation = ?, circulent_jours_feries = ?, circulent_dimanches = ?, jours_personnalises = ?, materiel_id = ?, ligne_id = ?, service_annuel_id = ?, is_substitution = ? WHERE id = ?`;
    } catch (e) { /* noop */ }

    await pool.execute(sql, sqlParams);

    // read back
    const updatedRows = await pool.execute('SELECT * FROM horaires WHERE id = ?', [id]);
    const updated = (Array.isArray(updatedRows) && updatedRows[0] && updatedRows[0][0]) ? updatedRows[0][0] : null;
    if (!updated) return NextResponse.json({ error: 'Mis à jour réussie mais lecture impossible' }, { status: 500 });

    // format and return
    // reuse simple formatter
    const row = { ...updated };
    row.stops = safeParseJSON(row.stops, []);
    if (Array.isArray(row.stops)) row.stops = row.stops.map(s => ({ station_code: s.station_code || null, depart_time: s.depart_time ? String(s.depart_time).slice(0,5) : null, arrivee_time: s.arrivee_time ? String(s.arrivee_time).slice(0,5) : null }));
    row.depart_time = row.depart_time ? String(row.depart_time).slice(0,5) : null;
    row.arrivee_time = row.arrivee_time ? String(row.arrivee_time).slice(0,5) : null;

    return NextResponse.json(row);
  } catch (e) {
    console.error('POST /api/admin/horaires/update error', e);
    return NextResponse.json({ error: 'Erreur serveur', debug: e && e.message ? e.message : String(e) }, { status: 500 });
  }
}

