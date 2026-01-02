"use client";
import React, { useEffect, useState } from 'react';
import PerturbationModal from './PerturbationModal';

export default function PerturbationsHistory(){
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null); // objet en édition
  const [horaireMap, setHoraireMap] = useState({});

  useEffect(() => { load(); }, []);

  async function load(){
    setLoading(true); setError('');
    try{
      const res = await fetch('/api/admin/perturbations', { method: 'GET', cache: 'no-store' });
      if (!res.ok) {
        const t = await res.text(); setError(t || 'Erreur serveur'); setData([]);
        setLoading(false);
        return;
      }
      const perturb = await res.json();
      setData(Array.isArray(perturb) ? perturb : []);

      // Récupérer également les horaires pour afficher un label lisible
      try {
        const r2 = await fetch('/api/admin/horaires', { method: 'GET', cache: 'no-store' });
        if (r2.ok) {
          const hs = await r2.json();
          if (Array.isArray(hs)) {
            const map = {};
            hs.forEach(h => { if (h && h.id) map[h.id] = h.numero_train || h.code || (h.depart_station_name && h.arrivee_station_name ? `${h.depart_station_name} → ${h.arrivee_station_name}` : h.id); });
            setHoraireMap(map);
          }
        }
      } catch (e) {
        console.warn('Impossible de charger les horaires pour mapping:', e);
      }

    } catch(e){ setError(e && e.message ? e.message : 'Erreur réseau'); setData([]); }
    setLoading(false);
  }

  const startEdit = (p) => {
    // clone de l'objet pour édition
    setEditing(JSON.parse(JSON.stringify(p)));
  };

  const cancelEdit = () => setEditing(null);

  const saveEdit = async () => {
    // replaced by PerturbationModal onSaved handler
    await load();
    setEditing(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Perturbations <span style={{ color: 'var(--wcs-text-medium)', fontWeight: 400, marginLeft: 8 }}>({data.length})</span></h3>
        <div>
          <wcs-button mode="stroked" onClick={load}><wcs-mat-icon icon="refresh" size="s" /> Recharger</wcs-button>
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 24 }}><wcs-spinner size="l" /></div>}
      {error && <wcs-alert mode="warning"><div slot="title">Erreur</div><div>{error}</div></wcs-alert>}

      {!loading && !error && data.length === 0 && (
        <wcs-card mode="flat">
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--wcs-text-medium)' }}>
            Aucune perturbation trouvée.
          </div>
        </wcs-card>
      )}

      {!loading && !error && data.length > 0 && (
        <wcs-card mode="elevated">
          <div style={{ padding: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--wcs-border-light)' }}>
                  <th style={{ padding: 8, textAlign: 'left' }}>Type</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Sillon</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Créé le</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Détails</th>
                  <th style={{ padding: 8, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--wcs-border-light)' }}>
                    <td style={{ padding: 8 }}>{p.type}</td>
                    <td style={{ padding: 8 }}>{(p.horaire_id && horaireMap[p.horaire_id]) ? horaireMap[p.horaire_id] : (p.numero_train ? p.numero_train : (p.horaire_id ? String(p.horaire_id).slice(0,8) : '-'))}</td>
                    <td style={{ padding: 8 }}>{p.created_at ? String(p.created_at).slice(0,19).replace('T',' ') : '-'}</td>
                    <td style={{ padding: 8 }}>{p.parcours_changes && Array.isArray(p.parcours_changes) ? `${p.parcours_changes.length} arrêt(s)` : (p.parcours_changes ? 'Détails' : '-')}</td>
                    <td style={{ padding: 8, textAlign: 'center' }}>
                      <wcs-button mode="clear" onClick={() => setSelected(p)} aria-label={`Voir perturbation ${p.id}`}><wcs-mat-icon icon="visibility" size="s" /></wcs-button>
                      <wcs-button mode="stroked" onClick={() => startEdit(p)} style={{ marginLeft: 8 }}>Modifier</wcs-button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </wcs-card>
      )}

      {selected && (
        <wcs-modal show show-close-button close-button-aria-label="Fermer">
          <div slot="header">Détail de la perturbation</div>
          <div style={{ padding: 12 }}>
            <div style={{ marginBottom: 8 }}><strong>Type:</strong> {selected.type}</div>
            <div style={{ marginBottom: 8 }}><strong>Sillon:</strong> {(selected.horaire_id && horaireMap[selected.horaire_id]) ? horaireMap[selected.horaire_id] : (selected.numero_train ? selected.numero_train : (selected.horaire_id ? String(selected.horaire_id).slice(0,8) : '-'))}</div>
            <div style={{ marginBottom: 8 }}><strong>Temps retard global:</strong> {selected.temps_retard_minutes ?? '-'}</div>
            <div style={{ marginBottom: 8 }}><strong>Jours impactés:</strong> {Array.isArray(selected.jours_impact) ? selected.jours_impact.join(', ') : (selected.jours_impact ? JSON.stringify(selected.jours_impact) : '-')}</div>
            <div style={{ marginTop: 12 }}>
              <strong>Parcours changes:</strong>
              {selected.parcours_changes ? (
                <div style={{ marginTop: 8 }}>
                  {Array.isArray(selected.parcours_changes) ? (
                    selected.parcours_changes.map((c, i) => (
                      <div key={i} style={{ padding: 8, border: '1px solid var(--wcs-border-light)', borderRadius: 6, marginBottom: 8 }}>
                        <div><strong>{c.nom || c.station || c.id}</strong></div>
                        <div style={{ color: 'var(--wcs-text-medium)' }}>Action: {c.action || '-'}</div>
                        <div style={{ color: 'var(--wcs-text-medium)' }}>Delay: {c.delayMinutes ?? '-'}</div>
                        <div style={{ color: 'var(--wcs-text-medium)' }}>Cause: {c.cause || '-'}</div>
                      </div>
                    ))
                  ) : (
                    <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(selected.parcours_changes, null, 2)}</pre>
                  )}
                </div>
              ) : (
                <div style={{ color: 'var(--wcs-text-medium)' }}>Aucun changement de parcours</div>
              )}
            </div>
          </div>
          <div slot="actions">
            <wcs-button mode="stroked" onClick={() => setSelected(null)}>Fermer</wcs-button>
          </div>
        </wcs-modal>
      )}

      {editing && (
        <PerturbationModal initialData={editing} onClose={cancelEdit} onSaved={load} />
      )}
    </div>
  );
}
