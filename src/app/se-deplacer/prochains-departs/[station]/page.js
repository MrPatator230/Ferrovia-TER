"use client";
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import InfoBanner from '../../../../components/InfoBanner';
import Header from '../../../../components/Header';
import NavigationBar from '../../../../components/NavigationBar';
import styles from './page.module.css';

function slugify(name) {
  if (!name) return '';
  return encodeURIComponent(String(name).toLowerCase().trim()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, ''));
}

export default function StationHorairesPage() {
  const params = useParams();
  const slug = params?.station || '';

  const [station, setStation] = useState(null);
  const [stationName, setStationName] = useState('');
  const [horaires, setHoraires] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('depart'); // default to departures
  const [expandedId, setExpandedId] = useState(null);
  const [stationMap, setStationMap] = useState({});
  const [stationCodeMap, setStationCodeMap] = useState({});

  function toggleExpanded(id) {
    setExpandedId(prev => (prev === id ? null : id));
  }

  function handleKeyToggle(e, id) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleExpanded(id);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function loadStations() {
      try {
        const resStations = await fetch('/api/admin/stations', { cache: 'no-store' });
        if (!resStations.ok) {
          console.warn('loadStations: stations API returned', resStations.status);
          if (mounted) setError(`Erreur ${resStations.status}`);
          return;
        }
        const stationsData = await resStations.json();
        let found = null;
        if (Array.isArray(stationsData)) {
          found = stationsData.find(s => slugify(s.nom) === String(slug).toLowerCase());
        }
        if (!found) {
          const guessed = decodeURIComponent(slug || '').replace(/-/g, ' ').toLowerCase();
          if (Array.isArray(stationsData)) {
            found = stationsData.find(s => (s.nom || '').toLowerCase().trim() === guessed.trim());
          }
        }

        if (mounted) {
          if (Array.isArray(stationsData)) {
            const map = {};
            const codeMap = {};
            stationsData.forEach(s => { if (s && s.id != null) map[Number(s.id)] = s.nom || ''; if (s && s.code) codeMap[String(s.code).toUpperCase()] = s.nom || ''; });
            setStationMap(map);
            setStationCodeMap(codeMap);
          }
          if (found) {
            setStation(found);
            setStationName(found.nom || '');
          } else {
            setStation(null);
            setStationName(decodeURIComponent(slug || '').replace(/-/g, ' '));
          }
        }
      } catch (e) {
        console.error('Erreur chargement gares', e);
        if (mounted) setError(e && e.message ? e.message : 'Erreur');
      }
    }

    loadStations();

    return () => { mounted = false; };
  }, [slug]);

  // fetchHoraires: récupère la liste des horaires et met à jour l'état — appelé directement et en polling
  async function fetchHoraires() {
    try {
      setLoading(true);
      // If we have the station and its code, call the CODE API
      const stationCode = station && station.code ? String(station.code).toUpperCase() : null;
      let list = [];
      if (stationCode) {
        const res = await fetch(`/api/admin/horaires/${encodeURIComponent(stationCode)}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          list = Array.isArray(data) ? data : (data && Array.isArray(data.mapped) ? data.mapped : []);
        } else {
          // fallback to collection if code endpoint fails
          console.warn('Fetch by code failed, falling back to collection', res.status);
          const r2 = await fetch('/api/admin/horaires', { cache: 'no-store' });
          if (r2.ok) {
            const d2 = await r2.json();
            list = Array.isArray(d2) ? d2 : [];
          }
        }
      } else {
        // no code available yet -> fallback to fetching full collection
        const res = await fetch('/api/admin/horaires', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          list = Array.isArray(data) ? data : [];
        }
      }
      setHoraires(list);
       setError('');
     } catch (e) {
       console.error('Erreur chargement horaires', e);
       setError(e && e.message ? e.message : 'Erreur');
     } finally {
       setLoading(false);
     }
   }

  // polling des horaires toutes les 30s
  useEffect(() => {
    // effectuer un premier fetch, sans intervalle de rafraîchissement
    fetchHoraires();
  }, [slug]);

  function filterHoraires() {
    if (!station && !stationName) return [];
    const stationId = station && station.id != null ? Number(station.id) : null;
    const stationCode = station && station.code ? String(station.code).toUpperCase() : null;

    // helper: détecte si l'horaire a un arrêt (avec stop) correspondant à la gare
    function findStopAtStation(h) {
      if (!Array.isArray(h.stops)) return null;
      for (const s of h.stops) {
        if (!s) continue;
        const scode = s.station_code ? String(s.station_code).toUpperCase() : null;
        const sid = s.station_id != null ? Number(s.station_id) : null;
        if (scode && stationCode && scode === stationCode) return s;
        if (sid != null && stationId != null && sid === stationId) return s;
      }
      return null;
    }

    // helper: indique si l'horaire a une arrivée à la gare
    function isArrivalAtStation(h) {
      if (stationCode && h.arrivee_station_code && String(h.arrivee_station_code).toUpperCase() === stationCode) return true;
      if (stationId != null && Number(h.arrivee_station_id) === stationId) return true;
      const stop = findStopAtStation(h);
      if (stop) {
        // considérer arrivée si une arrivee_time est fournie on the stop
        if (stop.arrivee_time) return true;
        // si le stop n'a que depart_time, on ne le considère pas comme arrivée
      }
      // fallback par nom
      const name = (stationName || '').toLowerCase().trim();
      if (h.arrivee_station_name) return h.arrivee_station_name.toString().toLowerCase().trim() === name;
      return false;
    }

    // helper: indique si l'horaire a un départ à la gare
    function isDepartureAtStation(h) {
      if (stationCode && h.depart_station_code && String(h.depart_station_code).toUpperCase() === stationCode) return true;
      if (stationId != null && Number(h.depart_station_id) === stationId) return true;
      const stop = findStopAtStation(h);
      if (stop) {
        // considérer départ si une depart_time est fournie on the stop
        if (stop.depart_time) return true;
        // si le stop n'a que arrivee_time, on ne le considère pas comme départ
      }
      // fallback par nom
      const name = (stationName || '').toLowerCase().trim();
      if (h.depart_station_name) return h.depart_station_name.toString().toLowerCase().trim() === name;
      return false;
    }

    // filtrer selon le mode choisi (départs ou arrivées)
    if (mode === 'depart') {
      return horaires.filter(h => isDepartureAtStation(h));
    }
    // défaut = 'arrivees'
    return horaires.filter(h => isArrivalAtStation(h));
  }

  // helper: obtenir l'heure d'un horaire pour la gare (cherche dans stops sinon utilise depart/arrivee time)
  function getTimeAtStation(h) {
    const stationId = station && station.id != null ? Number(station.id) : null;
    const stationCode = station && station.code ? String(station.code).toUpperCase() : null;

    // Si on est en mode 'arrivees', privilégier l'heure d'arrivée
    if (mode === 'arrivees') {
      if (stationCode && h.arrivee_station_code && String(h.arrivee_station_code).toUpperCase() === stationCode && h.arrivee_time) return h.arrivee_time;
      if (stationId != null && Number(h.arrivee_station_id) === stationId && h.arrivee_time) return h.arrivee_time;
    } else {
      // mode depart -> privilégier heure de départ
      if (stationCode && h.depart_station_code && String(h.depart_station_code).toUpperCase() === stationCode && h.depart_time) return h.depart_time;
      if (stationId != null && Number(h.depart_station_id) === stationId && h.depart_time) return h.depart_time;
    }

    // chercher dans stops pour trouver le stop correspondant
    if (Array.isArray(h.stops)) {
      for (const s of h.stops) {
        if (!s) continue;
        const scode = s.station_code ? String(s.station_code).toUpperCase() : null;
        const sid = s.station_id != null ? Number(s.station_id) : null;
        if ((scode && stationCode && scode === stationCode) || (sid != null && stationId != null && sid === stationId)) {
          // en mode arrivees -> prefer arrivee_time sur le stop
          if (mode === 'arrivees') {
            if (s.arrivee_time) return s.arrivee_time;
            if (s.depart_time) return s.depart_time; // fallback
          } else {
            // mode depart -> prefer depart_time sur le stop
            if (s.depart_time) return s.depart_time;
            if (s.arrivee_time) return s.arrivee_time; // fallback
          }
        }
      }
    }

    // fallback: si la gare est exactement le depart/arrivée global du trajet
    if (mode === 'arrivees') {
      if (h.arrivee_time) return h.arrivee_time;
      if (h.depart_time) return h.depart_time;
    } else {
      if (h.depart_time) return h.depart_time;
      if (h.arrivee_time) return h.arrivee_time;
    }

    return null;
  }

  // helper: construire le libelle Mode
  function modeLabel(h) {
    const type = h.type_train ? String(h.type_train).trim() : '';
    const num = h.numero_train ? String(h.numero_train).trim() : '';
    if (type && num) return `Train ${type} ${num}`;
    if (num) return `Train ${num}`;
    if (type) return `Train ${type}`;
    return 'Train';
  }

  // helper: vérifie si une heure 'HH:mm' n'est pas passée aujourd'hui
  function isTimeNotPassed(timeStr) {
    if (!timeStr) return true; // si pas d'heure on conserve
    const parts = String(timeStr).split(':').map(s => s.trim());
    if (parts.length < 2) return true;
    const hh = Number(parts[0]);
    const mm = Number(parts[1]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return true;
    const now = new Date();
    const compare = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
    return compare >= now;
  }

  // helper: vérifie si un horaire circule à une date donnée en se basant sur jours_circulation
  function runsOnDate(h, date) {
    try {
      const jc = h.jours_circulation;
      if (!jc || typeof jc !== 'object' || Object.keys(jc).length === 0) return true; // pas d'info => assume true
      const map = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
      const key = map[date.getDay()];
      return Boolean(jc[key]);
    } catch (e) {
      return true;
    }
  }

  function formatDaySeparatorLabel(offsetDays = 1) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    const label = d.toLocaleDateString('fr-FR', options);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  // Build mapped list and split into today/tomorrow using jours_circulation
  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);

  const allMapped = filterHoraires().map(h => ({
    ...h,
    timeAtStation: getTimeAtStation(h),
    origin: h.depart_station_name || '',
    terminus: h.arrivee_station_name || '',
    modeLabel: modeLabel(h),
    runsToday: runsOnDate(h, now),
    runsTomorrow: runsOnDate(h, tomorrow),
  }));

  // today: circule aujourd'hui ET heure non passée (ou pas d'heure)
  let todayList = allMapped.filter(item => {
    if (!item.runsToday) return false;
    if (!item.timeAtStation) return true; // keep undated ones
    return isTimeNotPassed(item.timeAtStation);
  }).sort((a, b) => (a.timeAtStation || '').localeCompare(b.timeAtStation || ''));

  // tomorrow: circule demain and not already in today list
  const todayIds = new Set(todayList.map(i => i.id));
  let tomorrowList = allMapped.filter(item => {
    if (!item.runsTomorrow) return false;
    if (todayIds.has(item.id)) return false;
    // include even if time passed today
    return true;
  }).sort((a, b) => (a.timeAtStation || '').localeCompare(b.timeAtStation || ''));

  function stationNameById(id, fallback, code) {
    const codeKey = code ? String(code).toUpperCase() : null;
    if (codeKey && stationCodeMap && stationCodeMap[codeKey]) return stationCodeMap[codeKey];
    const sid = id != null ? Number(id) : null;
    if (sid != null && stationMap && stationMap[sid]) return stationMap[sid];
    if (fallback) return fallback;
    if (codeKey) return codeKey;
    return '';
  }

  function buildStopsForAccordion(h) {
    const base = Array.isArray(h.stops) ? [...h.stops] : [];
    const nameOf = v => (v || '').toString().trim().toLowerCase();
    const stationId = station && station.id != null ? Number(station.id) : null;
    const stationCode = station && station.code ? String(station.code).toUpperCase() : null;

    // inject origin/terminus if not included
    const hasOrigin = base.some(s => nameOf(s.station_name || s.nom) === nameOf(h.depart_station_name) || Number(s.station_id) === Number(h.depart_station_id) || (s.station_code && h.depart_station_code && String(s.station_code).toUpperCase() === String(h.depart_station_code).toUpperCase()));
    const hasTerminus = base.some(s => nameOf(s.station_name || s.nom) === nameOf(h.arrivee_station_name) || Number(s.station_id) === Number(h.arrivee_station_id) || (s.station_code && h.arrivee_station_code && String(s.station_code).toUpperCase() === String(h.arrivee_station_code).toUpperCase()));

    if (!hasOrigin && (h.depart_station_name || h.depart_station_id != null || h.depart_station_code)) {
      base.unshift({
        depart_time: h.depart_time || null,
        station_name: stationNameById(h.depart_station_id, h.depart_station_name || '', h.depart_station_code),
        station_id: h.depart_station_id,
        voie: h.voie || '-',
      });
    }
    if (!hasTerminus && (h.arrivee_station_name || h.arrivee_station_id != null || h.arrivee_station_code)) {
      base.push({
        arrivee_time: h.arrivee_time || null,
        station_name: stationNameById(h.arrivee_station_id, h.arrivee_station_name || '', h.arrivee_station_code),
        station_id: h.arrivee_station_id,
        voie: h.voie || '-',
      });
    }

    // find index of chosen station in composed list
    const idx = base.findIndex(s => {
      const sid = s.station_id != null ? Number(s.station_id) : null;
      if (sid != null && stationId != null && sid === stationId) return true;
      const scode = s.station_code ? String(s.station_code).toUpperCase() : null;
      if (scode && stationCode && scode === stationCode) return true;
      return nameOf(s.station_name || s.nom) === nameOf(stationName);
    });

    if (idx === -1) return base; // if not found, return full list

    // slice according to mode
    if (mode === 'depart') {
      // show chosen station and all after
      return base.slice(idx);
    }
    // arrivals: show all before including chosen
    return base.slice(0, idx + 1);
  }

  return (
    <div>
      <header role="banner">
        <InfoBanner />
        <Header />
        <NavigationBar />
      </header>

      <main role="main" className={styles.pageContainer}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.pageTitle}>{mode === 'arrivees' ? 'Prochaines arrivées' : 'Prochains départs'}</h1>
            <div className={styles.stationName}>Gare {stationName}</div>
          </div>

          <div className={styles.actionsTop}>
            <button className={styles.linkBtn}>Infos pratiques {stationName}</button>
            <button className={styles.linkBtn} onClick={() => history.back()}>Changer de gare</button>
          </div>
        </div>

        <div className={styles.modeTabs}>
          <button className={`${styles.modeTab} ${mode === 'depart' ? styles.modeTabActive : ''}`} onClick={() => setMode('depart')}>Départs SNCF</button>
          <button className={`${styles.modeTab} ${mode === 'arrivees' ? styles.modeTabActive : ''}`} onClick={() => setMode('arrivees')}>Arrivées SNCF</button>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableHeaderRow}>
            <div className={styles.colTime}>{mode === 'arrivees' ? 'Arrivée' : 'Départ'}</div>
            <div className={styles.colFrom}>{mode === 'arrivees' ? 'Provenance' : 'Destination'}</div>
            <div className={styles.colMode}>Mode</div>
            <div className={styles.colPlatform}>Voie</div>
          </div>

          {loading && <div style={{ padding: 16 }}>Chargement…</div>}
          {error && <div style={{ padding: 16, color: '#b00020' }}>Erreur: {error}</div>}

          {!loading && !error && todayList.length === 0 && tomorrowList.length === 0 && (
            <div style={{ padding: 16 }}>Aucun horaire trouvé pour cette gare.</div>
          )}

          {/* Render today's remaining schedules */}
          {!loading && !error && todayList.length === 0 && tomorrowList.length > 0 && (
            <div className={styles.noMoreToday}>
              <wcs-mat-icon icon="schedule" size="s" style={{ color: '#2c45a8' }}></wcs-mat-icon>
              <div>
                {mode === 'depart' ? "Plus aucun départ prévu aujourd'hui" : "Plus aucune arrivée prévue aujourd'hui"}
              </div>
            </div>
          )}

          {!loading && !error && todayList.map((h, idx) => {
            const uid = h.id != null ? `h-${h.id}` : `today-${idx}`;
            return (
              <div key={uid} className={styles.rowWrapper}>
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={expandedId === uid}
                  className={`${styles.tableRow} ${styles.clickableRow}`}
                  onClick={() => toggleExpanded(uid)}
                  onKeyDown={(e) => handleKeyToggle(e, uid)}
                >
                  <div className={styles.colTime}>{h.timeAtStation || '—'}</div>
                  <div className={styles.colFrom}>{mode === 'depart' ? (h.terminus || (Array.isArray(h.stops) && h.stops[h.stops.length-1] && (h.stops[h.stops.length-1].station_name || h.stops[h.stops.length-1].station_code)) || '') : (h.origin || (h.stops && h.stops[0] && h.stops[0].station_name) || '')}</div>
                  <div className={styles.colMode}><wcs-mat-icon icon="train" size="s" style={{ color: '#0b7d48' }}></wcs-mat-icon> {h.modeLabel}</div>
                  <div className={styles.colPlatform}>{h.voie || h.platform || h.platforme || '-'}</div>
                </div>

                {expandedId === uid && (
                  <div className={styles.accordionContent}>
                    <div className={styles.accordionHeader}>
                      <h3>Liste des gares</h3>
                      <div className={styles.accordionSub}>Opéré par SNCF Voyageurs - {h.numero_train || ''}</div>
                    </div>
                    <div className={styles.stopsHeader}>
                      <div className={styles.stopHeadTime}>Départ</div>
                      <div className={styles.stopHeadTimeline}></div>
                      <div className={styles.stopHeadName}>Gare</div>
                      <div className={styles.stopHeadPlatform}>Voie</div>
                    </div>
                     <div className={styles.stopsList}>
                      {Array.isArray(h.stops) && h.stops.length > 0 ? (() => {
                        const stops = buildStopsForAccordion(h);
                        return stops.map((s, si) => (
                           <div key={si} className={styles.stopRow}>
                             <div className={styles.stopTime}>{s.depart_time || s.arrivee_time || '—'}</div>
                             <div className={styles.timeline}><span className={styles.dot} aria-hidden></span></div>
                             <div className={styles.stopName}>{stationNameById(s.station_id, s.station_name || s.nom || '', s.station_code)}</div>
                             <div className={styles.stopPlatform}>{s.voie || s.platform || s.platforme || '-'}</div>
                           </div>
                         ));
                       })() : (
                         <div style={{ padding: '8px 0', color: '#555' }}>Aucune information d'arrêts disponible pour cet horaire.</div>
                       )}
                     </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Separator + tomorrow's schedules */}
          {!loading && !error && tomorrowList.length > 0 && (
            <>
              <div className={styles.dateDivider} style={{ padding: '12px 18px', fontWeight:700, color:'#333', borderTop: '2px solid var(--yellow)' }}>{formatDaySeparatorLabel(1)}</div>
              {tomorrowList.map((h, idx) => {
                const uid = h.id != null ? `h-${h.id}` : `tom-${idx}`;
                return (
                  <div key={uid} className={styles.rowWrapper}>
                    <div
                      role="button"
                      tabIndex={0}
                      aria-expanded={expandedId === uid}
                      className={`${styles.tableRow} ${styles.clickableRow}`}
                      onClick={() => toggleExpanded(uid)}
                      onKeyDown={(e) => handleKeyToggle(e, uid)}
                    >
                      <div className={styles.colTime}>{h.timeAtStation || '—'}</div>
                      <div className={styles.colFrom}>{mode === 'depart' ? (h.terminus || (Array.isArray(h.stops) && h.stops[h.stops.length-1] && (h.stops[h.stops.length-1].station_name || h.stops[h.stops.length-1].station_code)) || '') : (h.origin || (h.stops && h.stops[0] && h.stops[0].station_name) || '')}</div>
                      <div className={styles.colMode}><wcs-mat-icon icon="train" size="s" style={{ color: '#0b7d48' }}></wcs-mat-icon> {h.modeLabel}</div>
                      <div className={styles.colPlatform}>{h.voie || h.platform || h.platforme || '-'}</div>
                    </div>

                    {expandedId === uid && (
                      <div className={styles.accordionContent}>
                        <div className={styles.accordionHeader}>
                          <h3>Liste des gares</h3>
                          <div className={styles.accordionSub}>Opéré par SNCF Voyageurs - {h.numero_train || ''}</div>
                        </div>
                        <div className={styles.stopsHeader}>
                          <div className={styles.stopHeadTime}>Départ</div>
                          <div className={styles.stopHeadTimeline}></div>
                          <div className={styles.stopHeadName}>Gare</div>
                          <div className={styles.stopHeadPlatform}>Voie</div>
                        </div>
                        <div className={styles.stopsList}>
                          {Array.isArray(h.stops) && h.stops.length > 0 ? (() => {
                            const stops = buildStopsForAccordion(h);
                            return stops.map((s, si) => (
                                <div key={si} className={styles.stopRow}>
                                  <div className={styles.stopTime}>{s.depart_time || s.arrivee_time || '—'}</div>
                                  <div className={styles.timeline}><span className={styles.dot} aria-hidden></span></div>
                                  <div className={styles.stopName}>{stationNameById(s.station_id, s.station_name || s.nom || '', s.station_code)}</div>
                                  <div className={styles.stopPlatform}>{s.voie || s.platform || s.platforme || '-'}</div>
                                </div>
                             ));
                           })() : (
                             <div style={{ padding: '8px 0', color: '#555' }}>Aucune information d'arrêts disponible pour cet horaire.</div>
                           )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

        </div>

      </main>
    </div>
  );
}
