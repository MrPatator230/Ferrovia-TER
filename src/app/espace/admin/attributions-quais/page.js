"use client";
import React, { useEffect, useMemo, useState } from 'react';
import styles from './attributions-quais.module.css';

export default function PageAttributionsQuais() {
  const [stations, setStations] = useState([]);
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [activeTab, setActiveTab] = useState('depart');
  const [horaires, setHoraires] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [quaisValues, setQuaisValues] = useState({}); // {horaireId: [array of quai names]}
  const [savingIds, setSavingIds] = useState(new Set());

  // charger toutes les gares au montage
  useEffect(() => {
    let mounted = true;
    fetch('/api/admin/stations')
      .then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
      .then((data) => {
        if (mounted) {
          console.log('[attributions-quais] Stations loaded:', data);
          setStations(Array.isArray(data) ? data : []);
        }
      })
      .catch(e => {
        if (mounted) setError('Impossible de charger les gares: ' + (e?.message || String(e)));
      });
    return () => { mounted = false; };
  }, []);

  const canFetch = useMemo(() =>
    selectedStationId != null && (activeTab === 'depart' || activeTab === 'arrivee'),
    [selectedStationId, activeTab]
  );

  const selectedStation = useMemo(() =>
    stations.find(s => s.id === selectedStationId),
    [stations, selectedStationId]
  );

  // Filtrer les horaires selon l'onglet actif (depart / arrivee) et la gare sélectionnée
  const filteredHoraires = useMemo(() => {
    if (!Array.isArray(horaires) || !selectedStationId) return [];
    return horaires.filter(h => {
      const dir = getHoraireDirectionForStation(h);
      if (dir) {
        if (activeTab === 'depart') return dir === 'depart';
        if (activeTab === 'arrivee') return dir === 'arrivee';
        return false;
      }
      // Si aucune direction trouvée via stop objet, vérifier si stop primitif (ex: 'BEP') existe
      const stop = getStopForStation(h);
      if (stop != null && (typeof stop === 'string' || typeof stop === 'number')) {
        // On inclut l'horaire : on suppose que la gare est desservie (structure minimale)
        return activeTab === 'depart' || activeTab === 'arrivee';
      }
      return false;
    });
  }, [horaires, activeTab, selectedStationId]);

  // Récupérer les quais disponibles de la gare sélectionnée
  const availableQuais = useMemo(() => {
    if (!selectedStation) return [];
    const quaisData = selectedStation.quais;
    if (!Array.isArray(quaisData)) return [];
    // Les quais sont stockés comme [{nom: "1A", distance: 123}, ...]
    return quaisData.map(q => q.nom).filter(Boolean);
  }, [selectedStation]);

  // Helper: déterminer si un horaire est présenté comme 'depart' ou 'arrivee' par rapport à la gare sélectionnée
  const getHoraireDirectionForStation = (h) => {
    try {
      if (!h || !selectedStationId) return null;
      const stationCode = selectedStation?.code ? String(selectedStation.code).toUpperCase() : null;
      // Terminus départ
      if (h.depart_station_id === selectedStationId) return 'depart';
      // Terminus arrivée
      if (h.arrivee_station_id === selectedStationId) return 'arrivee';
      // Chercher dans les stops
      if (Array.isArray(h.stops)) {
        const stop = h.stops.find(st => {
          if (!st) return false;
          // st peut être objet contenant station_id ou id
          const sid = st && st.station_id != null ? Number(st.station_id) : (st && st.id != null ? Number(st.id) : null);
          if (sid != null && Number(sid) === Number(selectedStationId)) return true;
          // si stop est primitif (ex: 'BEP' ou '2')
          if (typeof st === 'string' || typeof st === 'number') {
            if (String(st) === String(selectedStationId)) return true;
            if (stationCode && String(st).toUpperCase() === stationCode) return true;
          }
          // nested station
          if (st.station && (st.station.id != null)) {
            if (Number(st.station.id) === Number(selectedStationId)) return true;
            const nestedCode = st.station.code || st.station.station_code || st.station.stationCode || null;
            if (nestedCode && stationCode && String(nestedCode).toUpperCase() === stationCode) return true;
          }
          // champs de code possibles dans l'objet stop
          const sc = st.station_code || st.code || st.stationCode || null;
          if (sc && stationCode && String(sc).toUpperCase() === stationCode) return true;
          return false;
        });
        if (stop) {
          if (stop.depart_time) return 'depart';
          if (stop.arrivee_time) return 'arrivee';
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  // Helper: retourner l'objet stop correspondant à la gare sélectionnée (id ou code), ou null
  const getStopForStation = (h) => {
    try {
      if (!h || !selectedStationId || !Array.isArray(h.stops)) return null;
      const stationCode = selectedStation?.code ? String(selectedStation.code).toUpperCase() : null;
      return h.stops.find(st => {
        if (!st) return false;
        const sid = st && st.station_id != null ? Number(st.station_id) : (st && st.id != null ? Number(st.id) : null);
        if (sid != null && Number(sid) === Number(selectedStationId)) return true;
        if (typeof st === 'string' || typeof st === 'number') {
          if (String(st) === String(selectedStationId)) return true;
          if (stationCode && String(st).toUpperCase() === stationCode) return true;
        }
        if (st.station && (st.station.id != null)) {
          if (Number(st.station.id) === Number(selectedStationId)) return true;
          const nestedCode = st.station.code || st.station.station_code || st.station.stationCode || null;
          if (nestedCode && stationCode && String(nestedCode).toUpperCase() === stationCode) return true;
        }
        const sc = st.station_code || st.code || st.stationCode || null;
        if (sc && stationCode && String(sc).toUpperCase() === stationCode) return true;
        return false;
      }) || null;
    } catch (e) {
      return null;
    }
  };

  // charger horaires par gare + onglet
  useEffect(() => {
    if (!canFetch) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    setSuccess(null);
    const url = `/api/admin/horaires/by-station?id=${selectedStationId}&type=${activeTab}`;
    console.log('[attributions-quais] Fetching from:', url);
    fetch(url)
      .then(r => {
        console.log('[attributions-quais] Response status:', r.status);
        return r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status));
      })
      .then((data) => {
        console.log('[attributions-quais] Data received:', data);
        if (mounted) {
          const normalized = Array.isArray(data) ? data : [];
          console.log('[attributions-quais] Normalized:', normalized.length, 'horaires');
          setHoraires(normalized);
          // initialiser les valeurs de quais depuis attribution_quais
          const initialQuais = {};
          const stationCode = selectedStation?.code;
          console.log('[attributions-quais] Station code for quais extraction:', stationCode);

          normalized.forEach(h => {
            const attributionQuais = typeof h.attribution_quais === 'object' && h.attribution_quais !== null ? h.attribution_quais : {};

            // Utiliser le code de la station au lieu de l'ID
            let quaiForStation = '';
            if (stationCode && attributionQuais[stationCode]) {
              quaiForStation = String(attributionQuais[stationCode]);
            }

            console.log(`[attributions-quais] Horaire ${h.id} (${h.numero_train}):`, {
              attribution_quais: attributionQuais,
              stationCode,
              quaiForStation
            });

            initialQuais[h.id] = quaiForStation;
          });

          console.log('[attributions-quais] Initial quais values:', initialQuais);
          setQuaisValues(initialQuais);
        }
      })
      .catch(e => {
        console.error('[attributions-quais] Error:', e);
        if (mounted) setError('Impossible de charger les horaires: ' + (e?.message || String(e)));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [selectedStationId, activeTab, canFetch, selectedStation]);

  const onSaveQuais = async (horaireId) => {
    const quaiValue = quaisValues[horaireId] || ''; // Valeur unique
    console.log('[onSaveQuais] horaireId:', horaireId);
    console.log('[onSaveQuais] quaiValue:', quaiValue);
    console.log('[onSaveQuais] selectedStationId:', selectedStationId);

    setSavingIds(prev => new Set([...prev, horaireId]));
    setError(null);
    setSuccess(null);
    try {
      const payload = { station_id: selectedStationId, quais: quaiValue };
      console.log('[onSaveQuais] Sending payload:', payload);
      const res = await fetch(`/api/admin/horaires/${horaireId}/quais`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      console.log('[onSaveQuais] Response data:', data);
      if (!res.ok) throw new Error(data?.error || 'Erreur lors de l\'enregistrement');

      setSuccess(`Quai enregistré pour le train ${horaires.find(h => h.id === horaireId)?.numero_train || horaireId}`);
      setTimeout(() => setSuccess(null), 3000);

      // refetch
      console.log('[onSaveQuais] Refetching horaires...');
      const r = await fetch(`/api/admin/horaires/by-station?id=${selectedStationId}&type=${activeTab}`);
      const d = await r.json();
      const normalized = Array.isArray(d) ? d : [];
      console.log('[onSaveQuais] Refetched:', normalized.length, 'horaires');
      setHoraires(normalized);

      // réinitialiser les valeurs depuis attribution_quais
      const updatedQuais = {};
      const stationCode = selectedStation?.code;
      console.log('[onSaveQuais] Station code for refetch:', stationCode);

      normalized.forEach(h => {
        const attributionQuais = typeof h.attribution_quais === 'object' && h.attribution_quais !== null ? h.attribution_quais : {};

        // Utiliser le code de la station au lieu de l'ID
        let quaiForStation = '';
        if (stationCode && attributionQuais[stationCode]) {
          quaiForStation = String(attributionQuais[stationCode]);
        }

        console.log(`[onSaveQuais] Horaire ${h.id}:`, {
          attribution_quais: attributionQuais,
          quaiForStation
        });

        updatedQuais[h.id] = quaiForStation;
      });
      console.log('[onSaveQuais] updatedQuais after refetch:', updatedQuais);
      setQuaisValues(updatedQuais);
    } catch (e) {
      console.error('[onSaveQuais] Error:', e);
      setError('Enregistrement impossible: ' + (e?.message || String(e)));
    } finally {
      setSavingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(horaireId);
        return newSet;
      });
    }
  };

  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerIcon}>
            <wcs-mat-icon icon="alt_route" size="m"></wcs-mat-icon>
          </div>
          <div>
            <h1 className={styles.title}>Attribution des quais</h1>
            <p className={styles.subtitle}>Gérez les affectations de quais par gare et par sens de circulation</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.content}>
        {/* Station Selector Card */}
        <wcs-card className={styles.selectorCard}>
          <wcs-card-body>
            <div className={styles.stationSelector}>
              <div className={styles.selectorLabel}>
                <wcs-mat-icon icon="location_on" size="s"></wcs-mat-icon>
                <span>Sélectionnez une gare</span>
              </div>
              <select
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '15px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
                value={selectedStationId != null ? String(selectedStationId) : ''}
                onChange={(e) => {
                  console.log('[attributions-quais] select onChange event:', e);
                  const v = e.target.value;
                  console.log('[attributions-quais] extracted value:', v);
                  const newId = v && v !== '' ? parseInt(v, 10) : null;
                  console.log('[attributions-quais] parsed newId:', newId);
                  setSelectedStationId(newId);
                  setError(null);
                  setSuccess(null);
                }}
              >
                <option value="">-- Choisir une gare --</option>
                {Array.isArray(stations) && stations.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.nom}
                  </option>
                ))}
              </select>
            </div>

            {selectedStation && (
              <div className={styles.selectedStationInfo}>
                <wcs-badge color="primary">
                  {selectedStation.code || 'N/A'}
                </wcs-badge>
                <span className={styles.stationName}>{selectedStation.nom}</span>
              </div>
            )}
          </wcs-card-body>
        </wcs-card>

        {/* Tabs for Depart/Arrivee */}
        {selectedStationId && (
          <div className={styles.tabsContainer}>
            <wcs-tabs
              align="center"
              activeTabIndex={activeTab === 'depart' ? 0 : 1}
              onWcsTabsChange={(e) => {
                const idx = e?.detail?.activeTabIndex ?? 0;
                setActiveTab(idx === 0 ? 'depart' : 'arrivee');
                setError(null);
                setSuccess(null);
              }}
            >
              <wcs-tab label="Départs">
                <wcs-mat-icon icon="logout" slot="icon"></wcs-mat-icon>
              </wcs-tab>
              <wcs-tab label="Arrivées">
                <wcs-mat-icon icon="login" slot="icon"></wcs-mat-icon>
              </wcs-tab>
            </wcs-tabs>
          </div>
        )}

        {/* Timeline Scrollable Bar - Horaires Overview */}
        {selectedStationId && !loading && filteredHoraires.length > 0 && (
          <div className={styles.timelineCard}>
            <wcs-card>
              <wcs-card-body>
                <div className={styles.timelineHeader}>
                  <div className={styles.timelineTitle}>
                    <wcs-mat-icon icon="schedule" size="s"></wcs-mat-icon>
                    <span>Horaires du jour</span>
                  </div>
                  <wcs-badge color="info">{filteredHoraires.length} train{filteredHoraires.length > 1 ? 's' : ''}</wcs-badge>
                </div>
                <div className={styles.timelineScrollContainer}>
                  <div className={styles.timelineTrack}>
                    {filteredHoraires.map((h) => {
                      // Chercher l'horaire spécifique à la gare sélectionnée
                      let time = null;
                      let destination = null;

                      if (activeTab === 'depart') {
                        // Si c'est un terminus de départ
                        if (h.depart_station_id === selectedStationId) {
                          time = h.depart_time;
                          destination = h.arrivee_station_name || h.arrivee_station_id;
                        } else {
                          // Chercher dans les stops (id ou code)
                          const stop = getStopForStation(h);
                          if (stop && stop.depart_time) {
                            time = stop.depart_time;
                            destination = h.arrivee_station_name || h.arrivee_station_id;
                          }
                        }
                      } else {
                        // Si c'est un terminus d'arrivée
                        if (h.arrivee_station_id === selectedStationId) {
                          time = h.arrivee_time;
                          destination = h.depart_station_name || h.depart_station_id;
                        } else {
                          // Chercher dans les stops (id ou code)
                          const stop = getStopForStation(h);
                          if (stop && stop.arrivee_time) {
                            time = stop.arrivee_time;
                            destination = h.depart_station_name || h.depart_station_id;
                          }
                        }
                      }

                      // Récupérer les quais attribués pour cette gare
                      const attributionQuais = typeof h.attribution_quais === 'object' && h.attribution_quais !== null ? h.attribution_quais : {};
                      // Utiliser le code de la station au lieu de l'ID
                      const stationCode = selectedStation?.code;
                      const assignedQuai = stationCode && attributionQuais[stationCode] ? attributionQuais[stationCode] : '';

                      return (
                        <div key={h.id} className={styles.timelineItem}>
                          <div className={styles.timelineTime}>{time || '--:--'}</div>
                          <div className={styles.timelineDot}></div>
                          <div className={styles.timelineInfo}>
                            <div className={styles.timelineTrain}>
                              <wcs-mat-icon icon="train" size="xs"></wcs-mat-icon>
                              <span>{h.numero_train || `#${h.id}`}</span>
                              {/* Badge indiquant pourquoi l'horaire apparaît (Départ/Arrivée) */}
                              {(() => {
                                const dir = getHoraireDirectionForStation(h);
                                if (!dir) return null;
                                return (
                                  <wcs-badge color={dir === 'depart' ? 'success' : 'warning'} class={styles.directionBadge}>
                                    {dir === 'depart' ? 'Départ' : 'Arrivée'}
                                  </wcs-badge>
                                );
                              })()}
                            </div>
                            <div className={styles.timelineDestination}>{destination || 'N/A'}</div>
                            {h.type_train && (
                              <wcs-badge color="secondary" className={styles.timelineTypeBadge}>
                                {h.type_train}
                              </wcs-badge>
                            )}
                            {/* Affichage du quai attribué */}
                            {assignedQuai && (
                              <div className={styles.timelineQuaisContainer}>
                                <wcs-badge color="primary" className={styles.timelineQuaiBadge}>
                                  <wcs-mat-icon icon="dialpad" size="xs"></wcs-mat-icon>
                                  <span style={{ marginLeft: '4px' }}>{assignedQuai}</span>
                                </wcs-badge>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </wcs-card-body>
            </wcs-card>
          </div>
        )}

        {/* Messages */}
        {error && (
          <wcs-message show class={styles.message} type="error">
            <wcs-mat-icon icon="error" size="m"></wcs-mat-icon>
            <div>{error}</div>
          </wcs-message>
        )}

        {success && (
          <wcs-message show class={styles.message} type="success">
            <wcs-mat-icon icon="check_circle" size="m"></wcs-mat-icon>
            <div>{success}</div>
          </wcs-message>
        )}

        {/* Initial State - Aucune gare sélectionnée */}
        {!selectedStationId && (
          <div className={styles.initialState}>
            <wcs-mat-icon icon="location_searching" size="xl"></wcs-mat-icon>
            <h3>Sélectionnez une gare</h3>
            <p>Choisissez une gare dans la liste ci-dessus pour gérer les attributions de quais.</p>
          </div>
        )}

        {/* Loading State - Chargement en cours */}
        {selectedStationId && loading && (
          <div className={styles.loadingContainer}>
            <wcs-spinner mode="border"></wcs-spinner>
            <p>Chargement des horaires...</p>
          </div>
        )}

        {/* Empty State - Aucun horaire trouvé */}
        {selectedStationId && !loading && filteredHoraires.length === 0 && !error && (
          <div className={styles.emptyState}>
            <wcs-mat-icon icon="info" size="xl"></wcs-mat-icon>
            <h3>Aucun horaire trouvé</h3>
            <p>
              Aucun horaire de {activeTab === 'depart' ? 'départ' : 'arrivée'} n'est défini pour cette gare.
            </p>
          </div>
        )}

        {/* Horaires List */}
        {selectedStationId && !loading && filteredHoraires.length > 0 && (
          <div className={styles.horairesContainer}>
            <div className={styles.horairesHeader}>
              <h2>
                {activeTab === 'depart' ? 'Départs' : 'Arrivées'} à {selectedStation?.nom}
              </h2>
              <wcs-badge color="info">{filteredHoraires.length} train{filteredHoraires.length > 1 ? 's' : ''}</wcs-badge>
            </div>

            <div className={styles.horairesList}>
              {filteredHoraires.map((h) => {
                // Calculer les horaires spécifiques à la gare sélectionnée
                let stationDepartTime = null;
                let stationArriveTime = null;

                // Vérifier si c'est un terminus
                if (h.depart_station_id === selectedStationId) {
                  stationDepartTime = h.depart_time;
                }
                if (h.arrivee_station_id === selectedStationId) {
                  stationArriveTime = h.arrivee_time;
                }

                // Sinon chercher dans les stops
                if (!stationDepartTime || !stationArriveTime) {
                  const stop = getStopForStation(h);
                  if (stop) {
                    if (!stationDepartTime && stop.depart_time) stationDepartTime = stop.depart_time;
                    if (!stationArriveTime && stop.arrivee_time) stationArriveTime = stop.arrivee_time;
                  }
                }

                return (
                  <wcs-card key={h.id} className={styles.horaireCard}>
                    <wcs-card-body>
                      <div className={styles.horaireContent}>
                        {/* Train Info */}
                        <div className={styles.trainInfo}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className={styles.trainNumber}>
                              <wcs-mat-icon icon="train" size="s"></wcs-mat-icon>
                              <strong>{h.numero_train || `#${h.id}`}</strong>
                            </div>
                            {/* Badge direction sur la carte */}
                            {(() => {
                              const dir = getHoraireDirectionForStation(h);
                              if (!dir) return null;
                              return (
                                <wcs-badge color={dir === 'depart' ? 'success' : 'warning'} class={styles.directionBadgeCard}>
                                  {dir === 'depart' ? 'Départ' : 'Arrivée'}
                                </wcs-badge>
                              );
                            })()}
                          </div>
                          {h.type_train && (
                            <wcs-badge color="secondary" className={styles.trainType}>
                              {h.type_train}
                            </wcs-badge>
                          )}
                        </div>

                        {/* Route Info */}
                        <div className={styles.routeInfo}>
                          <div className={styles.routeStation}>
                            <wcs-mat-icon icon="circle" size="xs"></wcs-mat-icon>
                            <div>
                              <div className={styles.stationLabel}>Départ</div>
                              <div className={styles.stationValue}>
                                {h.depart_station_name || h.depart_station_id}
                              </div>
                              <div className={styles.timeValue}>{h.depart_time || '-'}</div>
                            </div>
                          </div>

                          <div className={styles.routeArrow}>
                            <wcs-mat-icon icon="arrow_forward" size="s"></wcs-mat-icon>
                          </div>

                          <div className={styles.routeStation}>
                            <wcs-mat-icon icon="location_on" size="xs"></wcs-mat-icon>
                            <div>
                              <div className={styles.stationLabel}>Arrivée</div>
                              <div className={styles.stationValue}>
                                {h.arrivee_station_name || h.arrivee_station_id}
                              </div>
                              <div className={styles.timeValue}>{h.arrivee_time || '-'}</div>
                            </div>
                          </div>
                        </div>

                        {/* Horaires à la gare sélectionnée */}
                        {(stationDepartTime || stationArriveTime) && (
                          <div className={styles.stationTimesInfo}>
                            <wcs-mat-icon icon="access_time" size="s"></wcs-mat-icon>
                            <div className={styles.stationTimesLabel}>
                              À {selectedStation?.nom}:
                            </div>
                            <div className={styles.stationTimes}>
                              {stationArriveTime && (
                                <span className={styles.stationTimeItem}>
                                  <span className={styles.stationTimeLabel}>Arrivée</span>
                                  <strong>{stationArriveTime}</strong>
                                </span>
                              )}
                              {stationDepartTime && (
                                <span className={styles.stationTimeItem}>
                                  <span className={styles.stationTimeLabel}>Départ</span>
                                  <strong>{stationDepartTime}</strong>
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Quais Assignment */}
                        <div className={styles.quaisSection}>
                          <div className={styles.quaisLabel}>
                            <wcs-mat-icon icon="dialpad" size="s"></wcs-mat-icon>
                            <span>Quai</span>
                          </div>
                          <div className={styles.quaisInput}>
                            {availableQuais.length > 0 ? (
                              <select
                                style={{
                                  width: '100%',
                                  padding: '12px 16px',
                                  fontSize: '15px',
                                  border: '1px solid #ddd',
                                  borderRadius: '8px',
                                  backgroundColor: 'white',
                                  cursor: 'pointer',
                                  fontFamily: 'inherit'
                                }}
                                value={quaisValues[h.id] || ''}
                                onChange={(e) => {
                                  const selectedQuai = e.target.value;
                                  console.log('[select] onChange - horaireId:', h.id, 'selectedQuai:', selectedQuai);
                                  setQuaisValues(prev => ({
                                    ...prev,
                                    [h.id]: selectedQuai
                                  }));
                                }}
                              >
                                <option value="">-- Sélectionner un quai --</option>
                                {availableQuais.map((quaiNom) => (
                                  <option key={quaiNom} value={quaiNom}>
                                    Quai {quaiNom}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className={styles.noQuaisAvailable}>
                                <wcs-mat-icon icon="info" size="s"></wcs-mat-icon>
                                <span>Aucun quai enregistré pour cette gare</span>
                              </div>
                            )}
                          </div>
                          <wcs-button
                            mode="primary"
                            onClick={() => onSaveQuais(h.id)}
                            disabled={
                              savingIds.has(h.id) ||
                              availableQuais.length === 0 ||
                              !quaisValues[h.id] ||
                              quaisValues[h.id].trim() === ''
                            }
                          >
                            {savingIds.has(h.id) ? (
                              <>
                                <wcs-spinner mode="border" size="s"></wcs-spinner>
                                <span style={{ marginLeft: '8px' }}>Enregistrement...</span>
                              </>
                            ) : (
                              <>
                                <wcs-mat-icon icon="save" size="s"></wcs-mat-icon>
                                <span style={{ marginLeft: '4px' }}>Enregistrer</span>
                              </>
                            )}
                          </wcs-button>
                        </div>
                      </div>
                    </wcs-card-body>
                  </wcs-card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
