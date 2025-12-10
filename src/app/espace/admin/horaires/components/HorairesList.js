"use client";
import React, { useEffect, useState } from 'react';

export default function HorairesList({ onEdit, refreshTrigger, onCreate }){
  const [horaires, setHoraires] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    load();
  }, [refreshTrigger]);

  async function load(){
    setLoading(true);
    setErrorMsg('');
    try{
      const res = await fetch('/api/admin/horaires', { method: 'GET', cache: 'no-store' });
      if (!res.ok) {
        const text = await res.text();
        setErrorMsg(text || 'Erreur lors du chargement des horaires');
        setHoraires([]);
      } else {
        const data = await res.json();
        if (Array.isArray(data)) {
          setHoraires(data);
        } else {
          setHoraires([]);
          setErrorMsg('Format de données inattendu');
        }
      }
    } catch(e){
      setErrorMsg(e && e.message ? e.message : 'Erreur réseau');
      setHoraires([]);
    } finally { setLoading(false); }
  }

  async function handleDelete(id){
    if (!confirm('Supprimer cet horaire ?')) return;
    try{
      const res = await fetch(`/api/admin/horaires/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const text = await res.text();
        alert('Suppression impossible: ' + (text || 'Erreur serveur'));
        return;
      }
      load();
    }catch(e){
      alert('Erreur lors de la suppression');
    }
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Horaires</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <wcs-button mode="stroked" onClick={load}>
            <wcs-mat-icon icon="refresh" size="s" />
            Recharger
          </wcs-button>
          <wcs-button mode="stroked" onClick={onCreate}>
            <wcs-mat-icon icon="add" size="s" />
            Créer
          </wcs-button>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <wcs-spinner size="l" />
          <div style={{ marginTop: 8, color: 'var(--wcs-text-medium)' }}>Chargement…</div>
        </div>
      )}

      {errorMsg && (
        <wcs-alert mode="warning" hide-progress-bar>
          <div slot="title">Erreur de chargement</div>
          <div>{errorMsg}</div>
          <div slot="actions">
            <wcs-button mode="stroked" onClick={load}>
              <wcs-mat-icon icon="refresh" size="s" />
              Réessayer
            </wcs-button>
          </div>
        </wcs-alert>
      )}

      {!loading && !errorMsg && (
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--wcs-border-light)' }}>
                <th style={{ padding: 10, textAlign: 'left' }}>ID</th>
                <th style={{ padding: 10, textAlign: 'left' }}>Train</th>
                <th style={{ padding: 10, textAlign: 'left' }}>Type</th>
                <th style={{ padding: 10, textAlign: 'left' }}>Départ</th>
                <th style={{ padding: 10, textAlign: 'left' }}>Arrivée</th>
                <th style={{ padding: 10, textAlign: 'left' }}>Heure départ</th>
                <th style={{ padding: 10, textAlign: 'left' }}>Heure arrivée</th>
                <th style={{ padding: 10, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(horaires) && horaires.length > 0 ? (
                horaires.map((h) => (
                  <tr key={h.id} style={{ borderBottom: '1px solid var(--wcs-border-light)' }}>
                    <td style={{ padding: 10 }}>{h.id}</td>
                    <td style={{ padding: 10 }}>{h.numero_train || '-'}</td>
                    <td style={{ padding: 10 }}>{h.type_train || '-'}</td>
                    <td style={{ padding: 10 }}>{h.depart_station_name || '-'}</td>
                    <td style={{ padding: 10 }}>{h.arrivee_station_name || '-'}</td>
                    <td style={{ padding: 10 }}>{h.depart_time ? String(h.depart_time).slice(0,5) : '-'}</td>
                    <td style={{ padding: 10 }}>{h.arrivee_time ? String(h.arrivee_time).slice(0,5) : '-'}</td>
                    <td style={{ padding: 10, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <wcs-button mode="clear" onClick={() => onEdit && onEdit(h)}>
                          <wcs-mat-icon icon="edit" size="s" />
                        </wcs-button>
                        <wcs-button mode="clear" onClick={() => handleDelete(h.id)}>
                          <wcs-mat-icon icon="delete" size="s" />
                        </wcs-button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={{ padding: 16, textAlign: 'center', color: 'var(--wcs-text-medium)' }} colSpan={8}>
                    Aucun horaire trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
