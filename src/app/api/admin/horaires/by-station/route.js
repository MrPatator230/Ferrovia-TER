import { NextResponse } from 'next/server';
import pool from '@/lib/db_horaires';

const MAIN_DB_NAME = process.env.DB_NAME || 'ferrovia_ter_bfc';

function safeParseJSON(input, fallback) {
  if (input == null) return fallback;
  if (typeof input === 'object') return input;
  try { return JSON.parse(input); } catch (e) { return fallback; }
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
  row.depart_time = row.depart_time ? String(row.depart_time).slice(0, 5) : null;
  row.arrivee_time = row.arrivee_time ? String(row.arrivee_time).slice(0, 5) : null;
  return row;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const stationIdParam = searchParams.get('id');
    const type = (searchParams.get('type') || '').toLowerCase(); // 'depart' | 'arrivee'
    const stationId = stationIdParam && !Number.isNaN(Number(stationIdParam)) ? parseInt(stationIdParam, 10) : null;
    if (!stationId) return NextResponse.json({ error: 'Paramètre id invalide' }, { status: 400 });

    let sql;
    let params;
    if (type === 'depart') {
      // horaires dont la gare sélectionnée est la gare de départ OU présente dans stops en tant que départ
      sql = `SELECT h.*, sd.nom as depart_station_name, sa.nom as arrivee_station_name
             FROM horaires h
             LEFT JOIN ${MAIN_DB_NAME}.stations sd ON h.depart_station_id = sd.id
             LEFT JOIN ${MAIN_DB_NAME}.stations sa ON h.arrivee_station_id = sa.id
             WHERE h.depart_station_id = ? OR JSON_SEARCH(h.stops, 'one', CAST(? AS CHAR), NULL, '$[*].station_id') IS NOT NULL
             ORDER BY h.depart_time ASC
             LIMIT 500`;
      params = [stationId, stationId];
    } else if (type === 'arrivee') {
      // horaires dont la gare sélectionnée est la gare d'arrivée OU présente dans stops en tant qu'arrivée
      sql = `SELECT h.*, sd.nom as depart_station_name, sa.nom as arrivee_station_name
             FROM horaires h
             LEFT JOIN ${MAIN_DB_NAME}.stations sd ON h.depart_station_id = sd.id
             LEFT JOIN ${MAIN_DB_NAME}.stations sa ON h.arrivee_station_id = sa.id
             WHERE h.arrivee_station_id = ? OR JSON_SEARCH(h.stops, 'one', CAST(? AS CHAR), NULL, '$[*].station_id') IS NOT NULL
             ORDER BY h.arrivee_time ASC
             LIMIT 500`;
      params = [stationId, stationId];
    } else {
      // défaut: tout horaire passant par la gare
      sql = `SELECT h.*, sd.nom as depart_station_name, sa.nom as arrivee_station_name
             FROM horaires h
             LEFT JOIN ${MAIN_DB_NAME}.stations sd ON h.depart_station_id = sd.id
             LEFT JOIN ${MAIN_DB_NAME}.stations sa ON h.arrivee_station_id = sa.id
             WHERE h.depart_station_id = ? OR h.arrivee_station_id = ? OR JSON_SEARCH(h.stops, 'one', CAST(? AS CHAR), NULL, '$[*].station_id') IS NOT NULL
             ORDER BY h.depart_time ASC
             LIMIT 500`;
      params = [stationId, stationId, stationId];
    }

    const [rows] = await pool.execute(sql, params);
    const mapped = Array.isArray(rows) ? rows.map(formatHoraireRow) : [];

    // Filtrer plus précisément: pour type depart, garder ceux où à cette station il y a depart_time (dans stops ou champ principal);
    if (type === 'depart') {
      return NextResponse.json(mapped.filter((h) => {
        if (h.depart_station_id === stationId) return true;
        const s = Array.isArray(h.stops) ? h.stops.find(st => st.station_id === stationId) : null;
        return !!(s && s.depart_time);
      }));
    }
    if (type === 'arrivee') {
      return NextResponse.json(mapped.filter((h) => {
        if (h.arrivee_station_id === stationId) return true;
        const s = Array.isArray(h.stops) ? h.stops.find(st => st.station_id === stationId) : null;
        return !!(s && s.arrivee_time);
      }));
    }

    return NextResponse.json(mapped);
  } catch (e) {
    console.error('GET /api/admin/horaires/by-station error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

