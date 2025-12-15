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
    const searchRaw = searchParams.get('search') || null;
    let obj = null;
    if (searchRaw) {
      try { obj = JSON.parse(decodeURIComponent(searchRaw)); } catch (e) { obj = null; }
    }

    // Extract filters from obj (safe fallback to empty object)
    const q = obj || {};
    const fromCode = q.from && q.from.code ? String(q.from.code).toUpperCase() : null;
    const toCode = q.to && q.to.code ? String(q.to.code).toUpperCase() : null;
    const fromName = q.from && q.from.nom ? String(q.from.nom).toLowerCase().trim() : null;
    const toName = q.to && q.to.nom ? String(q.to.nom).toLowerCase().trim() : null;
    const searchDate = q.depart && q.depart.date ? new Date(q.depart.date) : null;
    const searchTime = q.depart && q.depart.time ? String(q.depart.time).slice(0,5) : null;

    // If names provided (partial), resolve to station codes via ilike
    let fromNameCodes = null;
    let toNameCodes = null;
    if (fromName && !fromCode) {
      // search stations by name (ILIKE)
      const { data: sFrom, error: sFromErr } = await pool.client
        .from('stations')
        .select('code')
        .ilike('nom', `%${fromName}%`)
        .limit(50);
      if (sFromErr) console.warn('stations lookup error (fromName)', sFromErr);
      if (Array.isArray(sFrom) && sFrom.length > 0) fromNameCodes = sFrom.map(s => String(s.code).toUpperCase());
      else {
        // no station matches provided name -> no results
        return NextResponse.json([]);
      }
    }
    if (toName && !toCode) {
      const { data: sTo, error: sToErr } = await pool.client
        .from('stations')
        .select('code')
        .ilike('nom', `%${toName}%`)
        .limit(50);
      if (sToErr) console.warn('stations lookup error (toName)', sToErr);
      if (Array.isArray(sTo) && sTo.length > 0) toNameCodes = sTo.map(s => String(s.code).toUpperCase());
      else {
        return NextResponse.json([]);
      }
    }

    // Build base query: include related station names when possible
    let query = pool.client.from('horaires').select(`
      *,
      depart_station:stations!depart_station_id(code, nom),
      arrivee_station:stations!arrivee_station_id(code, nom)
    `).order('depart_time', { ascending: true }).limit(500);

    // Apply code filters: exact code if present, else use resolved name codes if any
    if (fromCode) query = query.eq('depart_station_code', fromCode);
    else if (fromNameCodes) query = query.in('depart_station_code', fromNameCodes);
    if (toCode) query = query.eq('arrivee_station_code', toCode);
    else if (toNameCodes) query = query.in('arrivee_station_code', toNameCodes);

    const { data, error } = await query;
    if (error) {
      console.error('GET /api/offers supabase error', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    const list = Array.isArray(data) ? data.map(d => formatHoraireRow(d)) : [];

    // Build map of station codes -> names for stops resolution
    const codes = new Set();
    list.forEach(h => {
      if (h.depart_station_code) codes.add(String(h.depart_station_code).toUpperCase());
      if (h.arrivee_station_code) codes.add(String(h.arrivee_station_code).toUpperCase());
      if (Array.isArray(h.stops)) {
        h.stops.forEach(s => { if (s && s.station_code) codes.add(String(s.station_code).toUpperCase()); });
      }
    });
    const codesArr = Array.from(codes).filter(Boolean);
    const codeToName = {};
    if (codesArr.length > 0) {
      const { data: stationsData, error: stationsError } = await pool.client.from('stations').select('code, nom').in('code', codesArr);
      if (!stationsError && Array.isArray(stationsData)) {
        stationsData.forEach(s => { if (s && s.code) codeToName[String(s.code).toUpperCase()] = s.nom || null; });
      }
    }

    // Helpers for date/time filtering
    function runsOnDate(h, date) {
      if (!date) return true;
      try {
        const jc = safeParseJSON(h.jours_circulation, {});
        const jp = safeParseJSON(h.jours_personnalises, []);
        if (Array.isArray(jp) && jp.length > 0) {
          const wanted = date.toISOString().slice(0,10);
          return jp.map(d=>String(d).slice(0,10)).includes(wanted);
        }
        if (jc && typeof jc === 'object' && Object.keys(jc).length > 0) {
          const map = ['dim','lun','mar','mer','jeu','ven','sam'];
          const key = map[date.getDay()];
          return Boolean(jc[key]);
        }
        return true;
      } catch (e) { return true; }
    }

    function timeIsOnOrAfter(horaireTime, cmpTime) {
      if (!cmpTime) return true;
      if (!horaireTime) return false;
      const [hh1, mm1] = String(horaireTime).split(':').map(Number);
      const [hh2, mm2] = String(cmpTime).split(':').map(Number);
      if (![hh1,mm1,hh2,mm2].every(n => Number.isFinite(n))) return false;
      if (hh1 > hh2) return true;
      if (hh1 < hh2) return false;
      return mm1 >= mm2;
    }

    // Final filtering (names, stops, date, time)
    let filtered = list.filter(h => {
      if (!h) return false;
      const depCodeKey = h.depart_station_code ? String(h.depart_station_code).toUpperCase() : null;
      const arrCodeKey = h.arrivee_station_code ? String(h.arrivee_station_code).toUpperCase() : null;
      const depName = h.depart_station_name || (depCodeKey ? codeToName[depCodeKey] : null) || (h.depart_station?.nom || '') || '';
      const arrName = h.arrivee_station_name || (arrCodeKey ? codeToName[arrCodeKey] : null) || (h.arrivee_station?.nom || '') || '';

      // match by code if provided (we already filtered by code in query), else by name if provided
      const depMatch = fromCode ? (depCodeKey === fromCode) : (fromName ? (String(depName || '').toLowerCase().trim() === fromName) : true);
      const arrMatch = toCode ? (arrCodeKey === toCode) : (toName ? (String(arrName || '').toLowerCase().trim() === toName) : true);

      // If either code-based match failed, we may still include if station appears in stops
      if (!(depMatch && arrMatch)) {
        // if fromCode provided but not matched on depart/arrive, check stops
        if (fromCode || toCode) {
          const sArr = Array.isArray(h.stops) ? h.stops : [];
          const hasFromInStops = fromCode ? sArr.some(s => String(s.station_code).toUpperCase() === fromCode && (s.depart_time || s.arrivee_time)) : true;
          const hasToInStops = toCode ? sArr.some(s => String(s.station_code).toUpperCase() === toCode && (s.depart_time || s.arrivee_time)) : true;
          if (!(hasFromInStops && hasToInStops)) return false;
        } else {
          return false;
        }
      }

      // date filter
      if (searchDate && !runsOnDate(h, searchDate)) return false;
      // time filter (timeIsOnOrAfter already handles missing cmpTime)
      if (!timeIsOnOrAfter(h.depart_time || h.arrivee_time || '', searchTime)) return false;

      return true;
    });

    // Map to UI-friendly offers
    const mapped = filtered.map(h => {
      const depart = h.depart_time || '';
      const arrive = h.arrivee_time || '';
      const duration = (function computeDuration(dep, arr) {
        if (!dep || !arr) return '';
        try {
          const [dh, dm] = String(dep).split(':').map(Number);
          const [ah, am] = String(arr).split(':').map(Number);
          if (![dh,dm,ah,am].every(n => Number.isFinite(n))) return '';
          const d = new Date(); d.setHours(dh, dm, 0, 0);
          const a = new Date(); a.setHours(ah, am, 0, 0);
          if (a < d) a.setDate(a.getDate() + 1);
          const diff = Math.floor((a - d) / 60000);
          const h = Math.floor(diff / 60);
          const m = diff % 60;
          return h > 0 ? `${h}h${String(m).padStart(2,'0')}` : `${m} min`;
        } catch (e) { return ''; }
      })(depart, arrive) || '';

      const depCodeKey = h.depart_station_code ? String(h.depart_station_code).toUpperCase() : null;
      const arrCodeKey = h.arrivee_station_code ? String(h.arrivee_station_code).toUpperCase() : null;
      const fromStationName = h.depart_station_name || (depCodeKey ? codeToName[depCodeKey] : '') || (h.depart_station?.nom || '') || '';
      const toStationName = h.arrivee_station_name || (arrCodeKey ? codeToName[arrCodeKey] : '') || (h.arrivee_station?.nom || '') || '';

      const segment = {
        depart: depart || '',
        from: fromStationName,
        arrive: arrive || '',
        to: toStationName,
        duration: duration || '',
        trainName: `${h.type_train ? h.type_train + ' ' : ''}${h.numero_train || ''}`.trim(),
        ticketType: 'Billet direct',
        destination: toStationName,
        operator: h.exploitant || h.operateur || '',
        trainType: h.materiel_name || h.materiel || '',
        carriages: h.voitures || null,
        places: null,
        bike: false
      };

      // Enrichir les stops avec station_name et horaires normalisés
      const stopsMapped = (Array.isArray(h.stops) ? h.stops : []).map(s => ({
         ...s,
         station_code: s.station_code || s.station_id || null,
         station_name: s.station_name || (s.station_code ? (codeToName[String(s.station_code).toUpperCase()] || null) : null) || null,
         depart_time: s.depart_time || s.depart || null,
         arrivee_time: s.arrivee_time || s.arrive || null
       }));

      return {
         id: h.id,
         depart: depart || '',
         from: segment.from,
         to: segment.to,
         arrive: arrive || '',
         duration: duration || '',
         sold: false,
         segments: [segment],
         stops: stopsMapped
      };
    });

    return NextResponse.json(mapped);
  } catch (e) {
    console.error('GET /api/offers error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
