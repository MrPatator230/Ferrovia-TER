"use client";
import React, { useState } from 'react';
import PerturbationModal from './PerturbationModal';

export default function PerturbationsList({ perturbations = null, sillons = [], isLoading, onRefresh }) {
  // backward compat: if perturbations not fourni, fallback to sillons (ancien usage)
  const list = Array.isArray(perturbations) ? perturbations : sillons;

  const [query, setQuery] = useState('');
  const [selectedPerturbation, setSelectedPerturbation] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const openModal = (pert = null) => { setSelectedPerturbation(pert); setShowModal(true); };
  const closeModal = () => { setSelectedPerturbation(null); setShowModal(false); };

  const filtered = list.filter(p => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (p.numero_train && String(p.numero_train).toLowerCase().includes(q)) ||
      (p.type && String(p.type).toLowerCase().includes(q)) ||
      (p.cause && String(p.cause).toLowerCase().includes(q)) ||
      (p.numero_train && String(p.numero_train).toLowerCase().includes(q)) ||
      (p.horaire && p.horaire.depart_station_name && String(p.horaire.depart_station_name).toLowerCase().includes(q)) ||
      (p.horaire && p.horaire.arrivee_station_name && String(p.horaire.arrivee_station_name).toLowerCase().includes(q))
    );
  });

  async function handleDelete(id) {
    if (!id) return;
    const ok = confirm('Supprimer cette perturbation ? Cette action est irréversible.');
    if (!ok) return;
    try {
      setDeletingId(id);
      const res = await fetch('/api/admin/perturbations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('Delete perturbation failed', res.status, text);
        alert('Erreur suppression: ' + res.status);
      } else {
        onRefresh && onRefresh();
      }
    } catch (e) {
      console.error('Erreur suppression perturbation', e);
      alert('Erreur suppression');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
        <input placeholder="Rechercher une perturbation par numéro, type, cause..." value={query} onChange={e => setQuery(e.target.value)} style={{ flex: 1, padding: 8 }} />
        <wcs-button mode="stroked" style={{ marginLeft: 12 }} onClick={() => openModal(null)}>Créer une perturbation</wcs-button>
      </div>

      <wcs-card mode="elevated">
        <div style={{ padding: 12 }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 24 }}><wcs-spinner size="m"></wcs-spinner></div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 8 }}>Sillon</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Type</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Cause</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Jours impactés</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Temps retard (min)</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map(p => (
                    <tr key={p.id || `${p.horaire_id || 'h'}-${p.numero_train || ''}`} style={{ borderBottom: '1px solid var(--wcs-border-color)' }}>
                      <td style={{ padding: 8 }}>{p.numero_train || (p.horaire && p.horaire.numero_train) || '-'}</td>
                      <td style={{ padding: 8 }}>{p.type || '-'}</td>
                      <td style={{ padding: 8 }}>{p.cause || p.reason || '-'}</td>
                      <td style={{ padding: 8 }}>{Array.isArray(p.jours_impact) ? p.jours_impact.join(', ') : (p.jours_impact || '-')}</td>
                      <td style={{ padding: 8 }}>{p.temps_retard_minutes ?? p.temps_retard ?? (p.temps_retard_minutes === 0 ? '0' : '-')}</td>
                      <td style={{ padding: 8 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <wcs-button mode="stroked" onClick={() => openModal(p)}>Modifier</wcs-button>
                          <wcs-button mode="danger" onClick={() => handleDelete(p.id)} disabled={deletingId === p.id}>{deletingId === p.id ? 'Suppression…' : 'Supprimer'}</wcs-button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--wcs-text-medium)' }}>
                      {query ? 'Aucune perturbation trouvée pour cette recherche' : 'Aucune perturbation disponible'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </wcs-card>

      {showModal && (
        <PerturbationModal perturbation={selectedPerturbation} onClose={closeModal} onSaved={() => { closeModal(); onRefresh && onRefresh(); }} />
      )}
    </div>
  );
}
