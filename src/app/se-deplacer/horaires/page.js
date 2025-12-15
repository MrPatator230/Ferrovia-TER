"use client";
import React, { useEffect, useState, useRef } from 'react';
import Header from '../../../components/Header';
import NavigationBar from '../../../components/NavigationBar';
import InfoBanner from '../../../components/InfoBanner';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import styles from './page.module.css';

export default function HorairesSearchPage() {
  const [stations, setStations] = useState([]);
  const [loadingStations, setLoadingStations] = useState(true);

  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');
  const [fromSelected, setFromSelected] = useState(null);
  const [toSelected, setToSelected] = useState(null);

  // panelOpen format: `${kind = station|date|time}-${which = from|to}`
  const [panelOpen, setPanelOpen] = useState(null);
  const [filtered, setFiltered] = useState([]);

  const panelRef = useRef(null);

  // date/time states
  const today = new Date();
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(null);
  const [fromTime, setFromTime] = useState('05:00');
  const [, setToTime] = useState(null); // we only need setter for optional return time
  const [toTimeSelected, setToTimeSelected] = useState(null);

  // calendar nav state
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch('/api/admin/stations');
        const data = await res.json();
        if (mounted && Array.isArray(data)) {
          setStations(data.map(s => ({ id: s.id, nom: s.nom, code: s.code || null })));
        }
      } catch (e) {
        console.error('Erreur chargement gares', e);
      } finally {
        if (mounted) setLoadingStations(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  // filter stations when panelOpen is a station panel
  useEffect(() => {
    if (!panelOpen || !panelOpen.startsWith('station-')) { setFiltered(stations.slice(0, 100)); return; }
    const which = panelOpen.split('-')[1];
    const q = which === 'from' ? String(fromQuery || '').trim().toLowerCase() : String(toQuery || '').trim().toLowerCase();
    if (q.length < 1) { setFiltered(stations.slice(0, 100)); return; }
    const arr = stations.filter(s => (s.nom || '').toLowerCase().includes(q) || (s.code || '').toLowerCase().includes(q));
    setFiltered(arr.slice(0, 200));
  }, [fromQuery, toQuery, stations, panelOpen]);

  // close panel when clicking outside
  useEffect(() => {
    function onDoc(e) {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target)) {
        setPanelOpen(null);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function openPanel(kind, which) {
    setPanelOpen(`${kind}-${which}`);
    if (kind === 'station') {
      if (which === 'from') setFromQuery(fromSelected ? fromSelected.nom : '');
      else setToQuery(toSelected ? toSelected.nom : '');
    }
    if (kind === 'date') {
      // set calendar to current selected date
      const d = which === 'from' ? (fromDate || today) : (toDate || today);
      setCalYear(d.getFullYear()); setCalMonth(d.getMonth());
    }
  }

  function pickStation(which, station) {
    if (which === 'from') {
      setFromSelected(station);
      setFromQuery(station.nom || '');
    } else {
      setToSelected(station);
      setToQuery(station.nom || '');
    }
    setPanelOpen(null);
  }

  function clearField(which) {
    if (which === 'from') { setFromSelected(null); setFromQuery(''); }
    else { setToSelected(null); setToQuery(''); }
  }

  // swap departure and arrival stations (selection + query)
  function swapStations(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const aSelected = fromSelected;
    const bSelected = toSelected;
    const aQuery = fromQuery;
    const bQuery = toQuery;
    setFromSelected(bSelected || null);
    setToSelected(aSelected || null);
    setFromQuery(bQuery || '');
    setToQuery(aQuery || '');
  }

  function pickDate(which, date) {
    if (!date) return;
    if (which === 'from') { setFromDate(date); }
    else { setToDate(date); }
    setPanelOpen(null);
  }

  // time list
  const hours = Array.from({length:24}, (_,i) => (i<10? '0'+i : ''+i) + ':00');
  function pickTime(which, t) {
    if (which === 'from') setFromTime(t); else setToTime(t);
    setPanelOpen(null);
  }

  function formatDate(d) {
    if (!d) return '';
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  return (
    <div>
      <Header />
      <NavigationBar />
      <InfoBanner />

      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.searchCard}>
            <div className={styles.field} onClick={() => openPanel('station','from')}>
              <div className={styles.fieldLabel}>Gare de départ</div>
              <div className={styles.inputWrapper}>
                <span className={styles.icon}><wcs-mat-icon icon="place" size="m"></wcs-mat-icon></span>
                <input
                  className={`${styles.input} ${styles.inputWithIcon}`}
                  placeholder="Choisir une gare"
                  value={fromSelected ? fromSelected.nom : fromQuery}
                  onChange={(e) => { setFromQuery(e.target.value); setFromSelected(null); }}
                  onFocus={() => openPanel('station','from')}
                />
                {fromSelected && <button className={styles.clearBtn} onClick={(e) => { e.stopPropagation(); clearField('from'); }}>×</button>}
                {/* swap button: inverse departure and arrival */}
                <button className={styles.swapBtn} onClick={(e) => swapStations(e)} title="Inverser les gares" aria-label="Inverser les gares">
                  <wcs-mat-icon icon="swap_vert" size="s" style={{ color: '#1f6f2f' }}></wcs-mat-icon>
                </button>
              </div>
            </div>

            <div className={styles.field} onClick={() => openPanel('station','to')}>
              <div className={styles.fieldLabel}>Gare d'arrivée</div>
              <div className={styles.inputWrapper}>
                <span className={styles.icon}><wcs-mat-icon icon="place" size="m"></wcs-mat-icon></span>
                <input
                  className={`${styles.input} ${styles.inputWithIcon}`}
                  placeholder="Choisir une gare"
                  value={toSelected ? toSelected.nom : toQuery}
                  onChange={(e) => { setToQuery(e.target.value); setToSelected(null); }}
                  onFocus={() => openPanel('station','to')}
                />
                {toSelected && <button className={styles.clearBtn} onClick={(e) => { e.stopPropagation(); clearField('to'); }}>×</button>}
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.dateBox} onClick={() => openPanel('date','from')}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <wcs-mat-icon icon="event" size="m" className={styles.inlineIcon}></wcs-mat-icon>
                  <div>
                    <div className={styles.smallLabel}>Aller</div>
                    <div className={styles.dateValue}>{formatDate(fromDate)}</div>
                  </div>
                </div>
              </div>
              <div className={styles.timeBox} onClick={() => openPanel('time','from')}>
                <wcs-mat-icon icon="schedule" size="s" style={{verticalAlign:'middle', marginRight:8}}></wcs-mat-icon>
                {fromTime || '--:--'}
              </div>
            </div>

            {/* Retour */}
            <div className={styles.row}>
              <div className={styles.dateBox} onClick={() => openPanel('date','to')}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <wcs-mat-icon icon="event" size="m" className={styles.inlineIcon}></wcs-mat-icon>
                  <div>
                    <div className={styles.smallLabel}>Retour (optionnel)</div>
                    <div className={styles.dateValue}>{formatDate(toDate) || '--/--/----'}</div>
                  </div>
                </div>
              </div>
              <div className={styles.timeBox} onClick={() => openPanel('time','to')}>
                <wcs-mat-icon icon="schedule" size="s" style={{verticalAlign:'middle', marginRight:8}}></wcs-mat-icon>
                {toTimeSelected || '--:--'}
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.passengerBox} onClick={() => {/* could open passenger panel */}}>
                <wcs-mat-icon icon="person" size="s" style={{verticalAlign:'middle', marginRight:12}}></wcs-mat-icon>
                <span>1 Voyageur, Sans carte</span>
              </div>
            </div>

            <div className={styles.actions}>
              <button className={styles.searchBtn} disabled={!fromSelected || !toSelected}>Rechercher</button>
            </div>
          </div>

          {/* panel with results */}
          {panelOpen && (
            <div className={styles.panel} ref={panelRef} role="dialog">
              {panelOpen.startsWith('station-') && (
                <>
                  <div className={styles.panelHeader}>{panelOpen.endsWith('from') ? "Gare de départ" : "Gare d'arrivée"}</div>
                  <div className={styles.panelHint}>Veuillez saisir au moins 1 caractère dans ce champ.</div>
                  <div className={styles.resultsList}>
                    {loadingStations && <div className={styles.resultItem}>Chargement…</div>}
                    {!loadingStations && filtered.length === 0 && <div className={styles.resultItem}>Aucune gare</div>}
                    {!loadingStations && filtered.map(s => (
                      <button key={s.id} className={styles.resultItem} onClick={() => pickStation(panelOpen.split('-')[1], s)}>
                        <span className={styles.resultName}>{s.nom}</span>
                        {s.code && <span className={styles.resultCode}>{s.code}</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {panelOpen.startsWith('date-') && (
                <>
                  <div className={styles.panelHeader}>{panelOpen.endsWith('from') ? "Date de départ Aller" : "Date de départ Retour"}</div>
                  <div className={styles.panelHint}>Format attendu : "Jour/Mois/Année complète" (exemple: 15/12/2025).</div>
                  <div style={{padding:'6px 12px'}}>
                    <DayPicker
                      mode="single"
                      selected={panelOpen.endsWith('from') ? fromDate : toDate}
                      onSelect={(d) => { pickDate(panelOpen.split('-')[1], d); }}
                      defaultMonth={new Date(calYear, calMonth)}
                    />
                  </div>
                </>
              )}

              {panelOpen.startsWith('time-') && (
                <>
                  <div className={styles.panelHeader}>{panelOpen.endsWith('from') ? "Heure de départ" : "Heure de retour"}</div>
                  <div className={styles.resultsList} style={{maxHeight:520}}>
                    {hours.map(h => {
                      const isSel = (panelOpen.endsWith('from') && fromTime === h) || (panelOpen.endsWith('to') && toTimeSelected === h);
                      return (
                        <button key={h} className={styles.resultItem + (isSel ? ' ' + styles.timeSelected : '')} onClick={() => { pickTime(panelOpen.split('-')[1], h); if (panelOpen.endsWith('to')) setToTimeSelected(h); }}>
                          <span className={styles.resultName}>{h}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

            </div>
          )}
         </div>
       </main>
     </div>
   );
}
