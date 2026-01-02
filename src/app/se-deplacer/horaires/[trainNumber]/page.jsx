"use client";
import React, { useEffect, useState } from 'react';
import Header from '../../../../components/Header';
import NavigationBar from '../../../../components/NavigationBar';
import InfoBanner from '../../../../components/InfoBanner';
import styles from './page.module.css';
import { useParams } from 'next/navigation';

export default function TrainDetailPage() {
  const params = useParams();
  const trainNumber = params?.trainNumber || '';
  return <TrainDetailCore key={trainNumber} trainNumber={trainNumber} />;
}

function TrainDetailCore({ trainNumber }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sillon, setSillon] = useState(null);
  // station maps: code -> name, id -> name
  const [stationCodeMap, setStationCodeMap] = useState({});
  const [stationIdMap, setStationIdMap] = useState({});

  // Reset immediately when trainNumber changes to avoid stale UI
  useEffect(() => {
    setSillon(null);
    setError('');
    setLoading(true);
  }, [trainNumber]);

  // load stations once to resolve codes/ids to names
  useEffect(() => {
    let mounted = true;
    async function loadStations() {
      try {
        const r = await fetch('/api/admin/stations', { cache: 'no-store' });
        if (!r.ok) return;
        const data = await r.json();
        if (!mounted || !Array.isArray(data)) return;
        const codeMap = {};
        const idMap = {};
        data.forEach(s => {
          if (!s) return;
          const name = (s.nom || s.name || '').toString();
          if (s.code) codeMap[String(s.code).toUpperCase()] = name;
          if (s.id != null) idMap[String(s.id)] = name;
        });
        setStationCodeMap(codeMap);
        setStationIdMap(idMap);
      } catch (e) {
        // ignore station load errors; we'll fallback gracefully
        console.warn('Impossible de charger stations', e);
      }
    }
    loadStations();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const { signal } = controller;
    async function load() {
      setLoading(true);
      setError('');
      setSillon(null);
      try {
        // try server-side filtered endpoint first (if supported)
        let res = null;
        try {
          res = await fetch(`/api/admin/horaires?numero_train=${encodeURIComponent(trainNumber)}`, { cache: 'no-store', signal });
          if (res && res.ok) {
            const dataFiltered = await res.json();
            // if server returned an array and length>0, use it
            if (Array.isArray(dataFiltered) && dataFiltered.length > 0) {
              const first = dataFiltered[0];
              if (mounted) { setSillon(first); setLoading(false); }
              return;
            }
            // else fall through to fetching all
          }
        } catch (e) {
          if (e && e.name === 'AbortError') return; // fetch was aborted, exit silently
          // ignore and fallback to full fetch
          res = null;
        }

        const r2 = await fetch('/api/admin/horaires', { cache: 'no-store', signal });
        if (!r2.ok) {
          const text = await r2.text();
          const msg = text || `HTTP ${r2.status}`;
          if (mounted) setError(msg);
          setLoading(false);
          return;
        }
        const data = await r2.json();
        let list = [];
        if (Array.isArray(data)) list = data;
        else if (data && Array.isArray(data.horaires)) list = data.horaires;
        else if (data && Array.isArray(data.mapped)) list = data.mapped;

        // find matching by numero_train (string comparison, trimmed)
        const target = String(trainNumber || '').trim();
        const normalize = v => String(v || '').toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const normalizedTarget = normalize(target);
        if (!target) {
          if (mounted) setError('Numéro de train manquant');
          return;
        }

        const found = list.find(h => {
          if (!h) return false;
          const num = h.numero_train ?? h.numero ?? h.train ?? null;
          if (num == null) return false;
          const n = normalize(num);
          // exact match or partial containment
          return n === normalizedTarget || n.includes(normalizedTarget) || normalizedTarget.includes(n);
        });

        if (!found) {
          if (mounted) setError('Aucun sillon trouvé pour ce numéro');
        } else {
          if (mounted) setSillon(found);
        }
      } catch (e) {
        console.error('Erreur chargement sillon', e);
        if (e && e.name === 'AbortError') {
          // aborted: don't set error
        } else {
          if (mounted) setError(e && e.message ? e.message : 'Erreur réseau');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; controller.abort(); };
  }, [trainNumber]);

  // helper to format time like 'HH:mm' even if 'HH:mm:ss'
  function fmtTime(t) {
    if (!t) return '';
    const s = String(t);
    const m = s.match(/(\d{2}:\d{2})/);
    if (m) return m[1];
    return s;
  }

  // helper to build stops from sillon data
  function buildStops(h) {
    if (!h) return [];

    const resolveName = (rawName, code, id) => {
      if (rawName) return String(rawName);
      if (code) {
        const key = String(code).toUpperCase();
        if (stationCodeMap && stationCodeMap[key]) return stationCodeMap[key];
      }
      if (id != null) {
        const key = String(id);
        if (stationIdMap && stationIdMap[key]) return stationIdMap[key];
      }
      return '';
    };

    const normalize = (s) => (s || '').toString().trim().toLowerCase();

    // build origin
    const originName = resolveName(h.depart_station_name || (h.depart && h.depart.station_name) || null, h.depart_station_code || h.depart_station_code || (h.depart && h.depart.station_code), h.depart_station_id || (h.depart && h.depart.station_id));
    const originTime = fmtTime(h.depart_time || (h.depart && (h.depart.time || h.depart.depart_time)) || '');
    const origin = { time: originTime || '', name: originName || '', extra: null, platform: h.depart_voies || h.depart_platform || h.depart_platforme || h.depart_voies_attribuees || null };

    // build destination
    const destName = resolveName(h.arrivee_station_name || (h.arrivee && h.arrivee.station_name) || null, h.arrivee_station_code || h.arrivee_station_code || (h.arrivee && h.arrivee.station_code), h.arrivee_station_id || (h.arrivee && h.arrivee.station_id));
    const destTime = fmtTime(h.arrivee_time || (h.arrivee && (h.arrivee.time || h.arrivee.arrivee_time)) || '');
    const destination = { time: destTime || '', name: destName || '', extra: null, platform: h.arrivee_voies || h.arrivee_platform || h.arrivee_platforme || null };

    // build middle stops from h.stops if present
    let middle = [];
    if (Array.isArray(h.stops) && h.stops.length > 0) {
      middle = h.stops.map(s => {
        const name = resolveName(s.station_name || s.nom || (s.station && (s.station.nom || s.station.name)) || null, s.station_code || s.code || (s.station && s.station.code), s.station_id != null ? s.station_id : (s.station && s.station.id));
        return {
          time: fmtTime(s.depart_time || s.arrivee_time || s.time || ''),
          name: name || '',
          extra: s._change && (s._change.temps || s._change.cause) ? (s._change.temps || s._change.cause) : (s.stop_duration || s.duree || null),
          platform: s.voie || s.platform || s.platforme || s.voie_attribuee || null,
        };
      }).filter(Boolean);
    }

    // remove duplicates: if first middle equals origin or last equals destination, drop them
    const results = [];

    const normOrigin = normalize(origin.name);
    const normDest = normalize(destination.name);

    if (origin.name) results.push(origin);

    middle.forEach(m => {
      const nm = normalize(m.name);
      if (nm && nm !== normOrigin && nm !== normDest) {
        results.push(m);
      }
    });

    if (destination.name) results.push(destination);

    // if everything empty fallback to previous simple behavior
    if (results.length === 0) {
      // fallback: try depart/arrive raw
      const arr = [];
      if (h.depart_station_name || h.depart_time) arr.push({ time: fmtTime(h.depart_time || ''), name: h.depart_station_name || '', extra: null });
      if (h.arrivee_station_name || h.arrivee_time) arr.push({ time: fmtTime(h.arrivee_time || ''), name: h.arrivee_station_name || '', extra: null });
      return arr;
    }

    return results;
  }

  // derive header info from sillon or fallback to trainNumber
  const headerInfo = sillon ? {
    operator: sillon.operateur || sillon.operator || 'MOBIGO',
    number: sillon.numero_train || trainNumber || '',
    date: (sillon.date || sillon.depart_date || (sillon.depart_time ? new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '')),
    reservation: sillon.reservation || 'Sans réservation',
    bike: (sillon.transport_velo || sillon.bike || 'Transport de vélo gratuit'),
  } : { operator: 'MOBIGO', number: trainNumber, date: '—', reservation: '—', bike: '—' };

  // resolve origin and destination names using sillon fields and station maps
  function resolveNameFromSillonField(nameField, codeField, idField) {
    if (nameField) return String(nameField);
    if (codeField) {
      const key = String(codeField).toUpperCase();
      if (stationCodeMap && stationCodeMap[key]) return stationCodeMap[key];
    }
    if (idField != null) {
      const key = String(idField);
      if (stationIdMap && stationIdMap[key]) return stationIdMap[key];
    }
    return '';
  }

  const originName = sillon ? resolveNameFromSillonField(sillon.depart_station_name || sillon.depart_station || null, sillon.depart_station_code || sillon.depart_station_code, sillon.depart_station_id) : '';
  const destinationName = sillon ? resolveNameFromSillonField(sillon.arrivee_station_name || sillon.arrivee_station || null, sillon.arrivee_station_code || sillon.arrivee_station_code, sillon.arrivee_station_id) : '';

  const stops = buildStops(sillon);

  return (
    <div>
      <Header />
      <NavigationBar />
      <InfoBanner />

      <div className={styles.hero}></div>

      <main className={styles.container}>
        <section className={styles.cardHeader}>
          <div className={styles.cardInner}>
            <div className={styles.cardHeaderRow}>
              <div className={styles.cardLeft}>
                <wcs-mat-icon icon="train" size="l" style={{ color: '#fff', marginRight: 8 }}></wcs-mat-icon>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 20, color: '#fff' }}>Train {headerInfo.operator} N°{headerInfo.number}</div>
                  <div className={styles.routeText}>{(originName || '—')} <span style={{ opacity: 0.85 }}>→</span> {(destinationName || '—')}</div>
                </div>
              </div>
              <div className={styles.cardRight}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500, fontSize: 17, color: '#fff' }}>
                  <wcs-mat-icon icon="event" size="m" style={{ marginRight: 2, color: '#fff' }}></wcs-mat-icon>
                  Départ le {headerInfo.date}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500, fontSize: 17, color: '#fff' }}>
                  <wcs-mat-icon icon="lock_open" size="m" style={{ marginRight: 2, color: '#fff' }}></wcs-mat-icon>
                  {headerInfo.reservation}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500, fontSize: 17, color: '#fff' }}>
                  <wcs-mat-icon icon="device_hub" size="m" style={{ marginRight: 2, color: '#fff' }}></wcs-mat-icon>
                  {stops.length - 1} arrêt
                </span>
              </div>
            </div>
            <div className={styles.bike}>
              <wcs-mat-icon icon="directions_bike" size="m" style={{ marginRight: 2, color: '#eaffd0' }}></wcs-mat-icon>
              {headerInfo.bike}
            </div>
          </div>
        </section>

        <section className={styles.timelineSection}>
          <div className={styles.timelineInner}>
            {loading && <div style={{ padding: 12, color: '#666' }}>Chargement du sillon…</div>}
            {error && <div style={{ padding: 12, color: '#b00020' }}>{error}</div>}
            {!loading && !error && stops.length === 0 && (
              <div style={{ padding: 12, color: '#666' }}>Aucun arrêt disponible pour ce sillon.</div>
            )}

            {!loading && !error && stops.map((s, i) => (
              <div key={`${(s.name||'')}-${(s.time||'')}-${i}`} className={styles.stopRow}>
                <div className={styles.timePill}>{s.time || '—'}</div>
                <div className={styles.timelineCol}>
                  <div className={styles.timelineDot}></div>
                </div>
                <div className={styles.stopNameCol}>
                  <div className={styles.stopName}>{s.name || '—'}</div>
                  {s.extra ? (<div className={styles.stopExtra}>{s.extra}</div>) : null}
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
