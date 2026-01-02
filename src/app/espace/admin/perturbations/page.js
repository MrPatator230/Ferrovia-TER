"use client";
import React, { useEffect, useState } from 'react';
import PerturbationsList from './PerturbationsList';
import PerturbationsHistory from './PerturbationsHistory';

export default function PerturbationsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [sillons, setSillons] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('liste');

  useEffect(() => {
    let mounted = true;
    async function loadSillons() {
      setIsLoading(true);
      setErrorMsg('');
      try {
        // Utiliser l'API route comme pour HorairesList
        const res = await fetch('/api/admin/horaires', { method: 'GET', cache: 'no-store' });
        if (!res.ok) {
          const text = await res.text();
          setErrorMsg(text || 'Erreur lors du chargement des horaires');
          setSillons([]);
        } else {
          const data = await res.json();
          if (Array.isArray(data) && mounted) {
            setSillons(data);
          } else {
            setSillons([]);
            setErrorMsg('Format de données inattendu');
          }
        }
      } catch (e) {
        console.error(e);
        setErrorMsg(e && e.message ? e.message : 'Erreur réseau');
        setSillons([]);
      }
      setIsLoading(false);
    }
    loadSillons();
    return () => { mounted = false; };
  }, [refreshKey]);

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: '0 auto' }}>
      <wcs-card mode="flat" style={{ marginBottom: 16 }}>
        <div slot="header"><wcs-card-title><wcs-mat-icon icon="warning" size="s"></wcs-mat-icon>Gestion des perturbations</wcs-card-title></div>
        <div style={{ padding: 12 }}>
          <p>Attribuez des retards, suppressions ou modifications de parcours sur un sillon existant.</p>
        </div>
      </wcs-card>

      {errorMsg && (
        <wcs-alert mode="warning" hide-progress-bar style={{ marginBottom: 16 }}>
          <div slot="title">Erreur de chargement</div>
          <div>{errorMsg}</div>
          <div slot="actions">
            <wcs-button mode="stroked" onClick={() => setRefreshKey(k => k + 1)}>
              <wcs-mat-icon icon="refresh" size="s"></wcs-mat-icon>
              Réessayer
            </wcs-button>
          </div>
        </wcs-alert>
      )}

      <wcs-tabs selected-key={activeTab} onChange={(e) => setActiveTab(e?.detail?.selectedKey || e?.detail?.tabName || e?.detail?.key)}>
        <wcs-tab header="Liste des Sillons" item-key="liste"></wcs-tab>
        <wcs-tab header="Liste des Perturbations" item-key="perturbations"></wcs-tab>
      </wcs-tabs>

      <div style={{ marginTop: 16 }}>
        {activeTab === 'liste' && <PerturbationsList key={refreshKey} sillons={sillons} isLoading={isLoading} onRefresh={() => setRefreshKey(k => k + 1)} />}
        {activeTab === 'perturbations' && <PerturbationsHistory />}
      </div>
    </div>
  );
}
