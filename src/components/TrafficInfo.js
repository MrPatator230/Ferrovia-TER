"use client";
import { useState } from 'react';
import styles from './TrafficInfo.module.css';

export default function TrafficInfo() {
  const [currentPage, setCurrentPage] = useState(1);

  const nextPage = () => setCurrentPage((p) => (p % 3) + 1);
  const prevPage = () => setCurrentPage((p) => (p - 2 + 3) % 3 + 1);

  return (
    <wcs-card className={`card ${styles.trafficCard}`}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.headerTitle}>Info trafic</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className={styles.iconCircle} aria-hidden="true">
            <wcs-mat-icon icon="info" size="s" style={{ color: '#fff', fontSize: 18 }}></wcs-mat-icon>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.sectionTitle}>Information</div>

        <div className={styles.infoBox}>
          <div className={styles.infoTitle}>RESERVATION VELO OBLIGATOIRE</div>
          <div className={styles.infoText}>La réservation d'un accès vélo est obligatoire, gratuite et</div>
        </div>

        {/* Separator with centered pill button */}
        <div className={styles.separator}>
          <div className={styles.separatorLine} />
          <div className={styles.separatorButton}>
            <button className={styles.detailButton}>Détail <span style={{ color: '#0b7d48', fontWeight: 700, fontSize: '1rem' }}>+</span></button>
          </div>
        </div>

        {/* Pagination */}
        <div className={styles.pagination}>
          <button onClick={prevPage} aria-label="Précédent" className={styles.paginationButton}>
            <wcs-mat-icon icon="chevron_left" size="s"></wcs-mat-icon>
          </button>

          {[1,2,3].map((i) => (
            <div
              key={i}
              className={`${styles.pageIndicator} ${currentPage === i ? styles.pageIndicatorActive : styles.pageIndicatorInactive}`}
            >
              {i}
            </div>
          ))}

          <button onClick={nextPage} aria-label="Suivant" className={styles.paginationButton}>
            <wcs-mat-icon icon="chevron_right" size="s"></wcs-mat-icon>
          </button>
        </div>
      </div>
    </wcs-card>
  );
}
