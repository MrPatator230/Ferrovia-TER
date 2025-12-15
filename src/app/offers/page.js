"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './offers.module.css';
import InfoBanner from '../../components/InfoBanner';
import Header from '../../components/Header';
import NavigationBar from '../../components/NavigationBar';
import StopsModal from '../../components/StopsModal';

function decodeSearch(search) {
  try {
    const s = decodeURIComponent(search || '');
    return JSON.parse(s);
  } catch (e) {
    return null;
  }
}

export default function OffersPage() {
  const params = useSearchParams();
  const searchQ = params.get('search');
  const obj = useMemo(() => decodeSearch(searchQ), [searchQ]);
  const [openIdx, setOpenIdx] = useState(null);

  // Offers loaded from DB
  const [offers, setOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [errorOffers, setErrorOffers] = useState('');
  // modal state for stops
  const [stopsModalOpen, setStopsModalOpen] = useState(false);
  const [stopsModalData, setStopsModalData] = useState({ from: null, to: null, stops: [] });

  // Charger les offres lorsque la query string 'search' change
  useEffect(() => {
    let mounted = true;
    async function loadOffers() {
      setLoadingOffers(true);
      setErrorOffers('');
      try {
        // Charger depuis la nouvelle API serveur qui applique les filtres côté Supabase
        // `searchQ` provient directement des search params et est déjà encodé dans l'URL.
        const url = `/api/offers${searchQ ? '?search=' + searchQ : ''}`;
        const res = await fetch(url);
        if (!res.ok) {
          const t = await res.text().catch(() => null);
          if (mounted) setErrorOffers(t || `HTTP ${res.status}`);
          setLoadingOffers(false);
          return;
        }
        const json = await res.json();
        if (mounted) setOffers(Array.isArray(json) ? json : []);
      } catch (e) {
        console.error('Erreur chargement offres', e);
        if (mounted) setErrorOffers(e && e.message ? e.message : 'Erreur réseau');
      } finally {
        if (mounted) setLoadingOffers(false);
      }
    }

    loadOffers();
    return () => { mounted = false; };
  }, [searchQ]);

  return (
    <>
      <InfoBanner />
      <Header />
      <NavigationBar />

      <main className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.title}>Sélectionner votre billet</h1>
          <div className={styles.grid}>
            <div className={styles.list}>
              <div className={styles.modesRow}>
                <span className={styles.modesIcon}><wcs-mat-icon icon="train" size="s"></wcs-mat-icon></span>
                <span className={styles.modesLabel}>Modes de transport</span>
              </div>
              <div className={styles.dateRow}>
                <span className={styles.dateIcon}><wcs-mat-icon icon="event" size="s"></wcs-mat-icon></span>
                <span className={styles.dateLabel}>{obj?.depart?.date ? new Date(obj.depart.date).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' }) : ''}</span>
              </div>

              {loadingOffers && <div style={{ padding: 12, color: '#666' }}>Chargement des offres…</div>}
              {errorOffers && <div style={{ padding: 12, color: '#b00020' }}>Erreur: {errorOffers}</div>}
              {!loadingOffers && !errorOffers && offers.length === 0 && (
                <div style={{ padding: 12, color: '#666' }}>Aucune offre trouvée pour cette recherche.</div>
              )}

              {!loadingOffers && !errorOffers && offers.map((o,i) => (
                <div key={i} className={styles.offer}>
                  <div className={styles.times}>
                    <div className={styles.leftTime}>
                      <div className={styles.clock}>{o.depart}</div>
                      <div className={styles.station}>{o.from}</div>
                    </div>
                    <div className={styles.duration}>
                      <span className={styles.durationLabel}>{o.duration}</span>
                    </div>
                    <div className={styles.rightTime}>
                      <div className={styles.clock}>{o.arrive}</div>
                      <div className={styles.station}>{o.to}</div>
                    </div>
                  </div>
                  <div className={styles.actionsRow}>
                    <button
                      className={styles.details}
                      onClick={() => setOpenIdx(openIdx === i ? null : i)}
                      aria-expanded={openIdx === i}
                      aria-controls={`details-${i}`}
                    >
                      Détails ▾
                    </button>
                    <div className={styles.badge}>{o.sold ? 'Vendu' : 'Non vendu sur ce site'}</div>
                  </div>

                  {openIdx === i && (
                    <div id={`details-${i}`} className={styles.accordionContent}>
                      {o.segments && o.segments.length > 0 ? (
                        o.segments.map((s, idx) => (
                          <React.Fragment key={idx}>
                            <div className={styles.segment}>
                              <div className={styles.segmentLeft}>
                                <div className={styles.time}>{s.depart}</div>
                                <div className={styles.smallDur}>{s.duration}</div>
                                <div className={styles.time}>{s.arrive}</div>
                              </div>
                              <div className={styles.segmentRight}>
                                <span
                                  className={styles.trainLink}
                                  role="link"
                                  tabIndex={0}
                                  onClick={() => {
                                    // open modal with stops from this segment or parent offer
                                    const stopsList = Array.isArray(s.stops) && s.stops.length > 0 ? s.stops : (Array.isArray(o.stops) ? o.stops : []);
                                    // try to trim until destination match (by station_name or station_code)
                                    let trimmed = stopsList;
                                    if (stopsList && stopsList.length > 0) {
                                      const dest = (o.to || '').toString().toLowerCase().trim();
                                      const idx = stopsList.findIndex(st => {
                                        const name = (st.station_name || '').toString().toLowerCase().trim();
                                        const code = (st.station_code || '').toString().toLowerCase().trim();
                                        return (dest && (name === dest || code === dest));
                                      });
                                      if (idx >= 0) trimmed = stopsList.slice(0, idx + 1);
                                    }
                                    setStopsModalData({ from: o.from || '', to: o.to || '', stops: trimmed, fromTime: o.depart || null, toTime: o.arrive || null });
                                    setStopsModalOpen(true);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      const stopsList = Array.isArray(s.stops) && s.stops.length > 0 ? s.stops : (Array.isArray(o.stops) ? o.stops : []);
                                      let trimmed = stopsList;
                                      if (stopsList && stopsList.length > 0) {
                                        const dest = (o.to || '').toString().toLowerCase().trim();
                                        const idx = stopsList.findIndex(st => {
                                          const name = (st.station_name || '').toString().toLowerCase().trim();
                                          const code = (st.station_code || '').toString().toLowerCase().trim();
                                          return (dest && (name === dest || code === dest));
                                        });
                                        if (idx >= 0) trimmed = stopsList.slice(0, idx + 1);
                                      }
                                      setStopsModalData({ from: o.from || '', to: o.to || '', stops: trimmed, fromTime: o.depart || null, toTime: o.arrive || null });
                                      setStopsModalOpen(true);
                                    }
                                  }}
                                >
                                  {s.trainName}
                                </span>
                                <div className={styles.trainMeta}>{s.ticketType}</div>
                                <div className={styles.trainDestination}>Destination: {s.destination}</div>
                                <div className={styles.operator}>Opéré par {s.operator}</div>
                                <div className={styles.trainImage} aria-hidden="true"> </div>
                                <div className={styles.trainDesc}>Un train "{s.trainType}"<br />{s.carriages} voitures - {s.places} places</div>
                                <div className={styles.icons}>{s.bike ? 'À bord : 🚲' : ''}</div>
                              </div>
                            </div>

                            {s.waitAfter && (
                              <div className={styles.transferBetween}>
                                <span className={styles.transferIcon} aria-hidden>🟢</span>
                                <span>Correspondance {s.waitAfter} d'attente</span>
                              </div>
                            )}
                          </React.Fragment>
                        ))
                      ) : (
                        <div className={styles.accordionEmpty}>Pas de détails disponibles</div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <div className={styles.nextDay}>Jour suivant ›</div>
            </div>

            <aside className={styles.summary}>
              <div className={styles.summaryCard}>
                <div>Aller le {obj?.depart?.date ? new Date(obj.depart.date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' }) : ''} à {obj?.depart?.time || ''}</div>
                <div style={{ marginTop: 8 }}>{obj?.from?.nom || ''} → {obj?.to?.nom || ''}</div>
                <div style={{ marginTop: 12 }}>{obj?.passengers?.count || 1} voyageur, 30 ans, sans carte</div>
                <Link href="/se-deplacer/horaires" className={styles.modify}>Modifier ma recherche</Link>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {stopsModalOpen && (
        <StopsModal
          open={stopsModalOpen}
          onClose={() => setStopsModalOpen(false)}
          from={stopsModalData.from}
          to={stopsModalData.to}
          stops={stopsModalData.stops}
          fromTime={stopsModalData.fromTime}
          toTime={stopsModalData.toTime}
        />
      )}
    </>
  );
}

