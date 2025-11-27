"use client";
import { useState } from 'react';
import styles from './NextDepartures.module.css';

export default function NextDepartures() {
  const [selectedStation, setSelectedStation] = useState('Dijon Ville');

  const stations = ['Dijon Ville', 'Besançon Viotte', 'Laroche - Migennes'];

  const departures = [
    {
      time: '22:01',
      destination: 'Mulhouse',
      vehicleLine: 'Train TGV INOUI 6715',
      platform: '-'
    },
    {
      time: '22:09',
      destination: 'Besançon Viotte',
      vehicleLine: 'Train MOBIGO 894269',
      platform: '-'
    },
    {
      time: '22:12',
      destination: 'Chalon-sur-Saône',
      vehicleLine: 'Train MOBIGO 891429',
      platform: '-'
    },
    {
      time: '05:09',
      destination: 'Besançon Viotte',
      vehicleLine: 'Train MOBIGO 891429',
      platform: '2'
    }
  ];

  return (
    <div className={`card ${styles.card}`}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Prochains départs</h2>
          <div className={styles.subtitle}>en gare de</div>
        </div>
      </div>

      {/* Station pills : déplacé au-dessus de la barre jaune */}
      <div className={styles.stationPills}>
        <div className={styles.stationPillsInner}>
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
        {departures.map((d, idx) => (
          <div key={idx}>
            {/* Insert a date separator before the last item to match the image */}
            {idx === 3 && (
              <div className={styles.dateDivider}>
                <div className={styles.dateText}>Vendredi 28 novembre</div>
              </div>
            )}

            <div className={styles.departureItem}>
              <div className={styles.departureTime}>{d.time}</div>

              <div className={styles.departureDetails}>
                <div className={styles.departureDestinationRow}>
                  <div className={styles.departureDestination}>{d.destination}</div>
                  {/* optional small action (e.g., luggage) on the right of the destination */}
                </div>

                <div className={styles.vehicleInfo}>
                  <wcs-mat-icon icon="train" size="s" style={{ color: '#0b7d48' }}></wcs-mat-icon>
                  <div className={styles.vehicleText}>{d.vehicleLine}</div>
                </div>
              </div>

              {/* Platform column: if platform is '-' show a small suitcase button like on the image */}
              <div className={styles.platformColumn}>
                {d.platform === '-' ? (
                  <div className={styles.platform}>{d.platform}</div>
                ) : (
                  <div className={styles.platformWithIcon}>
                    <div className={styles.platform}>{d.platform}</div>

                  </div>
                )}
              </div>

              <div className={styles.chevron}>
                <wcs-mat-icon icon="chevron_right" size="m"></wcs-mat-icon>
              </div>
            </div>

            {/* Insert an information blue ribbon after certain items to match the design */}
            { (idx === 1 || idx === 2) && (
              <div className={styles.infoRibbon}>
                {/* Triangle pointer on the left */}
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
        ))}

      </div>

      {/* Footer link */}
      <div className={styles.footer}>
        <button className={styles.footerButton}>Voir plus d'horaires &nbsp; <wcs-mat-icon icon="chevron_right" size="s"></wcs-mat-icon></button>
      </div>
    </div>
  );
}