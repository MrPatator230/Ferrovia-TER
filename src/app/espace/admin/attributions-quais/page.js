"use client";
import React, { useEffect, useMemo, useState } from 'react';
import styles from '../admin.module.css';

export default function PageAttributionsQuais() {
  const [stations, setStations] = useState([]);
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [activeTab, setActiveTab] = useState('depart');
  const [horaires, setHoraires] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [quaisValues, setQuaisValues] = useState({});

  // charger toutes les gares au montage
  useEffect(() => {
    let mounted = true;
    fetch('/api/admin/stations')
      .then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
      .then((data) => {
        if (mounted) setStations(Array.isArray(data) ? data : []);
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

  // charger horaires par gare + onglet
  useEffect(() => {
    console.log('useEffect horaires - canFetch:', canFetch, 'selectedStationId:', selectedStationId, 'activeTab:', activeTab);
    if (!canFetch) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    const url = `/api/admin/horaires/by-station?id=${selectedStationId}&type=${activeTab}`;
    console.log('Fetching horaires from:', url);
    fetch(url)
      .then(r => {
        console.log('Response status:', r.status, r.ok);
        return r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status));
      })
      .then((data) => {
        console.log('Horaires data received:', data);
        if (mounted) {
          const normalized = Array.isArray(data) ? data : [];
          console.log('Normalized horaires:', normalized.length, 'items');
          setHoraires(normalized);
          // initialiser les valeurs de quais
          const initialQuais = {};
          normalized.forEach(h => {
            const sStop = Array.isArray(h.stops) ? h.stops.find(st => st.station_id === selectedStationId) : null;
            const q = sStop && Array.isArray(sStop.quais) ? sStop.quais : [];
            initialQuais[h.id] = q.join(', ');
          });
          setQuaisValues(initialQuais);
        }
      })
      .catch(e => {
        console.error('Error fetching horaires:', e);
        if (mounted) setError('Impossible de charger les horaires: ' + (e?.message || String(e)));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [selectedStationId, activeTab, canFetch]);

  const onSaveQuais = async (horaireId) => {
    const quaisStr = quaisValues[horaireId] || '';
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/horaires/${horaireId}/quais`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ station_id: selectedStationId, quais: quaisStr }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Erreur lors de l\'enregistrement');
      // refetch
      const r = await fetch(`/api/admin/horaires/by-station?id=${selectedStationId}&type=${activeTab}`);
      const d = await r.json();
      const normalized = Array.isArray(d) ? d : [];
      setHoraires(normalized);
      // réinitialiser les valeurs
      const updatedQuais = {};
      normalized.forEach(h => {
        const sStop = Array.isArray(h.stops) ? h.stops.find(st => st.station_id === selectedStationId) : null;
        const q = sStop && Array.isArray(sStop.quais) ? sStop.quais : [];
        updatedQuais[h.id] = q.join(', ');
      });
      setQuaisValues(updatedQuais);
    } catch (e) {
      setError('Enregistrement impossible: ' + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1>Attributions des quais</h1>

      {/* Debug info */}
      <div style={{ marginBottom: 10, padding: 10, backgroundColor: '#f0f0f0', fontSize: '12px', fontFamily: 'monospace' }}>
        <strong>Debug:</strong> stations.length={stations.length}, selectedStationId={String(selectedStationId)}, activeTab={activeTab},
        canFetch={String(canFetch)}, loading={String(loading)},
        horaires.length={horaires.length}, error={error ? 'oui' : 'non'}
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
          Sélectionnez une gare
        </label>
        <wcs-select
          value={selectedStationId != null ? String(selectedStationId) : ''}
          onWcsChange={(e) => {
            const v = e?.detail?.value;
            const newId = v ? parseInt(v, 10) : null;
            console.log('Station selected - value from event:', v, 'parsed:', newId);
            setSelectedStationId(newId);
          }}
        >
          <wcs-select-option value="">-- Choisir une gare --</wcs-select-option>
          {Array.isArray(stations) && stations.map((s) => (
            <wcs-select-option key={s.id} value={String(s.id)}>
              {s.nom}
            </wcs-select-option>
          ))}
        </wcs-select>
      </div>

      {selectedStationId && (
        <div style={{ marginTop: 20 }}>
          <wcs-tabs
            activeTabIndex={activeTab === 'depart' ? 0 : 1}
            onWcsTabsChange={(e) => {
              const idx = e?.detail?.activeTabIndex ?? 0;
              setActiveTab(idx === 0 ? 'depart' : 'arrivee');
            }}
          >
            <wcs-tab label="Départs"></wcs-tab>
            <wcs-tab label="Arrivées"></wcs-tab>
          </wcs-tabs>
        </div>
      )}

      {loading && (
        <div style={{ marginTop: 20 }}>
          <p>⏳ Chargement...</p>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 20, padding: 10, backgroundColor: '#fee', border: '1px solid #c33', borderRadius: 4 }}>
          <p style={{ color: '#c33', margin: 0 }}>{error}</p>
        </div>
      )}

      {selectedStationId && !loading && horaires.length > 0 && (
        <div style={{ marginTop: 20, overflowX: 'auto' }}>
          <table className={styles.table} style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd', backgroundColor: '#f5f5f5' }}>ID</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd', backgroundColor: '#f5f5f5' }}>Train</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd', backgroundColor: '#f5f5f5' }}>Type</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd', backgroundColor: '#f5f5f5' }}>Départ</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd', backgroundColor: '#f5f5f5' }}>Arrivée</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd', backgroundColor: '#f5f5f5' }}>H. Départ</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd', backgroundColor: '#f5f5f5' }}>H. Arrivée</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd', backgroundColor: '#f5f5f5' }}>Quais</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd', backgroundColor: '#f5f5f5' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {horaires.map((h) => (
                <tr key={h.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                  <td style={{ padding: '12px' }}>{h.id}</td>
                  <td style={{ padding: '12px' }}>{h.numero_train || '-'}</td>
                  <td style={{ padding: '12px' }}>{h.type_train || '-'}</td>
                  <td style={{ padding: '12px' }}>{h.depart_station_name || h.depart_station_id}</td>
                  <td style={{ padding: '12px' }}>{h.arrivee_station_name || h.arrivee_station_id}</td>
                  <td style={{ padding: '12px' }}>{h.depart_time || '-'}</td>
                  <td style={{ padding: '12px' }}>{h.arrivee_time || '-'}</td>
                  <td style={{ padding: '12px' }}>
                    <wcs-input
                      placeholder="Ex: 3A, 4B"
                      value={quaisValues[h.id] || ''}
                      onWcsChange={(e) => {
                        const newValue = e?.detail?.value || '';
                        setQuaisValues(prev => ({ ...prev, [h.id]: newValue }));
                      }}
                      style={{ width: '150px' }}
                    ></wcs-input>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <wcs-button
                      mode="primary"
                      size="s"
                      onClick={() => onSaveQuais(h.id)}
                    >
                      Enregistrer
                    </wcs-button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedStationId && !loading && horaires.length === 0 && !error && (
        <div style={{ marginTop: 20, padding: 20, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
          <p style={{ margin: 0, textAlign: 'center' }}>
            Aucun horaire trouvé pour cette gare en {activeTab === 'depart' ? 'départ' : 'arrivée'}.
          </p>
        </div>
      )}
    </div>
  );
}
