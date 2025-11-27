"use client";
import { useState, useEffect, useRef } from 'react';
import styles from './SearchForm.module.css';

export default function SearchForm() {
  const [departureStation, setDepartureStation] = useState('');
  const [arrivalStation, setArrivalStation] = useState('');
  const cardRef = useRef(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const updateSize = (width) => {
      let size = 'large';
      if (width <= 480) size = 'small';
      else if (width >= 481 && width <= 899) size = 'medium';
      else size = 'large';
      el.setAttribute('data-container-size', size);
    };

    // Initial measure
    updateSize(el.getBoundingClientRect().width);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect ? entry.contentRect.width : entry.target.getBoundingClientRect().width;
        updateSize(w);
      }
    });

    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  return (
    <wcs-card ref={cardRef} className={styles.searchCard}>
      {/* Swap button top-right */}
      <div style={{ position: 'absolute', top: 12, right: 12 }}>
        <wcs-button mode="clear" shape="square" style={{ padding: 4 }} aria-label="Échanger">
          <wcs-mat-icon icon="swap_vert" size="m" style={{ color: '#0b7d48' }}></wcs-mat-icon>
        </wcs-button>
      </div>

      <div className={styles.containerColumn}>
        {/* Gare de départ */}
        <label>
          <div className={styles.field}>
            <wcs-mat-icon className={styles.iconFix} icon="location_on" size="m" style={{ color: '#0b7d48' }}></wcs-mat-icon>
            <input
              value={departureStation}
              onChange={(e) => setDepartureStation(e.target.value)}
              placeholder="Gare de départ"
            />
          </div>
        </label>

        {/* Gare d'arrivée */}
        <label>
          <div className={styles.field}>
            <wcs-mat-icon className={styles.iconFix} icon="location_on" size="m" style={{ color: '#0b7d48' }}></wcs-mat-icon>
            <input
              value={arrivalStation}
              onChange={(e) => setArrivalStation(e.target.value)}
              placeholder="Gare d'arrivée"
            />
          </div>
        </label>

        {/* Via link */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className={styles.btnLink}>+ Via</button>
        </div>

        {/* Aller row (date + time) */}
        <div className={styles.rowSplit}>
          <div className="left">
            <wcs-mat-icon icon="event" size="m" style={{ color: '#0b7d48' }}></wcs-mat-icon>
            <div>
              <div className={styles.smallText}>Aller</div>
              <div className={styles.bold}>Mer. 26 nov.</div>
            </div>
          </div>
          <div className={styles.divider} aria-hidden="true"></div>
          <div className={styles.timeCell}>{'15:00'}</div>
        </div>

        {/* Retour row */}
        <div className={styles.rowSplit}>
          <div className="left">
            <wcs-mat-icon icon="event" size="m" style={{ color: '#0b7d48' }}></wcs-mat-icon>
            <div>
              <div className={styles.smallText}>Retour (optionnel)</div>
            </div>
          </div>
          <div className={styles.divider} aria-hidden="true"></div>
          <div className={styles.timeCell} style={{ color: '#9aa0a6' }}>{'--:--'}</div>
        </div>

        {/* Voyageurs */}
        <div className={styles.rowSplit + ' ' + styles.noBorder} style={{ justifyContent: 'space-between', gap: 12, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <wcs-mat-icon icon="person" size="m" style={{ color: '#0b7d48' }}></wcs-mat-icon>
            <div style={{ fontSize: '0.875em' }}>1 Voyageur, Sans carte</div>
          </div>
          <button type="button" style={{ border: 'none', background: 'transparent', color: '#0b7d48', fontSize: 20, cursor: 'pointer' }}>+</button>
        </div>

        {/* Bouton rechercher */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" style={{
            background: '#0b7d48',
            color: 'white',
            border: 'none',
            padding: '12px 20px',
            borderRadius: 8,
            fontWeight: 700,
            cursor: 'pointer'
          }}>Rechercher</button>
        </div>
      </div>
    </wcs-card>
  );
}
