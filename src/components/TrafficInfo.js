"use client";
import React, { useState, useEffect, useRef } from 'react';
import styles from './TrafficInfo.module.css';

export default function TrafficInfo() {
  // liste des infos récupérées depuis l'API
  const [infos, setInfos] = useState([]);
  // index courant (0-based)
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // expanded = true => mode Détail (affiche tout et masque la SubscriptionCard en desktop)
  const [expanded, setExpanded] = useState(false);

  const cardRef = useRef(null);
  const heroRightRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchInfos() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/infos-trafic');
        if (!res.ok) {
          const text = await res.text().catch(() => null);
          console.error('API /api/admin/infos-trafic non-ok', res.status, text);
          if (!cancelled) {
            setError('Impossible de charger les informations de trafic.');
            setInfos([]);
          }
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          if (Array.isArray(data)) {
            setInfos(data);
            setCurrentIndex(0);
          } else {
            setInfos([]);
            console.error('API /api/admin/infos-trafic returned non-array:', data);
          }
        }
      } catch (e) {
        if (!cancelled) {
          console.error('Failed to load infos trafic', e);
          setError('Impossible de charger les informations de trafic.');
          setInfos([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchInfos();
    return () => { cancelled = true; };
  }, []);

  // Helper: find ancestor with class 'hero-right'
  const findHeroRight = (el) => {
    let p = el;
    while (p) {
      if (p.classList && p.classList.contains && p.classList.contains('hero-right')) return p;
      p = p.parentElement;
    }
    return null;
  };

  // Gérer l'ajout/suppression de la classe sur le body selon expanded
  useEffect(() => {
    const className = 'traffic-detail-open';
    const cardEl = cardRef.current;

    if (typeof document !== 'undefined') {
      if (expanded) {
        document.body.classList.add(className);
      } else {
        document.body.classList.remove(className);
      }
    }

    // Only apply layout fixes on desktop to avoid interfering with mobile stacking
    const isDesktop = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(min-width: 901px)').matches;

    if (cardEl) {
      const hero = findHeroRight(cardEl);
      heroRightRef.current = hero;

      if (expanded && hero && isDesktop) {
        // store original inline styles to restore later
        hero.dataset._origHeight = hero.style.height || '';
        hero.dataset._origPosition = hero.style.position || '';
        hero.dataset._origOverflow = hero.style.overflow || '';

        const h = hero.getBoundingClientRect().height;
        hero.style.height = `${h}px`;
        // ensure relative positioning so absolute child is positioned within
        if (!hero.style.position) hero.style.position = 'relative';
        hero.style.overflow = 'visible';

        // set card absolute within hero
        cardEl.dataset._origPosition = cardEl.style.position || '';
        cardEl.dataset._origZ = cardEl.style.zIndex || '';
        cardEl.style.position = 'absolute';
        // compute offset of card relative to hero
        const heroRect = hero.getBoundingClientRect();
        const cardRect = cardEl.getBoundingClientRect();
        const offsetTop = cardRect.top - heroRect.top;
        cardEl.style.top = `${offsetTop}px`;
        cardEl.style.left = '0';
        cardEl.style.right = '0';
        cardEl.style.zIndex = '20';
      }

      if ((!expanded || !isDesktop) && hero) {
        // restore
        if (hero.dataset._origHeight !== undefined) hero.style.height = hero.dataset._origHeight;
        if (hero.dataset._origPosition !== undefined) hero.style.position = hero.dataset._origPosition;
        if (hero.dataset._origOverflow !== undefined) hero.style.overflow = hero.dataset._origOverflow;

        // restore card
        if (cardEl.dataset._origPosition !== undefined) cardEl.style.position = cardEl.dataset._origPosition;
        if (cardEl.dataset._origZ !== undefined) cardEl.style.zIndex = cardEl.dataset._origZ;
        cardEl.style.top = '';
        cardEl.style.left = '';
        cardEl.style.right = '';

        delete hero.dataset._origHeight;
        delete hero.dataset._origPosition;
        delete hero.dataset._origOverflow;
        delete cardEl.dataset._origPosition;
        delete cardEl.dataset._origZ;
      }
    }

    return () => {
      if (typeof document !== 'undefined') document.body.classList.remove(className);
      // cleanup on unmount
      const cardEl2 = cardRef.current;
      const hero2 = heroRightRef.current;
      if (hero2) {
        if (hero2.dataset._origHeight !== undefined) hero2.style.height = hero2.dataset._origHeight;
        if (hero2.dataset._origPosition !== undefined) hero2.style.position = hero2.dataset._origPosition;
        if (hero2.dataset._origOverflow !== undefined) hero2.style.overflow = hero2.dataset._origOverflow;
        delete hero2.dataset._origHeight;
        delete hero2.dataset._origPosition;
        delete hero2.dataset._origOverflow;
      }
      if (cardEl2) {
        if (cardEl2.dataset._origPosition !== undefined) cardEl2.style.position = cardEl2.dataset._origPosition;
        if (cardEl2.dataset._origZ !== undefined) cardEl2.style.zIndex = cardEl2.dataset._origZ;
        cardEl2.style.top = '';
        cardEl2.style.left = '';
        cardEl2.style.right = '';
        delete cardEl2.dataset._origPosition;
        delete cardEl2.dataset._origZ;
      }
    };
  }, [expanded]);

  // Réajustement au redimensionnement lorsque le mode 'Détail' est actif
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!expanded) return;

    const adjust = () => {
      const cardEl = cardRef.current;
      const hero = heroRightRef.current || (cardEl && findHeroRight(cardEl));
      if (!hero || !cardEl) return;
      const h = hero.getBoundingClientRect().height;
      hero.style.height = `${h}px`;
      const heroRect = hero.getBoundingClientRect();
      const cardRect = cardEl.getBoundingClientRect();
      const offsetTop = cardRect.top - heroRect.top;
      cardEl.style.top = `${offsetTop}px`;
    };

    // call once immediately
    adjust();
    window.addEventListener('resize', adjust);
    return () => window.removeEventListener('resize', adjust);
  }, [expanded]);

  const total = infos.length;

  const goTo = (i) => {
    if (i < 0 || i >= total) return;
    setCurrentIndex(i);
  };

  const next = () => {
    if (total === 0) return;
    setCurrentIndex((c) => (c + 1) % total);
  };
  const prev = () => {
    if (total === 0) return;
    setCurrentIndex((c) => (c - 1 + total) % total);
  };

  const current = infos[currentIndex];

  return (
    <wcs-card ref={cardRef} className={`card ${styles.trafficCard}`}>
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
        {loading ? (
          <div style={{ padding: 12 }}>Chargement…</div>
        ) : error ? (
          <div style={{ padding: 12, color: '#a00' }}>{error}</div>
        ) : total === 0 ? (
          <div style={{ padding: 12 }}>Aucune information trafic pour le moment.</div>
        ) : (
          <>
            <div className={styles.sectionTitle}>
              {current?.type ? current.type.charAt(0).toUpperCase() + current.type.slice(1) : 'Information'}
            </div>

            <div className={styles.infoBox}>
              <div className={styles.infoTitle}>{current?.titre || 'Sans titre'}</div>
              <div className={`${styles.infoText} ${!expanded ? styles.reduced : ''}`} dangerouslySetInnerHTML={{ __html: current?.description || '' }} />


            </div>

            {/* Separator with centered pill button */}
            <div className={styles.separator}>
              <div className={styles.separatorLine} />
              <div className={styles.separatorButton}>
                <button className={styles.detailButton} onClick={() => setExpanded((v) => !v)}>
                  {expanded ? 'Masquer' : 'Détail'} <span style={{ color: '#0b7d48', fontWeight: 700, fontSize: '1rem' }}>{expanded ? '−' : '+'}</span>
                </button>
              </div>
            </div>

            {/* Pagination (prev / numbered / next) */}
            <div className={styles.pagination} role="tablist" aria-label="Navigation infos trafic">
              <button onClick={prev} aria-label="Précédent" className={styles.paginationButton}>
                <wcs-mat-icon icon="chevron_left" size="s"></wcs-mat-icon>
              </button>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {Array.from({ length: total }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    aria-pressed={i === currentIndex}
                    aria-label={`Info trafic ${i + 1}`}
                    className={`${styles.pageIndicator} ${i === currentIndex ? styles.pageIndicatorActive : styles.pageIndicatorInactive}`}
                    style={{ cursor: 'pointer' }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button onClick={next} aria-label="Suivant" className={styles.paginationButton}>
                <wcs-mat-icon icon="chevron_right" size="s"></wcs-mat-icon>
              </button>
            </div>
          </>
        )}
      </div>
    </wcs-card>
  );
}
