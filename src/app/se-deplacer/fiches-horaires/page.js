"use client";
import React, { useState, useEffect, useRef } from 'react';
import InfoBanner from '../../../components/InfoBanner';
import Header from '../../../components/Header';
import NavigationBar from '../../../components/NavigationBar';
import styles from './page.module.css';

export default function FichesHorairesPage() {
  const [lignes, setLignes] = useState([]);
  const [stations, setStations] = useState([]);
  const [selectedLigne, setSelectedLigne] = useState('');
  const [selectedStation, setSelectedStation] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const ligneSelectRef = useRef(null);
  const stationSelectRef = useRef(null);

  // Charger les lignes et les gares
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Charger les lignes (admin) pour obtenir le champ `stops` qui contient les arrêts
        const lignesRes = await fetch('/api/admin/lignes');
        const lignesData = await lignesRes.json();
        if (Array.isArray(lignesData)) {
          setLignes(lignesData);
        } else if (lignesData && lignesData.lignes) {
          setLignes(lignesData.lignes);
        }

        // Charger les gares
        const stationsRes = await fetch('/api/admin/stations');
        const stationsData = await stationsRes.json();
        if (Array.isArray(stationsData)) {
          setStations(stationsData);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    // Installer des écouteurs sur les composants WCS au cas où on ne recevrait pas les events React
    const lEl = ligneSelectRef.current;
    const sEl = stationSelectRef.current;
    function normalizePayload(e) {
      if (!e) return '';
      if (e.detail) return (e.detail.value !== undefined ? e.detail.value : e.detail);
      if (e.target && e.target.value !== undefined) return e.target.value;
      return '';
    }
    function onLigneWcsChange(e) {
      const v = normalizePayload(e);
      const vv = v !== null && v !== undefined ? String(v) : '';
      setSelectedLigne(vv);
      if (vv && vv.trim() !== '') setSelectedStation('');
    }
    function onStationWcsChange(e) {
      const v = normalizePayload(e);
      const vv = v !== null && v !== undefined ? String(v) : '';
      setSelectedStation(vv);
      if (vv && vv.trim() !== '') setSelectedLigne('');
    }
    if (lEl && lEl.addEventListener) {
      lEl.addEventListener('wcsChange', onLigneWcsChange);
      lEl.addEventListener('change', onLigneWcsChange);
    }
    if (sEl && sEl.addEventListener) {
      sEl.addEventListener('wcsChange', onStationWcsChange);
      sEl.addEventListener('change', onStationWcsChange);
    }
    return () => {
      if (lEl && lEl.removeEventListener) {
        lEl.removeEventListener('wcsChange', onLigneWcsChange);
        lEl.removeEventListener('change', onLigneWcsChange);
      }
      if (sEl && sEl.removeEventListener) {
        sEl.removeEventListener('wcsChange', onStationWcsChange);
        sEl.removeEventListener('change', onStationWcsChange);
      }
    };
  }, []);

  const handleSearch = async () => {
    setSearching(true);
    setHasSearched(true);
    try {
      // Récupérer toutes les fiches horaires
      const res = await fetch('/api/fiches-horaires');
      const data = await res.json();

      if (data.success && data.fiches) {
        // Filtrer les fiches selon la ligne ou la gare sélectionnée
        // Si la recherche est par gare, utiliser toutes les fiches (certaines fiches peuvent ne pas avoir afficher_page_recherche mais sont liées à la ligne)
        let filteredFiches = Array.isArray(data.fiches) ? (selectedStation ? data.fiches.slice() : data.fiches.filter(fiche => fiche.afficher_page_recherche)) : [];

        // Si une gare est sélectionnée, on veut les fiches dont la ligne dessert la gare
        if (selectedStation) {
          // Détection des lignes desservant la gare à partir des arrêts configurés dans chaque ligne
          // selectedStation contient l'id de la gare
          const stationIdStr = String(selectedStation);
          // récupérer code de la station si disponible
          const stationObj = stations.find(s => String(s.id) === stationIdStr) || null;
          const stationCode = stationObj && stationObj.code ? String(stationObj.code).toUpperCase() : null;

          const ligneIdsServingStation = new Set();

          // helper pour extraire possible station identifiers from a stop object
          const stopMatchesStation = (stop) => {
            if (stop == null) return false;
            // If stop is primitive (number or string), compare directly
            if (typeof stop === 'number' || typeof stop === 'string') {
              if (String(stop) === stationIdStr) return true;
              if (stationCode && String(stop).toUpperCase() === stationCode) return true;
              return false;
            }

            // possible keys: station_id, id, stationId, station_code, code, station
            const sid = stop.station_id != null ? String(stop.station_id)
                      : (stop.id != null ? String(stop.id)
                      : (stop.stationId != null ? String(stop.stationId) : null));
            if (sid && sid === stationIdStr) return true;

            // nested object e.g. stop.station = { id, code }
            if (stop.station && typeof stop.station === 'object') {
              const nested = stop.station;
              if (nested.id != null && String(nested.id) === stationIdStr) return true;
              const ncode = nested.code || nested.station_code || nested.stationCode || null;
              if (ncode && stationCode && String(ncode).toUpperCase() === stationCode) return true;
            }

            const scode = stop.station_code || stop.code || stop.stationCode || null;
            if (scode && stationCode && String(scode).toUpperCase() === stationCode) return true;
            return false;
          };

          // Parcourir la liste des lignes chargées en amont (state `lignes`) et vérifier leur champ `stops`
          (lignes || []).forEach(l => {
            if (!l) return;
            let stops = l.stops;
            // supporter stops stocké en string
            if (typeof stops === 'string') {
              try { stops = JSON.parse(stops); } catch (e) { stops = []; }
            }
            if (!Array.isArray(stops)) return;
            for (const s of stops) {
              try {
                if (stopMatchesStation(s)) {
                  ligneIdsServingStation.add(String(l.id));
                  break;
                }
              } catch (e) { /* ignore per-stop errors */ }
            }
          });

          console.log('[fiches-horaires] station', stationIdStr, 'code', stationCode, 'lignes trouvées:', Array.from(ligneIdsServingStation));

           // Filtrer les fiches par ligne_id si on a trouvé des lignes
           if (ligneIdsServingStation.size > 0) {
            const beforeCount = filteredFiches.length;
            filteredFiches = filteredFiches.filter(f => {
               if (!f) return false;
               // Support multiple possible fiche fields referencing lignes
               const possibleKeys = ['ligne_id', 'ligne', 'lignes', 'ligne_ids'];
               let lids = null;
               for (const k of possibleKeys) {
                if (Object.prototype.hasOwnProperty.call(f, k) && f[k] != null) { lids = f[k]; break; }
               }
               if (lids == null) return false;

              // normalize to array of strings
              const extract = (v) => {
                if (v == null) return [];
                if (Array.isArray(v)) return v.map(x => String(x));
                if (typeof v === 'object') {
                  // object could be { id: 3 } or {ligne_id: 3} or nested - try common keys
                  if (v.id != null) return [String(v.id)];
                  if (v.ligne_id != null) return [String(v.ligne_id)];
                  if (v.value != null) return [String(v.value)];
                  // fallback: stringify
                  try { return [String(JSON.stringify(v))]; } catch (e) { return [String(v)]; }
                }
                if (typeof v === 'number') return [String(v)];
                if (typeof v === 'string') {
                  const s = v.trim();
                  // try JSON
                  if ((s.startsWith('[') || s.startsWith('{'))) {
                    try {
                      const p = JSON.parse(s);
                      if (Array.isArray(p)) return p.map(x => String(x));
                    } catch (e) { /* ignore */ }
                  }
                  if (s.indexOf(',') !== -1) return s.split(',').map(x => String(x.trim()));
                  return [s];
                }
                return [String(v)];
              };

              const arr = extract(lids);
              return arr.some(x => ligneIdsServingStation.has(String(x)));
            });
            console.log('[fiches-horaires] fiches before:', beforeCount, 'after:', filteredFiches.length, 'ids:', filteredFiches.map(ff => ff && ff.id));
           } else {
             // aucune ligne ne dessert la gare : résultats vides
             filteredFiches = [];
           }
         }

        // Si une ligne est sélectionnée, filtrer par ligne
        if (selectedLigne) {
          filteredFiches = filteredFiches.filter(fiche => fiche.ligne_id && fiche.ligne_id.toString() === selectedLigne.toString());
        }

        setSearchResults(filteredFiches);
      }
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <>
      <Header />
      <NavigationBar />
      <InfoBanner />

      <div className={styles.container}>
        <div className={styles.hero}>
          {/* Icône et titre */}
          <div className={styles.iconWrapper}>
            <wcs-mat-icon icon="schedule" size="xl" style={{ fontSize: '120px', color: '#0088ce' }}></wcs-mat-icon>
            <wcs-mat-icon icon="description" size="xl" style={{ fontSize: '120px', color: '#0088ce', marginLeft: '20px' }}></wcs-mat-icon>
          </div>

          <h1 className={styles.title}>Rechercher une fiche horaire</h1>
          <p className={styles.subtitle}>
            Consulter l'ensemble des fiches horaires, travaux et tous les horaires modifiés de votre ligne.
          </p>
        </div>

        <wcs-card className={styles.searchCard}>
          <wcs-card-body>
            <div className={styles.searchGrid}>
              {/* Colonne Ligne */}
              <div className={styles.searchColumn}>
                <wcs-label>Ligne</wcs-label>
                <wcs-select
                  placeholder="Sélectionner une ligne"
                  value={selectedLigne}
                  ref={ligneSelectRef}
                  onWcsChange={(e) => {
                    const payload = e && e.detail ? (e.detail.value !== undefined ? e.detail.value : e.detail) : '';
                    const v = payload !== null && payload !== undefined ? String(payload) : '';
                    setSelectedLigne(v);
                    // clear station selection because the UI is 'ou'
                    if (v && v.trim() !== '') setSelectedStation('');
                  }}
                  onChange={(e) => {
                    const val = e && e.target && e.target.value !== undefined ? e.target.value : (e && e.detail ? (e.detail.value !== undefined ? e.detail.value : e.detail) : '');
                    const vv = val !== null && val !== undefined ? String(val) : '';
                    setSelectedLigne(vv);
                    if (vv && vv.trim() !== '') setSelectedStation('');
                  }}
                  disabled={loading}
                  style={{ width: '100%' }}
                >
                  <wcs-select-option value="">Ligne</wcs-select-option>
                  {lignes.map(ligne => (
                    <wcs-select-option key={ligne.id} value={ligne.id}>
                      {ligne.nom}
                    </wcs-select-option>
                  ))}
                </wcs-select>
              </div>

              {/* Séparateur "ou" */}
              <div className={styles.separator}>
                <span className={styles.separatorText}>ou</span>
              </div>

              {/* Colonne Gare */}
              <div className={styles.searchColumn}>
                <wcs-label>Gare</wcs-label>
                <wcs-select
                  placeholder="Sélectionner une gare"
                  value={selectedStation}
                  ref={stationSelectRef}
                  onWcsChange={(e) => {
                    const payload = e && e.detail ? (e.detail.value !== undefined ? e.detail.value : e.detail) : '';
                    const v = payload !== null && payload !== undefined ? String(payload) : '';
                    setSelectedStation(v);
                    if (v && v.trim() !== '') setSelectedLigne('');
                  }}
                  onChange={(e) => {
                    const val = e && e.target && e.target.value !== undefined ? e.target.value : (e && e.detail ? (e.detail.value !== undefined ? e.detail.value : e.detail) : '');
                    const vv = val !== null && val !== undefined ? String(val) : '';
                    setSelectedStation(vv);
                    if (vv && vv.trim() !== '') setSelectedLigne('');
                  }}
                  disabled={loading}
                  style={{ width: '100%' }}
                >
                  <wcs-select-option value="">Gare</wcs-select-option>
                  {stations.map(station => (
                    <wcs-select-option key={station.id} value={station.id}>
                      {station.nom}
                    </wcs-select-option>
                  ))}
                </wcs-select>
              </div>
            </div>

            {/* Bouton Rechercher */}
            <div className={styles.buttonWrapper}>
              <wcs-button
                mode="primary"
                onClick={handleSearch}
                disabled={loading || searching || ((String(selectedLigne || '').trim() === '') && (String(selectedStation || '').trim() === ''))}
                style={{ minWidth: '200px' }}
              >
                {searching ? (
                  <>
                    <wcs-spinner mode="light"></wcs-spinner>
                    <span style={{ marginLeft: '8px' }}>Recherche en cours...</span>
                  </>
                ) : (
                  <>
                    <wcs-mat-icon icon="search"></wcs-mat-icon>
                    <span style={{ marginLeft: '8px' }}>Rechercher</span>
                  </>
                )}
              </wcs-button>
            </div>
          </wcs-card-body>
        </wcs-card>

        {/* Résultats de recherche */}
        {hasSearched && (
          <div className={styles.resultsSection}>
            {searching ? (
              <div className={styles.loadingResults}>
                <wcs-spinner></wcs-spinner>
                <p style={{ marginTop: '1rem' }}>Recherche des fiches horaires...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <>
                <h2 className={styles.resultsTitle}>
                  <wcs-badge color="primary" style={{ marginRight: '1rem' }}>{searchResults.length}</wcs-badge>
                  fiche{searchResults.length > 1 ? 's' : ''} horaire{searchResults.length > 1 ? 's' : ''} trouvée{searchResults.length > 1 ? 's' : ''}
                </h2>
                <div className={styles.resultsGrid}>
                  {searchResults.map(fiche => (
                    <wcs-card key={fiche.id} className={styles.ficheCard}>
                      <wcs-card-body>
                        <div className={styles.ficheHeader}>
                          <wcs-mat-icon icon="description" size="l" style={{ color: '#0088ce' }}></wcs-mat-icon>
                          <wcs-badge
                            color={fiche.type_fiche === 'Travaux' ? 'warning' : 'info'}
                            style={{ textTransform: 'uppercase' }}
                          >
                            {fiche.type_fiche || 'SA'}
                          </wcs-badge>
                        </div>

                        <h3 className={styles.ficheTitle}>{fiche.nom}</h3>

                        <div className={styles.ficheDetails}>
                          {fiche.service_annuel_nom && (
                            <div className={styles.ficheDetail}>
                              <wcs-mat-icon icon="event" size="s"></wcs-mat-icon>
                              <span>{fiche.service_annuel_nom}</span>
                            </div>
                          )}

                          {fiche.service_date_debut && fiche.service_date_fin && (
                            <div className={styles.ficheDetail}>
                              <wcs-mat-icon icon="schedule" size="s"></wcs-mat-icon>
                              <span>
                                {new Date(fiche.service_date_debut).toLocaleDateString('fr-FR')} - {new Date(fiche.service_date_fin).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                          )}

                          {fiche.design_region && (
                            <div className={styles.ficheDetail}>
                              <wcs-mat-icon icon="place" size="s"></wcs-mat-icon>
                              <span>{fiche.design_region}</span>
                            </div>
                          )}
                        </div>

                        {fiche.pdf_path ? (
                          <wcs-button
                            mode="primary"
                            onClick={() => window.open(`/${fiche.pdf_path}`, '_blank')}
                            style={{ width: '100%', marginTop: '1rem' }}
                          >
                            <wcs-mat-icon icon="download"></wcs-mat-icon>
                            <span style={{ marginLeft: '8px' }}>Télécharger le PDF</span>
                          </wcs-button>
                        ) : (
                          <wcs-button
                            mode="stroked"
                            disabled
                            style={{ width: '100%', marginTop: '1rem' }}
                          >
                            <wcs-mat-icon icon="info"></wcs-mat-icon>
                            <span style={{ marginLeft: '8px' }}>PDF en cours de génération</span>
                          </wcs-button>
                        )}
                      </wcs-card-body>
                    </wcs-card>
                  ))}
                </div>
              </>
            ) : (
              <wcs-card className={styles.noResults}>
                <wcs-card-body style={{ textAlign: 'center', padding: '3rem' }}>
                  <wcs-mat-icon icon="search_off" size="xl" style={{ fontSize: '80px', opacity: 0.3, color: '#999' }}></wcs-mat-icon>
                  <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>Aucune fiche horaire trouvée</h3>
                  <p style={{ color: '#666', marginBottom: '0.5rem' }}>Aucune fiche horaire n'est disponible pour cette recherche.</p>
                  <p style={{ color: '#999', fontSize: '0.875rem' }}>Essayez avec une autre ligne ou gare.</p>
                </wcs-card-body>
              </wcs-card>
            )}
          </div>
        )}
      </div>
    </>
  );
}
