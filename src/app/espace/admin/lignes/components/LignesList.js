"use client";
import React, { useEffect, useState, useMemo, useRef } from 'react';
import styles from '../lignes.module.css';

export default function LignesList({ onEdit, refreshTrigger }) {
  const [lignes, setLignes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('table'); // cards | table
  const searchRef = useRef(null);

  const [showFilters, setShowFilters] = useState(false);
  const [statutFilter, setStatutFilter] = useState('');

  const quaisModalRef = useRef(null);
  const [quaisPayload, setQuaisPayload] = useState({ title: '', items: [] });

  useEffect(() => { fetchList(); }, [refreshTrigger]);

  useEffect(() => {
    try { const saved = localStorage.getItem('lignes:viewMode'); if (saved === 'cards' || saved === 'table') setViewMode(saved); } catch (e) {}
  }, []);

  useEffect(() => { try { localStorage.setItem('lignes:viewMode', viewMode); } catch(e){} }, [viewMode]);

  useEffect(() => {
    const el = searchRef.current;
    if (!el) return;
    const handler = (e) => {
      try {
        const v = e && e.detail && e.detail.target ? e.detail.target.value : (e && e.target && e.target.value) || el.value;
        setSearchQuery((v || '').toString());
      } catch (err) { /* ignore */ }
    };
    el.addEventListener && el.addEventListener('wcsInput', handler);
    el.addEventListener && el.addEventListener('input', handler);
    return () => {
      el.removeEventListener && el.removeEventListener('wcsInput', handler);
      el.removeEventListener && el.removeEventListener('input', handler);
    };
  }, [searchRef.current]);

  async function fetchList() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/lignes');
      if (res.ok) {
        const data = await res.json();
        setLignes(Array.isArray(data) ? data : []);
      } else {
        setLignes([]);
      }
    } catch (e) {
      console.error('Erreur fetch lignes', e);
      setLignes([]);
    } finally { setLoading(false); }
  }

  const filtered = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    return (lignes || []).filter(l => {
      if (statutFilter) {
        const s = (l.statut || '').toString();
        if (s !== statutFilter) return false;
      }
      if (!q) return true;
      return (l.nom || '').toLowerCase().includes(q) || (l.code || '').toLowerCase().includes(q);
    });
  }, [lignes, searchQuery, statutFilter]);

  async function handleDelete(ligne) {
    if (!confirm(`Supprimer la ligne "${ligne.nom}" ?`)) return;
    try {
      const res = await fetch(`/api/admin/lignes/${ligne.id}`, { method: 'DELETE' });
      if (res.ok) fetchList(); else alert('Erreur suppression');
    } catch (e) { console.error(e); alert('Erreur suppression'); }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '2rem' }}><wcs-spinner mode="border" /></div>;

  return (
    <div>
      {/* bouton toggle mobile */}
      <div className={styles.filterToggle}>
        <button type="button" onClick={() => setShowFilters(true)}>Filtres</button>
      </div>

      {/* overlay mobile */}
      {showFilters && <div className={styles.overlay} onClick={() => setShowFilters(false)} />}

      <aside className={`${styles.filtersAside} ${showFilters ? 'open' : ''}`}>
        <button className={styles.closeFilters} onClick={() => setShowFilters(false)}>Fermer</button>
        <h3 style={{ marginTop: 0 }}>Filtres</h3>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', fontSize: 12 }}>Recherche</label>
          <input type="search" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Nom, code..." style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', fontSize: 12 }}>Statut</label>
          <select value={statutFilter} onChange={e=>setStatutFilter(e.target.value)} style={{ width: '100%' }}>
            <option value="">-- Tous --</option>
            <option value="active">Actif</option>
            <option value="inactive">Inactif</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button type="button" onClick={() => { setSearchQuery(''); setStatutFilter(''); }}>Réinitialiser</button>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#666' }}>{filtered.length} / {lignes.length}</div>
        </div>
      </aside>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <wcs-input placeholder="Rechercher une ligne..." ref={searchRef} value={searchQuery} style={{ minWidth: 240 }}></wcs-input>
          {searchQuery && <wcs-button mode="clear" onClick={() => setSearchQuery('')}><wcs-mat-icon icon="close" /></wcs-button>}
        </div>
        <div>
          <wcs-button mode={viewMode==='cards' ? 'filled' : 'clear'} onClick={() => setViewMode('cards')} title="Affichage cartes"><wcs-mat-icon icon="grid_view" /></wcs-button>
          <wcs-button mode={viewMode==='table' ? 'filled' : 'clear'} onClick={() => setViewMode('table')} title="Affichage tableau"><wcs-mat-icon icon="table_rows" /></wcs-button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.emptyState}><p>Aucune ligne trouvée</p></div>
      ) : (
        viewMode === 'table' ? (
          <div className={styles.wcsTableWrap}>
            <wcs-grid id="grid-lignes" selection-config="none" row-id-path="id" server-mode={true} data={filtered}>
              <wcs-grid-column name="Nom" path="nom" sort=""></wcs-grid-column>
              <wcs-grid-column name="Code" path="code" sort=""></wcs-grid-column>
              <wcs-grid-column name="Arrêts" path="stops" sort=""></wcs-grid-column>
              <wcs-grid-column name="Communications" path="communications" sort=""></wcs-grid-column>
              <wcs-grid-column name="Actions" path="id" sort=""></wcs-grid-column>

              {filtered.map(l => (
                <React.Fragment key={l.id}>
                  <wcs-grid-custom-cell slot={`stops-${l.id}`} column-id="stops" row-id={l.id}>
                    {l.stops && l.stops.length ? (
                      <wcs-button mode="clear" shape="small" onClick={() => openQuaisModal(l)}>
                        <wcs-mat-icon icon="view_list" size="s" />
                        <span style={{ marginLeft: 8 }}>{l.stops.length} arrêt(s)</span>
                      </wcs-button>
                    ) : (<span style={{ color: '#999' }}>Aucun</span>)}
                  </wcs-grid-custom-cell>

                  <wcs-grid-custom-cell slot={`communications-${l.id}`} column-id="communications" row-id={l.id}>
                    {l.communications && Object.keys(l.communications).length ? (
                      <div style={{ fontSize: '0.9em' }}>{JSON.stringify(l.communications)}</div>
                    ) : (<span style={{ color: '#999' }}>Aucun</span>)}
                  </wcs-grid-custom-cell>

                  <wcs-grid-custom-cell slot={`id-${l.id}`} column-id="id" row-id={l.id}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <wcs-button mode="clear" shape="small" onClick={() => onEdit && onEdit(l)}><wcs-mat-icon icon="edit" /></wcs-button>
                      <wcs-button mode="clear" shape="small" onClick={() => handleDelete(l)}><wcs-mat-icon icon="delete" /></wcs-button>
                    </div>
                  </wcs-grid-custom-cell>
                </React.Fragment>
              ))}

            </wcs-grid>
          </div>
        ) : (
          <div className={styles.cardsWrap}>
            {filtered.map(l => (
              <wcs-card key={l.id} mode="elevated" class={styles.card}>
                <wcs-card-header>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <div>
                      <div style={{ fontWeight:700 }}>{l.nom}</div>
                      <div style={{ color: '#666' }}>{l.code || '-'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <wcs-button mode="clear" shape="small" onClick={() => onEdit && onEdit(l)}><wcs-mat-icon icon="edit" /></wcs-button>
                      <wcs-button mode="clear" shape="small" onClick={() => handleDelete(l)}><wcs-mat-icon icon="delete" /></wcs-button>
                    </div>
                  </div>
                </wcs-card-header>
                <wcs-card-body>
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: '0.9em', color: '#333' }}>{l.stops && l.stops.length ? `${l.stops.length} arrêt(s)` : 'Aucun arrêt'}</div>
                  </div>
                </wcs-card-body>
              </wcs-card>
            ))}
          </div>
        )
      )}

      {/* Modal WCS pour afficher les quais d'une ou plusieurs gares */}
      {/* hidden fallback trigger for quais modal */}
      <button id="quais-modal-trigger-fallback" style={{ display: 'none' }} aria-hidden="true" />
      <wcs-modal ref={quaisModalRef} modal-trigger-controls-id="quais-modal-trigger-fallback" show-close-button size="m">
        <div slot="header">{quaisPayload.title || 'Quais'}</div>
        <div style={{ padding: 12, maxHeight: '60vh', overflow: 'auto' }}>
          {quaisPayload.items && quaisPayload.items.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {quaisPayload.items.map((it, i) => (
                <wcs-card key={i} mode="outline">
                  <wcs-card-header>
                    <div style={{ fontWeight: 700 }}>{it.stationName}</div>
                  </wcs-card-header>
                  <wcs-card-body>
                    {it.quais && it.quais.length ? (
                      <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {it.quais.map((q, qi) => <li key={qi}>{q.nom || ('Quai ' + (qi+1))}</li>)}
                      </ul>
                    ) : (<div style={{ color: '#666' }}>Aucun quai</div>)}
                  </wcs-card-body>
                </wcs-card>
              ))}
            </div>
          ) : (<div style={{ color: '#666' }}>Aucun quai à afficher</div>)}
        </div>
      </wcs-modal>
    </div>
  );

  async function openQuaisModal(ligne) {
    // Récupère pour chaque stop la station et ses quais
    const items = [];
    if (!ligne || !ligne.stops || ligne.stops.length === 0) {
      setQuaisPayload({ title: `Quais - ${ligne.nom || ''}`, items: [] });
      if (quaisModalRef.current) quaisModalRef.current.setAttribute('show', '');
      return;
    }
    for (const s of ligne.stops) {
      try {
        const id = s.station_id || s.stationId || s.id;
        if (!id) continue;
        const res = await fetch(`/api/admin/stations/${id}`);
        if (res.ok) {
          const st = await res.json();
          items.push({ stationName: st.nom || st.name || `#${id}`, quais: st.quais || [] });
        } else {
          items.push({ stationName: `#${id}`, quais: [] });
        }
      } catch (e) {
        items.push({ stationName: `#${s.station_id || s.stationId || s.id}`, quais: [] });
      }
    }
    setQuaisPayload({ title: `Quais - ${ligne.nom || ''}`, items });
    if (quaisModalRef.current) quaisModalRef.current.setAttribute('show', '');
  }
}
