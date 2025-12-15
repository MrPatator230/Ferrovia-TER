"use client";
import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './offers.module.css';
import InfoBanner from '../../components/InfoBanner';
import Header from '../../components/Header';
import NavigationBar from '../../components/NavigationBar';

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
  const obj = decodeSearch(searchQ);
  const [openIdx, setOpenIdx] = useState(null);

  // mock offers based on search (for now show some static rows)
  const offers = [
    {
      depart: '06:33', from: obj?.from?.nom || 'Gilley', to: obj?.to?.nom || 'Bourg-en-Bresse', arrive: '10:41', duration: '4h08', sold: false,
      segments: [
        { depart: '06:33', from: 'Gilley', arrive: '09:43', to: 'Besançon Viotte', duration: '1h06', trainName: 'Train MOBIGO 18106', ticketType: 'Billet direct', destination: 'Besançon Viotte', operator: 'SNCF Voyageurs - 1187', trainType: 'AGC', carriages: 3, places: 163, bike: true, waitAfter: '1h08' },
        { depart: '10:51', from: 'Besançon Viotte', arrive: '11:59', to: 'Lons-le-Saunier', duration: '1h08', trainName: 'Train TER 895961', ticketType: 'Billet direct', destination: 'Lons-le-Saunier', operator: 'SNCF Voyageurs - 1187', trainType: 'Regiolis', carriages: 4, places: 220, bike: true, waitAfter: '1h02' },
        { depart: '13:01', from: 'Lons-le-Saunier', arrive: '13:41', to: 'Bourg-en-Bresse', duration: '40 min', trainName: 'Train TER 895963', ticketType: 'Billet direct', destination: 'Bourg-en-Bresse', operator: 'SNCF Voyageurs - 1187', trainType: 'Regiolis', carriages: 4, places: 220, bike: true }
      ]
    },
    { depart: '08:37', from: obj?.from?.nom || 'Gilley', to: obj?.to?.nom || 'Bourg-en-Bresse', arrive: '13:41', duration: '5h04', sold: false, segments: [] },
    { depart: '12:37', from: obj?.from?.nom || 'Gilley', to: obj?.to?.nom || 'Bourg-en-Bresse', arrive: '16:41', duration: '4h04', sold: false, segments: [] },
    { depart: '17:38', from: obj?.from?.nom || 'Gilley', to: obj?.to?.nom || 'Bourg-en-Bresse', arrive: '21:41', duration: '4h03', sold: false, segments: [] }
  ];

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
              {offers.map((o,i) => (
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
                                <a className={styles.trainLink}>{s.trainName}</a>
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
    </>
  );
}
