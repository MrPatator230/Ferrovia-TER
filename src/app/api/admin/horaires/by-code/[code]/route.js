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
    row.stops = row.stops.map(s => ({
      station_code: s && (s.station_code || s.station_id) ? String(s.station_code || s.station_id).toUpperCase() : null,
      depart_time: s && s.depart_time ? String(s.depart_time).slice(0,5) : null,
      arrivee_time: s && s.arrivee_time ? String(s.arrivee_time).slice(0,5) : null,
    }));
  } else row.stops = [];
  row.depart_time = row.depart_time ? String(row.depart_time).slice(0,5) : null;
  row.arrivee_time = row.arrivee_time ? String(row.arrivee_time).slice(0,5) : null;
  row.circulent_jours_feries = Boolean(row.circulent_jours_feries);
  row.circulent_dimanches = Boolean(row.circulent_dimanches);
  row.is_substitution = Boolean(row.is_substitution);
  row.jours_circulation = safeParseJSON(row.jours_circulation, {});
  row.jours_personnalises = safeParseJSON(row.jours_personnalises, []);
  return row;
}

function isHoraireForCode(h, code) {
  if (!h || !code) return false;
  const c = String(code).toUpperCase();
  if (h.depart_station_code && String(h.depart_station_code).toUpperCase() === c) return true;
  if (h.arrivee_station_code && String(h.arrivee_station_code).toUpperCase() === c) return true;
  try {
    const stops = typeof h.stops === 'string' ? safeParseJSON(h.stops, []) : (h.stops || []);
    if (Array.isArray(stops)) {
      for (const s of stops) {
        if (!s) continue;
        // stop may have station_code or station_id (legacy)
        const sc = s.station_code ? String(s.station_code).toUpperCase() : (s.station_id ? String(s.station_id).toUpperCase() : null);
        if (sc === c) return true;
      }
    }
  } catch (e) {
    // ignore parse errors
  }
  return false;
}

async function unwrapParams(params) {
  if (!params) return {};
  if (typeof params === 'object' && typeof params.then === 'function') {
    try { return await params; } catch (e) { return {}; }
  }
  return params;
}

export async function GET(request, { params }) {
  console.log('[GET] /api/admin/horaires/[code] called');
  const debug = { supabase: false, sql: false, found: 0 };
  const errors = [];
  try {
    const url = new URL(request.url);
    const debugMode = url.searchParams.get('debug') === '1';

    // unwrap params (Next.js may provide a thenable)
    const resolvedParams = await unwrapParams(params);
    console.log('[GET] resolved params:', resolvedParams);
    const codeRaw = (resolvedParams?.code || '').toString().trim();
    const code = codeRaw.toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) {
      return NextResponse.json({ error: 'Code invalide. Format attendu : 3 lettres (A-Z)' }, { status: 400 });
    }

    const horairesMap = new Map();

    // Try Supabase first (if configured)
    if (pool && pool.client && typeof pool.client.from === 'function') {
      try {
        debug.supabase = true;
        const { data: byEnds, error: errEnds } = await pool.client
          .from('horaires')
          .select('*')
          .or(`depart_station_code.eq.${code},arrivee_station_code.eq.${code}`)
          .limit(2000);
        if (errEnds) errors.push('supabase byEnds error: ' + JSON.stringify(errEnds));
        if (Array.isArray(byEnds)) byEnds.forEach(h => { if (h && h.id != null) horairesMap.set(h.id, h); });

        // rechercher dans stops (JSON contains)
        let byStops = null;
        try {
          const res = await pool.client
            .from('horaires')
            .select('*')
            .contains('stops', [{ station_code: code }])
            .limit(2000);
          byStops = res.data;
          if (res.error) errors.push('supabase byStops error (contains): ' + JSON.stringify(res.error));
        } catch (eContains) {
          // contains might fail if stops is not JSONB; fall through to ilike below
          errors.push('[supabase] contains failed: ' + (eContains && eContains.message ? eContains.message : String(eContains)));
        }
        // If contains returned nothing, try a text search fallback (ilike) to match "station_code":"CODE"
        if (!Array.isArray(byStops) || byStops.length === 0) {
          try {
            const pattern = `%"station_code":"${code}"%`;
            const res2 = await pool.client
              .from('horaires')
              .select('*')
              .ilike('stops', pattern)
              .limit(2000);
            if (res2.error) errors.push('supabase byStops error (ilike): ' + JSON.stringify(res2.error));
            if (Array.isArray(res2.data)) byStops = res2.data;
          } catch (eIlike) {
            errors.push('[supabase] ilike failed: ' + (eIlike && eIlike.message ? eIlike.message : String(eIlike)));
          }
        }
        if (Array.isArray(byStops)) byStops.forEach(h => { if (h && h.id != null) horairesMap.set(h.id, h); });
      } catch (e) {
        const msg = '[GET] supabase query failed: ' + (e && e.message ? e.message : String(e));
        console.warn(msg);
        errors.push(msg);
        debug.supabase = false;
      }
    }

    // Fallback SQL if needed
    if (horairesMap.size === 0) {
      try {
        const [rows] = await pool.execute(
          `SELECT * FROM horaires WHERE UPPER(COALESCE(depart_station_code, '')) = ? OR UPPER(COALESCE(arrivee_station_code, '')) = ? LIMIT 2000`,
          [code, code]
        );
        debug.sql = true;
        if (Array.isArray(rows)) rows.forEach(r => { if (r && r.id != null) horairesMap.set(r.id, r); });
      } catch (e) {
        const msg = '[GET] SQL select depart/arrivee failed: ' + (e && e.message ? e.message : String(e));
        console.warn(msg);
        errors.push(msg);
      }

      // scan a limited set for stops matches
      try {
        const [allRows] = await pool.execute(`SELECT id, stops FROM horaires LIMIT 5000`);
        if (Array.isArray(allRows)) {
          allRows.forEach(r => {
            if (!r || r.id == null) return;
            if (horairesMap.has(r.id)) return;
            try {
              const stops = typeof r.stops === 'string' ? safeParseJSON(r.stops, []) : (r.stops || []);
              if (Array.isArray(stops) && stops.some(s => String((s && (s.station_code || s.station_id)) || '').toUpperCase() === code)) {
                horairesMap.set(r.id, r);
              }
            } catch (e) { /* ignore parse error */ }
          });
        }
      } catch (e) {
        const msg = '[GET] SQL select all rows failed: ' + (e && e.message ? e.message : String(e));
        console.warn(msg);
        errors.push(msg);
      }
    }

    const horaires = Array.from(horairesMap.values());
    // filter to only horaires that actually concern the code
    const filteredHoraires = horaires.filter(h => isHoraireForCode(h, code));
    debug.found = filteredHoraires.length;

    // Build code->name map via SQL (simple and reliable)
    const codesSet = new Set();
    filteredHoraires.forEach(h => {
      if (h.depart_station_code) codesSet.add(String(h.depart_station_code).toUpperCase());
      if (h.arrivee_station_code) codesSet.add(String(h.arrivee_station_code).toUpperCase());
      try {
        const stops = typeof h.stops === 'string' ? safeParseJSON(h.stops, []) : (h.stops || []);
        if (Array.isArray(stops)) stops.forEach(s => { if (s && (s.station_code || s.station_id)) codesSet.add(String(s.station_code || s.station_id).toUpperCase()); });
      } catch (e) { /* ignore */ }
    });

    const codesArr = Array.from(codesSet).filter(Boolean);
    const codeToName = {};
    if (codesArr.length > 0) {
      try {
        const placeholders = codesArr.map(() => '?').join(',');
        const params = codesArr.map(c => String(c).toUpperCase());
        const [stationsRows] = await pool.execute(`SELECT code, nom FROM stations WHERE UPPER(code) IN (${placeholders})`, params);
        if (Array.isArray(stationsRows)) stationsRows.forEach(s => { if (s && s.code) codeToName[String(s.code).toUpperCase()] = s.nom || null; });
      } catch (e) {
        const msg = '[GET] stations SQL lookup failed: ' + (e && e.message ? e.message : String(e));
        console.warn(msg);
        errors.push(msg);
      }
    }

    const mapped = filteredHoraires.map(h => {
      const formatted = formatHoraireRow(h);
      formatted.depart_station_code = h.depart_station_code || null;
      formatted.arrivee_station_code = h.arrivee_station_code || null;
      formatted.depart_station_name = h.depart_station_code ? (codeToName[String(h.depart_station_code).toUpperCase()] || null) : null;
      formatted.arrivee_station_name = h.arrivee_station_code ? (codeToName[String(h.arrivee_station_code).toUpperCase()] || null) : null;
      formatted.stops = formatted.stops.map(s => ({
        ...s,
        station_code: s.station_code ? String(s.station_code).toUpperCase() : null,
        station_name: s.station_code ? (codeToName[String(s.station_code).toUpperCase()] || null) : null
      }));
      return formatted;
    });

    console.log('[GET] debug', { code, debug, errors });
    // Always return 200 with array (possibly empty)
    if (debugMode) return NextResponse.json({ mapped: mapped || [], debug, errors });
    return NextResponse.json(mapped || []);
  } catch (err) {
    console.error('[GET] unexpected error', err);
    if (request && request.url && new URL(request.url).searchParams.get('debug') === '1') {
      return NextResponse.json({ mapped: [], debug: { supabase: false, sql: false, found: 0 }, errors: [String(err)] }, { status: 200 });
    }
    return NextResponse.json([], { status: 200 });
  }
}
