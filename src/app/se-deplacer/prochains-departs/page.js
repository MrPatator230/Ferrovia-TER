"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import InfoBanner from '../../../components/InfoBanner';
import Header from '../../../components/Header';
import NavigationBar from '../../../components/NavigationBar';
import styles from './page.module.css';

export default function ProchainsDepartsPage() {
  const router = useRouter();
  const [stations, setStations] = useState([]);
  const [loadingStations, setLoadingStations] = useState(false);
  const [stationsError, setStationsError] = useState('');

  const [query, setQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    async function loadStations() {
      setLoadingStations(true);
      setStationsError('');
      try {
        const res = await fetch('/api/admin/stations', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data)) {
          setStations([]);
        } else {
          // Normaliser : la table renvoie le champ `nom`
          const mapped = data.map(s => ({ id: s.id, nom: (s.nom || '').toString() }));
          if (mounted) setStations(mapped);
        }
      } catch (e) {
        console.error('Erreur chargement gares', e);
        if (mounted) setStationsError(e && e.message ? e.message : 'Erreur');
      } finally {
        if (mounted) setLoadingStations(false);
      }
    }
    loadStations();
    return () => { mounted = false; };
  }, []);

  // Debounced filtering of stations when query changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const q = (query || '').toLowerCase().trim();
      if (!q) {
        setSuggestions([]);
        setOpen(false);
        setActiveIndex(-1);
        setSelectedStation(null);
        return;
      }
      const matches = stations.filter(s => s.nom.toLowerCase().includes(q));
      setSuggestions(matches.slice(0, 8));
      setOpen(matches.length > 0);
      setActiveIndex(-1);
    }, 160);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, stations]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(station) {
    setQuery(station.nom);
    setSelectedStation(station);
    setOpen(false);
    setActiveIndex(-1);
    // focus input after select
    if (inputRef.current) inputRef.current.focus();
  }

  function slugify(name) {
    return encodeURIComponent(String(name).toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, ''));
  }

  function handleKeyDown(e) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        handleSelect(suggestions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  function handleShowHoraires() {
    // if a station object selected use it; otherwise try to find a matching station by exact name
    let station = selectedStation;
    if (!station && query) {
      const found = stations.find(s => s.nom.toLowerCase() === query.toLowerCase().trim());
      if (found) station = found;
    }
    if (!station) {
      // nothing selected, show a small validation (could be improved)
      if (inputRef.current) inputRef.current.focus();
      return;
    }
    const slug = slugify(station.nom);
    router.push(`/se-deplacer/prochains-departs/${slug}`);
  }

  return (
    <div>
      <header role="banner">
        <InfoBanner />
        <Header />
        <NavigationBar />
      </header>

      <div className={styles.pageWrap}>
        <main className={styles.hero} role="main" aria-labelledby="hero-title">
          <div className={styles.iconWrap} aria-hidden>
            {/* SVG train + clock */}
            <svg width="140" height="140" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g fill="none" stroke="#0B7D48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="8" y="12" width="48" height="28" rx="4" strokeWidth="1.8" fill="#E8F5EA" />
                <path d="M16 40v4a2 2 0 0 0 2 2h4" />
                <path d="M48 40v4a2 2 0 0 1-2 2h-4" />
                <circle cx="20" cy="14" r="9" strokeWidth="1.6" fill="#fff" />
                <path d="M18 12v4h4" strokeWidth="1.4" />
                <rect x="22" y="18" width="20" height="14" rx="2" fill="#fff" strokeWidth="1.2" />
                <path d="M28 12v-2" />
              </g>
            </svg>
          </div>

          <h1 id="hero-title" className={styles.title}>Prochains départs</h1>
          <p className={styles.lead}>Tableaux des départs et arrivées de plus de 5000 gares</p>

          <div className={styles.toggleWrap} role="tablist" aria-label="Mode">
            <button className={`${styles.toggleBtn} ${styles.active}`} aria-pressed="true">Départs</button>
            <button className={styles.toggleBtn} aria-pressed="false">Arrivées</button>
          </div>

          <div className={styles.formCard}>
            <label htmlFor="station-search" className={styles.hiddenLabel}>Rechercher une gare</label>

            <div className={styles.searchRow} ref={wrapperRef}>
              <input
                id="station-search"
                ref={inputRef}
                className={styles.searchInput}
                placeholder={loadingStations ? 'Chargement des gares…' : 'Rechercher une gare'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-autocomplete="list"
                aria-controls="stations-listbox"
                aria-expanded={open}
                aria-haspopup="listbox"
                role="combobox"
                autoComplete="off"
              />

              {open && suggestions.length > 0 && (
                <ul id="stations-listbox" role="listbox" className={styles.autocompleteList}>
                  {suggestions.map((s, idx) => (
                    <li
                      key={s.id || `${s.nom}-${idx}`}
                      role="option"
                      aria-selected={activeIndex === idx}
                      className={`${styles.autocompleteItem} ${activeIndex === idx ? styles.autocompleteItemActive : ''}`}
                      onMouseDown={(ev) => { ev.preventDefault(); handleSelect(s); }}
                      onMouseEnter={() => setActiveIndex(idx)}
                    >
                      {s.nom}
                    </li>
                  ))}
                </ul>
              )}

            </div>

            <div className={styles.actionsRow}>
              <button className={styles.ctaButton} onClick={handleShowHoraires}>Afficher les horaires</button>
            </div>

            {stationsError && (
              <div style={{ marginTop: 10, color: '#b00020' }}>Erreur chargement des gares : {stationsError}</div>
            )}

          </div>

        </main>
      </div>
    </div>
  );
}
