import { NextResponse } from 'next/server';
import pool from '@/lib/db_horaires';

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
      // Normaliser station_id en Number pour comparaisons fiables
      station_id: s && s.station_id != null ? Number(s.station_id) : (s && s.station_id === 0 ? 0 : null),
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

    // Récupérer le code de la station pour matcher aussi les stops qui stockent des station_code
    let stationCode = null;
    try {
      const { data: stationRow, error: stationErr } = await pool.client
        .from('stations')
        .select('id,code')
        .eq('id', stationId)
        .limit(1)
        .single();
      if (!stationErr && stationRow && stationRow.code) {
        stationCode = String(stationRow.code).toUpperCase();
      }
    } catch (e) {
      // ignore - on continue sans stationCode
    }

    // Utiliser l'API Supabase directement
    let query = pool.client
      .from('horaires')
      .select(`
        *,
        depart_station:stations!depart_station_id(nom),
        arrivee_station:stations!arrivee_station_id(nom)
      `);

    if (type === 'depart') {
      // Filtrer par gare de départ
      query = query.eq('depart_station_id', stationId)
                   .order('depart_time', { ascending: true })
                   .limit(500);
    } else if (type === 'arrivee') {
      // Filtrer par gare d'arrivée
      query = query.eq('arrivee_station_id', stationId)
                   .order('arrivee_time', { ascending: true })
                   .limit(500);
    } else {
      // Filtrer par gare de départ OU d'arrivée
      // Note: Pour filtrer aussi dans stops (JSON), il faudrait faire une requête séparée côté client
      query = query.or(`depart_station_id.eq.${stationId},arrivee_station_id.eq.${stationId}`)
                   .order('depart_time', { ascending: true })
                   .limit(500);
    }

    const { data, error } = await query;

    if (error) {
      console.error('GET /api/admin/horaires/by-station error:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    // Mapper les données
    let mapped = (data || []).map(h => formatHoraireRow({
      ...h,
      depart_station_name: h.depart_station?.nom || null,
      arrivee_station_name: h.arrivee_station?.nom || null
    }));

    // Filtrer aussi par stops (JSON) si nécessaire
    // On fait ce filtrage côté serveur après récupération
    const allHoraires = mapped;

    // Ajouter les horaires où la station est dans stops
    const [additionalRows] = await pool.execute(
      'SELECT * FROM horaires ORDER BY depart_time ASC LIMIT 500'
    );

    const additionalMapped = (additionalRows || [])
      .map(h => formatHoraireRow({ ...h, depart_station_name: null, arrivee_station_name: null }))
      .filter(h => {
        // Vérifier si stationId est dans stops
        if (!Array.isArray(h.stops)) return false;
        // station_id a été normalisé dans formatHoraireRow

        return h.stops.some(s => {
          try {
            if (s == null) return false;

            // si stop est un primitif
            if (typeof s === 'string' || typeof s === 'number') {
              if (String(s) === String(stationId)) return true;
              if (stationCode && String(s).toUpperCase() === stationCode) return true;
              return false;
            }

            // check numeric station_id / id
            const sid = s.station_id != null ? Number(s.station_id)
                      : (s.id != null ? Number(s.id) : null);
            if (sid != null && Number(sid) === Number(stationId)) return true;

            // nested station object
            if (s.station && typeof s.station === 'object') {
              if (s.station.id != null && Number(s.station.id) === Number(stationId)) return true;
              const nestedCode = s.station.code || s.station.station_code || s.station.stationCode || null;
              if (nestedCode && stationCode && String(nestedCode).toUpperCase() === stationCode) return true;
            }

            // station_code / code fields
            const scode = s.station_code || s.code || s.stationCode || null;
            if (scode && stationCode && String(scode).toUpperCase() === stationCode) return true;

            return false;
          } catch (e) {
            return false;
          }
        });
      });

    // Fusionner sans doublons
    const allIds = new Set(allHoraires.map(h => h.id));
    additionalMapped.forEach(h => {
      if (!allIds.has(h.id)) {
        allHoraires.push(h);
      }
    });

    // Filtrer selon le type
    if (type === 'depart') {
      mapped = allHoraires.filter((h) => {
        if (h.depart_station_id === stationId) return true;
        const s = Array.isArray(h.stops) ? h.stops.find(st => {
          // st peut être objet ou primitif
          if (st == null) return false;
          if (typeof st === 'string' || typeof st === 'number') return String(st) === String(stationId) || (stationCode && String(st).toUpperCase() === stationCode);
          if (st.station_id != null && Number(st.station_id) === Number(stationId)) return true;
          if (st.station && st.station.id != null && Number(st.station.id) === Number(stationId)) return true;
          const sc = st.station_code || st.code || st.stationCode || null;
          if (sc && stationCode && String(sc).toUpperCase() === stationCode) return true;
          return false;
        }) : null;
        return !!(s && s.depart_time);
      });
    } else if (type === 'arrivee') {
      mapped = allHoraires.filter((h) => {
        if (h.arrivee_station_id === stationId) return true;
        const s = Array.isArray(h.stops) ? h.stops.find(st => {
          if (st == null) return false;
          if (typeof st === 'string' || typeof st === 'number') return String(st) === String(stationId) || (stationCode && String(st).toUpperCase() === stationCode);
          if (st.station_id != null && Number(st.station_id) === Number(stationId)) return true;
          if (st.station && st.station.id != null && Number(st.station.id) === Number(stationId)) return true;
          const sc = st.station_code || st.code || st.stationCode || null;
          if (sc && stationCode && String(sc).toUpperCase() === stationCode) return true;
          return false;
        }) : null;
        return !!(s && s.arrivee_time);
      });
    } else {
      mapped = allHoraires;
    }

    return NextResponse.json(mapped);
  } catch (e) {
    console.error('GET /api/admin/horaires/by-station error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
