"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './NextDepartures.module.css';

export default function NextDepartures() {
  const router = useRouter();
  const [selectedStation, setSelectedStation] = useState('');
  const [stations, setStations] = useState([]);
  const [departures, setDepartures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // si stations est mis à jour, sélectionner la première gare si aucune sélection actuelle
  useEffect(() => {
    if (!selectedStation && stations && stations.length > 0) {
      setSelectedStation(stations[0]);
    }
  }, [stations, selectedStation]);

  // Helper: retourne true si l'horaire (format 'HH:mm' ou 'H:mm') n'est pas encore passé aujourd'hui
  function isTimeNotPassed(timeStr) {
    if (!timeStr) return false;
    const parts = String(timeStr).split(':').map((s) => s.trim());
    if (parts.length < 2) return false;
    const hh = Number(parts[0]);
    const mm = Number(parts[1]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return false;

    const now = new Date();
    const compare = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
    return compare >= now;
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/admin/horaires', { cache: 'no-store' });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }
        const data = await res.json();
        let list = [];
        if (Array.isArray(data)) {
          list = data;
        } else if (data && Array.isArray(data.horaires)) {
          list = data.horaires;
        } else if (data && Array.isArray(data.fiches)) {
          list = data.fiches;
        } else {
          console.warn('Format inattendu depuis /api/admin/horaires', data);
          list = [];
        }

        if (mounted) {
          setDepartures(list);

          // extraire les noms de gares (depart_station_name) uniques
          const stationNames = Array.from(new Set(list.map((d) => (d && (d.depart_station_name || d.depart_station || d.depart_station_nom || d.departStation || '')).toString().trim()).filter(Boolean)));
          setStations(stationNames);

          // si aucune gare sélectionnée ou sélection invalide, définir la première gare disponible
          if (!selectedStation && stationNames.length > 0) {
            setSelectedStation(stationNames[0]);
          } else if (selectedStation && !stationNames.includes(selectedStation) && stationNames.length > 0) {
            setSelectedStation(stationNames[0]);
          }
        }
      } catch (e) {
        console.error('Erreur fetch /api/admin/horaires', e);
        if (mounted) {
          setError(e && e.message ? e.message : 'Erreur réseau');
          setDepartures([]);
          setStations([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtrer d'abord par gare sélectionnée (utilise depart_station_name renvoyé par l'API)
  const departuresByStation = departures.filter((d) => {
    if (!d) return false;
    const name = (d.depart_station_name || d.depart_station || d.depart_station_nom || d.departStation || '').toString().trim();
    return name === String(selectedStation).trim();
  });

  // Appliquer le filtre horaire
  let visibleDepartures = departuresByStation.filter((d) => isTimeNotPassed(d.depart_time || d.time || (d.stops && d.stops[0] && d.stops[0].depart_time)));

  // Trier par heure croissante
  visibleDepartures.sort((a, b) => {
    const ta = (a.depart_time || a.time || (a.stops && a.stops[0] && a.stops[0].depart_time) || '').toString();
    const tb = (b.depart_time || b.time || (b.stops && b.stops[0] && b.stops[0].depart_time) || '').toString();
    return ta.localeCompare(tb);
  });

  // Fallback : si aucun départ futur aujourd'hui n'est trouvé mais il existe des départs pour la gare,
  // on affiche ces départs (utile si la BDD contient des horaires passés pour test)
  const usedFallback = visibleDepartures.length === 0 && departuresByStation.length > 0;
  if (usedFallback) {
    visibleDepartures = departuresByStation.slice().sort((a, b) => {
      const ta = (a.depart_time || a.time || '').toString();
      const tb = (b.depart_time || b.time || '').toString();
      return ta.localeCompare(tb);
    });
  }

  // helper: create slug from station name (same logic as /se-deplacer/prochains-departs/[station]/page.js)
  function slugify(name) {
    if (!name) return '';
    return encodeURIComponent(String(name).toLowerCase().trim()
      .normalize('NFD').replace(/\p{Diacritic}/gu, '')
      .replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, ''));
  }

  function handleSeeMore() {
    if (selectedStation) {
      const slug = slugify(selectedStation);
      router.push(`/se-deplacer/prochains-departs/${slug}`);
    } else {
      // fallback to general horaires search
      router.push('/se-deplacer/horaires');
    }
  }

  return (
    <div className={`card ${styles.card}`}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Prochains départs</h2>
          <div className={styles.subtitle}>en gare de</div>
        </div>
      </div>

      {/* Station pills : construit dynamiquement */}
      <div className={styles.stationPills}>
        <div className={styles.stationPillsInner}>
          {stations.length === 0 && (
            <div style={{ color: '#777', fontSize: '0.9rem' }}>Aucune gare détectée</div>
          )}
          {stations.map((station) => (
            <button
              key={station}
              onClick={() => setSelectedStation(station)}
              className={`${styles.stationButton} ${selectedStation === station ? styles.stationButtonActive : styles.stationButtonInactive}`}
            >
              {station}
            </button>
          ))}
        </div>

        <button className={styles.moreButton} aria-label="See more stations">
          <wcs-mat-icon icon="chevron_right" size="m"></wcs-mat-icon>
        </button>
      </div>

      {/* Ligne fine jaune sous l'en-tête (placée après les pills) */}
      <div className={styles.headerDivider} aria-hidden="true"></div>

      {/* En-têtes de colonnes */}
      <div className={styles.tableHeader}>
        <div className={styles.colDeparture}>Départ</div>
        <div className={styles.colDestination}>Destination</div>
        <div className={styles.colPlatform}>Voie</div>
        <div className={styles.colSpacer} aria-hidden="true"></div>
      </div>

      {/* List of departures */}
      <div className={styles.departuresList}>
        {loading && <div style={{ padding: 12, color: '#666' }}>Chargement des horaires…</div>}
        {error && <div style={{ padding: 12, color: '#b00020' }}>Erreur: {error}</div>}

        {!loading && !error && visibleDepartures.length === 0 && departuresByStation.length === 0 && (
          <div style={{ padding: 12, color: '#666' }}>Aucun départ trouvé pour cette gare.</div>
        )}

        {!loading && !error && visibleDepartures.length > 0 && (
          visibleDepartures.map((d, idx) => (
            <div key={`${d.id || d.depart_station_name || idx}-${d.depart_time || d.time || idx}`}>
              <div className={styles.departureItem}>
                <div className={styles.departureTime}>{d.depart_time || d.time || (d.stops && d.stops[0] && d.stops[0].depart_time) || '—'}</div>

                <div className={styles.departureDetails}>
                  <div className={styles.departureDestinationRow}>
                    <div className={styles.departureDestination}>{d.arrivee_station_name || d.destination || (d.stops && d.stops[0] && d.stops[0].station_name) || ''}</div>
                    {/* optional small action (e.g., luggage) on the right of the destination */}
                  </div>

                  <div className={styles.vehicleInfo}>
                    <wcs-mat-icon icon="train" size="s" style={{ color: '#0b7d48' }}></wcs-mat-icon>
                    <div className={styles.vehicleText}>{d.numero_train || d.vehicleLine || d.type_train || ''}</div>
                  </div>
                </div>

                {/* Platform column: si voie fournie */}
                <div className={styles.platformColumn}>
                  {d.voie || d.platform || d.platforme || d.platform === '-' ? (
                    <div className={styles.platform}>{d.voie || d.platform || d.platforme || (d.platform === '-' ? '-' : '')}</div>
                  ) : (
                    <div className={styles.platform}>-</div>
                  )}
                </div>

                <div className={styles.chevron}>
                  <wcs-mat-icon icon="chevron_right" size="m"></wcs-mat-icon>
                </div>
              </div>

              {/* Optionnel: bande d'information après certains items */}
              { (idx === 1 || idx === 2) && (
                <div className={styles.infoRibbon}>
                  <div className={styles.infoTriangle} aria-hidden="true"></div>
                  <div className={styles.infoContent}>
                    <div className={styles.infoIcon}>
                      <wcs-mat-icon icon="info" size="s" style={{ color: '#0b84d6' }}></wcs-mat-icon>
                    </div>
                    <div className={styles.infoText}>Information</div>
                  </div>
                </div>
              ) }

            </div>
          ))
        )}

        {/* Fallback message si on affiche des horaires passés (fallback utilisé) */}
        {!loading && !error && usedFallback && (
          <div style={{ padding: '8px 12px', color: '#999', fontSize: '0.875rem' }}>
            Aucun départ restant aujourd'hui — affichage des prochains départs disponibles.
          </div>
        )}

      </div>

      {/* Footer link */}
      <div className={styles.footer}>
        <button className={styles.footerButton} onClick={handleSeeMore}>Voir plus d'horaires &nbsp; <wcs-mat-icon icon="chevron_right" size="s" ></wcs-mat-icon></button>
      </div>
    </div>
  );
}