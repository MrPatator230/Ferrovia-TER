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
    // Parse date as local date (not UTC) to avoid timezone issues
    let searchDate = null;
    if (q.depart && q.depart.date) {
      const dateStr = String(q.depart.date);
      const [year, month, day] = dateStr.split('-').map(Number);
      if (year && month && day) {
        searchDate = new Date(year, month - 1, day);
      }
    }
    const searchTime = q.depart && q.depart.time ? String(q.depart.time).slice(0,5) : null;
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
    // Inclure le matériel roulant lié (si présent) afin que le front puisse afficher l'image
    // Note: we do NOT rely on a foreign-key relationship for materiel_roulant (it may not exist in PostgREST schema)
    // => select horaires with station joins only; we'll fetch materiels separately using materiel_id when present
    let query = pool.client.from('horaires').select(`
      *,
      depart_station:stations!depart_station_id(code, nom),
      arrivee_station:stations!arrivee_station_id(code, nom)
    `).order('depart_time', { ascending: true }).limit(2000);

    // Si on cherche par code exact, on peut filtrer directement avec OR pour être moins restrictif
    // MAIS si les deux gares peuvent être dans les stops, on doit récupérer TOUS les horaires
    // car Supabase ne peut pas chercher efficacement dans un champ JSON avec OR
    const codesForFilter = [];
    if (fromCode) codesForFilter.push(fromCode);
    if (fromNameCodes && fromNameCodes.length > 0) codesForFilter.push(...fromNameCodes);
    if (toCode) codesForFilter.push(toCode);
    if (toNameCodes && toNameCodes.length > 0) codesForFilter.push(...toNameCodes);

    // Stratégie: appliquer le filtre OR seulement si on a des codes
    // Le filtrage fin (incluant les stops) se fera côté serveur
    if (codesForFilter.length > 0) {
      const orConditions = codesForFilter.map(c => `depart_station_code.eq.${c},arrivee_station_code.eq.${c}`).join(',');
      query = query.or(orConditions);
    }

    const { data, error } = await query;

    // Si la requête avec OR ne retourne rien et qu'on a des codes à chercher,
    // c'est peut-être que les deux gares sont dans les stops
    // On refait une requête SANS filtre pour tout récupérer
    let needsFallback = false;
    if (codesForFilter.length > 0 && (!data || data.length === 0)) {
      needsFallback = true;
    }

    let finalData = data;
    if (needsFallback && !error) {
      console.log('[api/offers] Fallback: requête sans filtre pour chercher dans stops');
      const { data: allData, error: allError } = await pool.client.from('horaires').select(`
        *,
        depart_station:stations!depart_station_id(code, nom),
        arrivee_station:stations!arrivee_station_id(code, nom)
      `).order('depart_time', { ascending: true }).limit(2000);

      if (!allError && allData) {
        finalData = allData;
      }
    }

    if (error) {
      // Log détaillé pour le développement
      console.error('GET /api/offers supabase error', error);

      // Détecter les erreurs réseau fréquentes (DNS) et fournir un hint
      const errMsg = (error && (error.message || error.details || JSON.stringify(error))) || 'Erreur Supabase';
      let hint = '';
      if (typeof errMsg === 'string' && errMsg.toLowerCase().includes('getaddrinfo')) {
        hint = 'Impossible de résoudre le host Supabase (ENOTFOUND). Vérifiez la variable d\'environnement NEXT_PUBLIC_SUPABASE_URL et la connectivité réseau.';
        console.warn('[api/offers] Hint:', hint);
      }

      return NextResponse.json({ error: 'Erreur serveur', details: errMsg, hint }, { status: 500 });
    }

    const list = Array.isArray(finalData) ? finalData.map(d => formatHoraireRow(d)) : [];

    // Récupérer les services annuels référencés par service_annuel_id
    const serviceAnnuelIds = Array.from(new Set(list.map(r => r.service_annuel_id).filter(Boolean)));
    const serviceAnnuelById = {};
    if (serviceAnnuelIds.length > 0) {
      try {
        const { data: saData, error: saErr } = await pool.client.from('services_annuels').select('id, nom, date_debut, date_fin, actif').in('id', serviceAnnuelIds);
        if (!saErr && Array.isArray(saData)) {
          saData.forEach(sa => { if (sa && sa.id) serviceAnnuelById[sa.id] = sa; });
        } else if (saErr) {
          console.warn('GET /api/offers: services_annuels lookup error', saErr);
        }
      } catch (e) {
        console.warn('GET /api/offers: exception fetching services_annuels', e);
      }
    }

    // Récupérer les matériels roulants référencés par materiel_id (si présents) en une seule requête
    const materielIds = Array.from(new Set(list.map(r => r.materiel_id).filter(Boolean)));
    const materielById = {};
    if (materielIds.length > 0) {
      try {
        const { data: matData, error: matErr } = await pool.client.from('materiel_roulant').select('id, nom, image_path, image, image_url, path, url').in('id', materielIds);
        if (!matErr && Array.isArray(matData)) {
          matData.forEach(m => { if (m && m.id) materielById[m.id] = m; });
        } else if (matErr) {
          console.warn('GET /api/offers: materiel_roulant lookup error', matErr);
        }
      } catch (e) {
        console.warn('GET /api/offers: exception fetching materiels', e);
      }
    }

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
    function easterDate(year) {
      // Meeus/Jones/Butcher algorithm
      const a = year % 19;
      const b = Math.floor(year / 100);
      const c = year % 100;
      const d = Math.floor(b / 4);
      const e = b % 4;
      const f = Math.floor((b + 8) / 25);
      const g = Math.floor((b - f + 1) / 3);
      const h = (19 * a + b - d - g + 15) % 30;
      const i = Math.floor(c / 4);
      const k = c % 4;
      const l = (32 + 2 * e + 2 * i - h - k) % 7;
      const m = Math.floor((a + 11 * h + 22 * l) / 451);
      const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=March, 4=April
      const day = ((h + l - 7 * m + 114) % 31) + 1;
      return new Date(Date.UTC(year, month - 1, day));
    }

    function isFrenchPublicHoliday(date) {
      if (!date || !(date instanceof Date)) return false;
      const y = date.getFullYear();
      const d = date.getDate();
      const m = date.getMonth() + 1; // 1-12

      // Fixed holidays
      const fixed = [
        { day: 1, month: 1 },   // New Year's Day
        { day: 1, month: 5 },   // Labour Day
        { day: 8, month: 5 },   // Victory in Europe Day
        { day: 14, month: 7 },  // Bastille Day
        { day: 15, month: 8 },  // Assumption
        { day: 1, month: 11 },  // All Saints
        { day: 11, month: 11 }, // Armistice
        { day: 25, month: 12 }  // Christmas
      ];
      if (fixed.some(h => h.day === d && h.month === m)) return true;

      // Movable feasts based on Easter
      const easter = easterDate(y); // UTC date
      const toLocal = (dt, days) => {
        const res = new Date(dt.getTime());
        res.setUTCDate(res.getUTCDate() + days);
        // convert to local date (so month/day reflect user's timezone)
        return new Date(res.getUTCFullYear(), res.getUTCMonth(), res.getUTCDate());
      };
      const easterMonday = toLocal(easter, 1);
      const ascension = toLocal(easter, 39);
      const whitMonday = toLocal(easter, 50);

      // Movable feasts: return true if any of them match the date
      return (
        (easterMonday.getDate() === d && easterMonday.getMonth() + 1 === m) ||
        (ascension.getDate() === d && ascension.getMonth() + 1 === m) ||
        (whitMonday.getDate() === d && whitMonday.getMonth() + 1 === m)
      );
    }

    function runsOnDate(h, date, serviceAnnuelMap) {
      if (!date) return true;
      try {
        // Vérifier d'abord si la date est dans la période du service annuel
        if (h.service_annuel_id && serviceAnnuelMap && serviceAnnuelMap[h.service_annuel_id]) {
          const sa = serviceAnnuelMap[h.service_annuel_id];

          // Vérifier que le service annuel est actif
          if (!sa.actif) return false;

          // Convertir les dates de début et fin en objets Date (en temps local)
          let dateDebut = null;
          let dateFin = null;

          if (sa.date_debut) {
            const [yDebut, mDebut, dDebut] = String(sa.date_debut).slice(0, 10).split('-').map(Number);
            if (yDebut && mDebut && dDebut) {
              dateDebut = new Date(yDebut, mDebut - 1, dDebut);
            }
          }

          if (sa.date_fin) {
            const [yFin, mFin, dFin] = String(sa.date_fin).slice(0, 10).split('-').map(Number);
            if (yFin && mFin && dFin) {
              dateFin = new Date(yFin, mFin - 1, dFin);
            }
          }

          // Vérifier que la date est comprise entre date_debut et date_fin (inclus)
          if (dateDebut && dateFin) {
            const searchDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const dateDebutOnly = new Date(dateDebut.getFullYear(), dateDebut.getMonth(), dateDebut.getDate());
            const dateFinOnly = new Date(dateFin.getFullYear(), dateFin.getMonth(), dateFin.getDate());

            if (searchDateOnly < dateDebutOnly || searchDateOnly > dateFinOnly) {
              return false; // Date hors de la période du service annuel
            }
          }
        }

        const jc = safeParseJSON(h.jours_circulation, {});
        const jp = safeParseJSON(h.jours_personnalises, []);

        // If jours_personnalises is present and non-empty => ONLY those dates apply
        if (Array.isArray(jp) && jp.length > 0) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const wanted = `${year}-${month}-${day}`;
          return jp.map(d=>String(d).slice(0,10)).includes(wanted);
        }

        // If date is a public holiday and the schedule doesn't run on holidays -> false
        const isHoliday = isFrenchPublicHoliday(date);
        if (isHoliday && !Boolean(h.circulent_jours_feries)) return false;

        // If jours_circulation is defined as an object with day keys, prefer it
        if (jc && typeof jc === 'object' && Object.keys(jc).length > 0) {
          const map = ['dim','lun','mar','mer','jeu','ven','sam'];
          const key = map[date.getDay()];

          // Special handling for Sundays: allow circulent_dimanches flag to override or complement jc.dim
          if (key === 'dim') {
            if (typeof jc[key] !== 'undefined') return Boolean(jc[key]);
            return Boolean(h.circulent_dimanches);
          }

          return Boolean(jc[key]);
        }

        // If nothing specified, default to true (assume circulates)
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

      // Vérifier indépendamment la gare de départ et la gare d'arrivée
      // Chaque gare peut être soit dans les terminus, soit dans les stops
      const sArr = Array.isArray(h.stops) ? h.stops : [];

      // Vérification gare FROM (départ recherchée)
      let fromFound = false;
      if (!fromCode && !fromName) {
        fromFound = true; // Pas de filtre sur FROM
      } else {
        // Check terminus de départ
        const depMatch = fromCode ? (depCodeKey === fromCode) : (fromName ? (depName && (depName.toLowerCase().includes(fromName) || fromName.includes(depName.toLowerCase()))) : false);

        if (depMatch) {
          fromFound = true;
        } else {
          // Check dans les stops
          const hasFromInStops = sArr.some(s => {
            if (!s || !(s.depart_time || s.arrivee_time)) return false;

            if (fromCode) {
              return s.station_code && String(s.station_code).toUpperCase() === fromCode;
            }

            if (fromName) {
              const code = s.station_code ? String(s.station_code).toUpperCase() : null;
              const nameFromCode = code ? (codeToName[code] || '') : '';
              const name = (s.station_name ? String(s.station_name) : nameFromCode || '').toString().toLowerCase().trim();
              return name && (name.includes(fromName) || fromName.includes(name));
            }

            return false;
          });

          if (hasFromInStops) fromFound = true;
        }
      }

      // Vérification gare TO (arrivée recherchée)
      let toFound = false;
      if (!toCode && !toName) {
        toFound = true; // Pas de filtre sur TO
      } else {
        // Check terminus d'arrivée
        const arrMatch = toCode ? (arrCodeKey === toCode) : (toName ? (arrName && (arrName.toLowerCase().includes(toName) || toName.includes(arrName.toLowerCase()))) : false);

        if (arrMatch) {
          toFound = true;
        } else {
          // Check dans les stops
          const hasToInStops = sArr.some(s => {
            if (!s || !(s.depart_time || s.arrivee_time)) return false;

            if (toCode) {
              return s.station_code && String(s.station_code).toUpperCase() === toCode;
            }

            if (toName) {
              const code = s.station_code ? String(s.station_code).toUpperCase() : null;
              const nameFromCode = code ? (codeToName[code] || '') : '';
              const name = (s.station_name ? String(s.station_name) : nameFromCode || '').toString().toLowerCase().trim();
              return name && (name.includes(toName) || toName.includes(name));
            }

            return false;
          });

          if (hasToInStops) toFound = true;
        }
      }

      // L'horaire doit matcher BOTH gares recherchées (from ET to)
      if (!fromFound || !toFound) return false;

      // ✅ Vérification du SENS DE CIRCULATION
      // Si on a des gares de départ et d'arrivée, vérifier que FROM vient AVANT TO dans le parcours
      if ((fromCode || fromName) && (toCode || toName)) {
        // Construire la liste ordonnée de toutes les gares du parcours
        const orderedStops = [
          { station_code: depCodeKey, type: 'terminus_depart' },
          ...sArr.map(s => ({
            station_code: s.station_code ? String(s.station_code).toUpperCase() : null,
            type: 'stop'
          })),
          { station_code: arrCodeKey, type: 'terminus_arrivee' }
        ].filter(s => s.station_code); // Enlever les nulls

        // Trouver les positions de FROM et TO
        let fromIndex = -1;
        let toIndex = -1;

        // Chercher FROM
        if (fromCode) {
          fromIndex = orderedStops.findIndex(s => s.station_code === fromCode);
        } else if (fromName) {
          fromIndex = orderedStops.findIndex(s => {
            const name = s.station_code ? (codeToName[s.station_code] || '').toLowerCase() : '';
            return name && (name.includes(fromName) || fromName.includes(name));
          });
        }

        // Chercher TO
        if (toCode) {
          toIndex = orderedStops.findIndex(s => s.station_code === toCode);
        } else if (toName) {
          toIndex = orderedStops.findIndex(s => {
            const name = s.station_code ? (codeToName[s.station_code] || '').toLowerCase() : '';
            return name && (name.includes(toName) || toName.includes(name));
          });
        }

        // Vérifier l'ordre : FROM doit venir AVANT TO
        if (fromIndex >= 0 && toIndex >= 0 && fromIndex >= toIndex) {
          // Mauvais sens : FROM vient après ou au même endroit que TO
          return false;
        }
      }

      // date filter
      // Combine date & time checks into a single boolean return to simplify control flow
      return (!searchDate || runsOnDate(h, searchDate, serviceAnnuelById)) && timeIsOnOrAfter(h.depart_time || h.arrivee_time || '', searchTime);
    });


    // Map to UI-friendly offers
    const mapped = filtered.map(h => {
      // Déterminer les horaires et noms de gares À AFFICHER (selon la recherche)
      // Si la gare recherchée est dans les stops, on utilise l'horaire du stop
      const depCodeKey = h.depart_station_code ? String(h.depart_station_code).toUpperCase() : null;
      const arrCodeKey = h.arrivee_station_code ? String(h.arrivee_station_code).toUpperCase() : null;
      const sArr = Array.isArray(h.stops) ? h.stops : [];

      // Valeurs par défaut (terminus)
      let departTime = h.depart_time || '';
      let arriveTime = h.arrivee_time || '';
      let fromStationName = h.depart_station_name || (depCodeKey ? codeToName[depCodeKey] : '') || (h.depart_station?.nom || '') || '';
      let toStationName = h.arrivee_station_name || (arrCodeKey ? codeToName[arrCodeKey] : '') || (h.arrivee_station?.nom || '') || '';

      // Chercher si la gare FROM recherchée est dans les stops
      if (fromCode || fromName) {
        const depMatch = fromCode ? (depCodeKey === fromCode) : (fromName ? (fromStationName && (fromStationName.toLowerCase().includes(fromName) || fromName.includes(fromStationName.toLowerCase()))) : false);

        if (!depMatch) {
          // La gare FROM est dans les stops, pas le terminus
          const stopFrom = sArr.find(s => {
            if (!s || !(s.depart_time || s.arrivee_time)) return false;

            if (fromCode) {
              return s.station_code && String(s.station_code).toUpperCase() === fromCode;
            }

            if (fromName) {
              const code = s.station_code ? String(s.station_code).toUpperCase() : null;
              const nameFromCode = code ? (codeToName[code] || '') : '';
              const name = (s.station_name ? String(s.station_name) : nameFromCode || '').toString().toLowerCase().trim();
              return name && (name.includes(fromName) || fromName.includes(name));
            }

            return false;
          });

          if (stopFrom) {
            departTime = stopFrom.depart_time || stopFrom.arrivee_time || departTime;
            const code = stopFrom.station_code ? String(stopFrom.station_code).toUpperCase() : null;
            fromStationName = stopFrom.station_name || (code ? codeToName[code] : '') || fromStationName;
          }
        }
      }

      // Chercher si la gare TO recherchée est dans les stops
      if (toCode || toName) {
        const arrMatch = toCode ? (arrCodeKey === toCode) : (toName ? (toStationName && (toStationName.toLowerCase().includes(toName) || toName.includes(toStationName.toLowerCase()))) : false);

        if (!arrMatch) {
          // La gare TO est dans les stops, pas le terminus
          const stopTo = sArr.find(s => {
            if (!s || !(s.depart_time || s.arrivee_time)) return false;

            if (toCode) {
              return s.station_code && String(s.station_code).toUpperCase() === toCode;
            }

            if (toName) {
              const code = s.station_code ? String(s.station_code).toUpperCase() : null;
              const nameFromCode = code ? (codeToName[code] || '') : '';
              const name = (s.station_name ? String(s.station_name) : nameFromCode || '').toString().toLowerCase().trim();
              return name && (name.includes(toName) || toName.includes(name));
            }

            return false;
          });

          if (stopTo) {
            arriveTime = stopTo.arrivee_time || stopTo.depart_time || arriveTime;
            const code = stopTo.station_code ? String(stopTo.station_code).toUpperCase() : null;
            toStationName = stopTo.station_name || (code ? codeToName[code] : '') || toStationName;
          }
        }
      }

      // Calculer la durée entre les horaires ajustés
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
      })(departTime, arriveTime) || '';

      const segment = {
         depart: departTime || '',
         from: fromStationName,
         arrive: arriveTime || '',
         to: toStationName,
         duration: duration || '',
         trainName: `${h.type_train ? h.type_train + ' ' : ''}${h.numero_train || ''}`.trim(),
         ticketType: 'Billet direct',
         destination: toStationName,
         operator: h.exploitant || h.operateur || '',
         // Prefer explicit materiel_name/materiel field, else use materiel record if we loaded it
         trainType: h.materiel_name || h.materiel || (h.materiel_id && materielById[h.materiel_id] ? materielById[h.materiel_id].nom : '') || '',
         carriages: h.voitures || null,
         places: null,
         bike: false
       };

      // Attacher l'objet matériel si présent dans la map materielById
      // Fallback strategy:
      // 1) materielById lookup (when materiel_id is present)
      // 2) nested h.materiel_roulant object (if the DB returned it)
      // 3) if h.materiel is a string (name or filename), wrap it in a small object
      let mat = null;
      if (h.materiel_id && materielById[h.materiel_id]) mat = materielById[h.materiel_id];
      else if (h.materiel_roulant && typeof h.materiel_roulant === 'object') mat = h.materiel_roulant;
      else if (h.materiel && typeof h.materiel === 'object') mat = h.materiel;
      else if (h.materiel && typeof h.materiel === 'string') mat = { nom: h.materiel, image: h.materiel };

      // If we still have no mat but there are image-like fields directly on h, use them
      if (!mat && (h.image || h.image_path || h.image_url || h.path || h.url)) {
        mat = {
          nom: h.materiel_name || h.materiel || null,
          image: h.image || h.image_path || h.image_url || h.path || h.url
        };
      }

      // Determine whether to show the materiel image: only if a materiel exists
      // and the departure time is within the next 24 hours.
      const shouldShowMateriel = (() => {
        if (!mat) return false;
        if (!departTime) return false;
        try {
          const now = new Date();
          const baseDate = (searchDate instanceof Date && !isNaN(searchDate)) ? new Date(searchDate) : new Date();
          const parts = String(departTime).split(':').map(Number);
          if (parts.length < 2 || !parts.every(n => Number.isFinite(n))) return false;
          const [hh, mm] = parts;
          let departDateTime = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hh, mm, 0, 0);
          // If the computed departure seems in the past by >12h, assume it belongs to the next day
          if (departDateTime.getTime() < now.getTime() && (now.getTime() - departDateTime.getTime()) > (12 * 60 * 60 * 1000)) {
            departDateTime.setDate(departDateTime.getDate() + 1);
          }
          const delta = departDateTime.getTime() - now.getTime();
          // Show only for departures in the future within 24 hours
          return delta >= 0 && delta <= (24 * 60 * 60 * 1000);
        } catch (e) {
          return false;
        }
      })();

      // Diagnostic log to see why materiel may not be shown
      try {
        console.debug('[api/offers] shouldShowMateriel', {
          id: h.id || null,
          departTime: departTime || null,
          searchDate: searchDate ? searchDate.toISOString().slice(0,16) : null,
          searchTime: searchTime || null,
          shouldShowMateriel
        });
      } catch (e) { /* ignore */ }

      if (shouldShowMateriel) {
        // Try common column names in materiel_roulant for the image path
        let imagePath = (mat?.image_path || mat?.image || mat?.image_url || mat?.path || mat?.url) || null;
        // Accepts string or object with url/path
        if (imagePath && typeof imagePath !== 'string') {
          if (imagePath.url) imagePath = imagePath.url;
          else if (imagePath.path) imagePath = imagePath.path;
          else imagePath = String(imagePath);
        }
        if (typeof imagePath === 'string') {
          // Strip leading './' or leading '/' and any leading 'public/'
          imagePath = imagePath.replace(/^\.\/?|^\//, '');
          imagePath = imagePath.replace(/^public\//, '');

          // Heuristic: if the value is not a full URL, and either contains no slash
          // or looks like it lacks an extension, assume it's stored under public/m-r/
          const isFullUrl = imagePath.startsWith('http');
          const hasSlash = imagePath.includes('/');
          const hasExt = /\.[a-z0-9]{1,6}$/i.test(imagePath);
          if (!isFullUrl && (!hasSlash || !hasExt)) {
            imagePath = `m-r/${imagePath}`;
          }

          // Ensure leading slash for browser accessibility (but keep full URLs intact)
          if (!imagePath.startsWith('http') && !imagePath.startsWith('/')) imagePath = '/' + imagePath;
        } else {
          imagePath = null;
        }

        // Debug log to help identify why material image may not appear in frontend
        try {
          console.debug('[api/offers] materiel resolved', { id: mat?.id || null, nom: mat?.nom || null, rawImageField: (mat?.image || mat?.image_path || mat?.image_url || mat?.path || mat?.url) || null, imagePath });
        } catch (e) { /* ignore logging errors */ }

        // Provide multiple keys for frontend compatibility
        segment.materiel = {
          id: mat?.id || null,
          nom: mat?.nom || null,
          image_path: imagePath || null,
          image: imagePath || null,
          image_url: imagePath || null,
          url: imagePath || null,
          raw: mat || null
        };
      } else {
        segment.materiel = null;
      }

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
         depart: departTime || '',
         from: fromStationName,
         to: toStationName,
         arrive: arriveTime || '',
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
