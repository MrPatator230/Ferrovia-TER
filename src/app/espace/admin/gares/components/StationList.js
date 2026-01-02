"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import styles from '../gares.module.css';

export default function StationList({ onEdit, refreshTrigger }) {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  // état pour suivre quelles gares ont la liste des quais étendue
  const [expandedQuais, setExpandedQuais] = useState({});

  // Nouveau: recherche et mode d'affichage
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  // Modal WCS pour afficher tous les quais
  const modalRef = useRef(null);
  const [modalStation, setModalStation] = useState(null);

  // Pagination / server-like state pour wcs-grid
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [itemsCount, setItemsCount] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [pagedStations, setPagedStations] = useState([]);

  // Synchronisation viewMode entre onglets
  useEffect(() => {
    function onStorage(e) {
      if (e.key === 'stations:viewMode') {
        const val = e.newValue;
        if (val === 'cards' || val === 'table') setViewMode(val);
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorage);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', onStorage);
      }
    };
  }, []);

  useEffect(() => {
    fetchStations();
  }, [refreshTrigger]);

  // Restaurer le dernier mode d'affichage depuis localStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('stations:viewMode');
        if (saved === 'cards' || saved === 'table') setViewMode(saved);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Persister le choix dans localStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('stations:viewMode', viewMode);
      }
    } catch (e) {
      // ignore
    }
  }, [viewMode]);

  async function fetchStations() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stations');
      if (res.ok) {
        const data = await res.json();
        setStations(data);
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des gares:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(station) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la gare "${station.nom}" ?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/stations/${station.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchStations();
      } else {
        alert('Erreur lors de la suppression de la gare');
      }
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      alert('Erreur lors de la suppression de la gare');
    }
  }

  function getTransportLabel(type) {
    const labels = {
      bus: 'Bus',
      tram: 'Tramway',
      metro: 'Métro',
      train: 'Train',
      tramtrain: 'Tram-train'
    };
    return labels[type] || type;
  }

  function getTransportIcon(type) {
    // Icônes Material approximatives — ajustez si vous avez une liste d'icônes WCS spécifique
    const icons = {
      bus: 'directions_bus',
      tram: 'tram',
      metro: 'subway',
      train: 'train',
      tramtrain: 'tram'
    };
    return icons[type] || 'directions';
  }

  function toggleQuais(stationId) {
    setExpandedQuais(prev => ({ ...prev, [stationId]: !prev[stationId] }));
  }

  // Ouvre la modale WCS et affiche les quais de la station — on fetch la station fraîche depuis l'API
  async function openQuaisModal(station) {
    setModalStation(null);

    // si la station a un id, on fetch la version la plus récente
    const id = station && (station.id || station._id);
    if (id) {
      try {
        const res = await fetch(`/api/admin/stations/${id}`);
        if (res.ok) {
          const fresh = await res.json();
          setModalStation(fresh);
        } else {
          // fallback sur la station fournie
          setModalStation(station);
        }
      } catch (err) {
        console.error('Erreur fetch station avant modale:', err);
        setModalStation(station);
      }
    } else {
      setModalStation(station);
    }

    // ouvrir la modale (après un court délai pour laisser le composant se monter)
    setTimeout(() => {
      try {
        // assigner un id unique au control qui a ouvert la modale
        const triggerId = `open-quais-btn-${station.id}`;
        const triggerBtn = document.getElementById(triggerId);
        if (triggerBtn) {
          // passer l'id comme contrôle lié à la modale (WCS attend cet attribut)
          modalRef.current && modalRef.current.setAttribute('modal-trigger-controls-id', triggerId);
        }
        modalRef.current && modalRef.current.setAttribute('show', '');
      } catch (e) {}
    }, 50);
  }

  function closeModal() {
    try {
      modalRef.current && modalRef.current.removeAttribute('show');
    } catch (e) {}
    // retarder la suppression du contenu pour laisser l'animation de fermeture
    setTimeout(() => setModalStation(null), 120);
  }

  // Filtrage des gares selon la recherche (nom, services, transports)
  const filteredStations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return stations;

    return stations.filter(s => {
      const matchName = s.nom && s.nom.toLowerCase().includes(q);
      const matchService = Array.isArray(s.service) && s.service.some(serv => serv.toLowerCase().includes(q));
      const matchTransport = Array.isArray(s.transports_commun) && s.transports_commun.some(t => {
        const type = (t.type || '').toString().toLowerCase();
        const label = getTransportLabel(t.type).toLowerCase();
        return type.includes(q) || label.includes(q) || (t.couleur || '').toLowerCase().includes(q);
      });

      return !!(matchName || matchService || matchTransport);
    });
  }, [stations, searchQuery]);

  // Mettre à jour la pagination quand la liste filtrée change
  useEffect(() => {
    const total = filteredStations ? filteredStations.length : 0;
    setItemsCount(total);
    const pc = Math.max(1, Math.ceil(total / pageSize));
    setPageCount(pc);
    // si la page courante dépasse maintenant la pageCount, la remettre à 0
    setCurrentPage(prev => (prev >= pc ? 0 : prev));
  }, [/* stations list changes */ filteredStations, pageSize]);

  // Construire la page courante
  useEffect(() => {
    const start = currentPage * pageSize;
    const end = start + pageSize;
    setPagedStations(filteredStations.slice(start, end));
  }, [filteredStations, currentPage, pageSize]);

  // Gestionnaire pour l'événement de pagination émis par wcs-grid-pagination
  function handleGridPaginationChange(e) {
    try {
      const details = e?.detail?.pagination;
      if (!details) return;
      const newPage = typeof details.currentPage === 'number' ? details.currentPage : currentPage;
      const newPageSize = typeof details.pageSize === 'number' ? details.pageSize : pageSize;
      setPageSize(newPageSize);
      setCurrentPage(newPage);
    } catch (err) {
      // ignore
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <wcs-spinner mode="border" />
      </div>
    );
  }

  if (!stations || stations.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>Aucune gare enregistrée</p>
        <p style={{ fontSize: '0.875rem', color: '#999' }}>
          Cliquez sur "Créer" pour ajouter votre première gare
        </p>
      </div>
    );
  }

  // Affichage quand la recherche ne retourne rien
  if (filteredStations.length === 0) {
    return (
      <div>
        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une gare, un service ou un transport..."
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', minWidth: 280 }}
              aria-label="Recherche de gares"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }} aria-label="Effacer la recherche">✕</button>
            )}
          </div>

          <div>
            <button
              onClick={() => setViewMode('cards')}
              aria-pressed={viewMode === 'cards'}
              title="Affichage en cartes"
              style={{ marginRight: 8 }}
            >
              <wcs-mat-icon icon="grid_view" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              aria-pressed={viewMode === 'table'}
              title="Affichage en tableau"
            >
              <wcs-mat-icon icon="table_rows" />
            </button>
          </div>
        </div>

        <div className={styles.emptyState}>
          <p>Aucune gare ne correspond à votre recherche</p>
          <p style={{ fontSize: '0.875rem', color: '#999' }}>
            Essayez un autre terme de recherche ou cliquez sur "Créer" pour ajouter une gare
          </p>
        </div>
      </div>
    );
  }

  // Rendu en tableau
  function renderTable() {
    return (
      <div className={styles.wcsTableWrap}>
        <wcs-grid id="grid-simple-1" server-mode={true} data={pagedStations} selection-config="none" row-id-path="id">
          <wcs-grid-column name="Nom" path="nom" sort=""></wcs-grid-column>
          <wcs-grid-column name="Type" path="type_gare" sort=""></wcs-grid-column>
          <wcs-grid-column name="Services" path="service" sort=""></wcs-grid-column>
          <wcs-grid-column name="Quais" path="quais" sort=""></wcs-grid-column>
          <wcs-grid-column name="Transports" path="transports_commun" sort=""></wcs-grid-column>
          <wcs-grid-column name="Actions" path="id" sort=""></wcs-grid-column>

          {/* Pagination control for the grid - slotted into grid-pagination */}
          <wcs-grid-pagination slot="grid-pagination"
            available-page-sizes={[10,20,50]}
            page-size={pageSize}
            items-count={itemsCount}
            page-count={pageCount}
            current-page={currentPage}
            onWcsGridPaginationChange={handleGridPaginationChange}
          />

          {/* slotted custom cells for each row */}
          {pagedStations.map(station => (
            <React.Fragment key={station.id}>
              <wcs-grid-custom-cell slot={`service-${station.id}`} column-id="service" row-id={station.id}>
                {Array.isArray(station.service) && station.service.length > 0 ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {station.service.map((s, idx) => (
                      <wcs-badge key={idx} color="primary">{s}</wcs-badge>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: '#999' }}>Aucun</span>
                )}
              </wcs-grid-custom-cell>

              <wcs-grid-custom-cell slot={`quais-${station.id}`} column-id="quais" row-id={station.id}>
                {station.quais && station.quais.length > 0 ? (
                  <wcs-button id={`open-quais-btn-${station.id}`} mode="clear" shape="small" onClick={() => openQuaisModal(station)} title={`Voir ${station.quais.length} quai(s)`}>
                    <wcs-mat-icon icon="view_list" size="s" />
                    <span style={{ marginLeft: 8 }}>{station.quais.length} quai(s)</span>
                  </wcs-button>
                ) : (
                  <span style={{ color: '#999' }}>Aucun</span>
                )}
              </wcs-grid-custom-cell>

              <wcs-grid-custom-cell slot={`transports_commun-${station.id}`} column-id="transports_commun" row-id={station.id}>
                {station.transports_commun && station.transports_commun.length > 0 ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {station.transports_commun.map((transport, idx) => (
                      <wcs-badge key={idx} title={getTransportLabel(transport.type)} style={{ backgroundColor: transport.couleur || '#0b7d48', color: 'white' }}>
                        <wcs-mat-icon icon={getTransportIcon(transport.type)} size="s" style={{ color: 'white' }} />
                      </wcs-badge>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: '#999' }}>Aucun</span>
                )}
              </wcs-grid-custom-cell>

              <wcs-grid-custom-cell slot={`id-${station.id}`} column-id="id" row-id={station.id}>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <wcs-button mode="clear" shape="small" onClick={() => onEdit(station)}>
                    <wcs-mat-icon icon="edit" />
                  </wcs-button>
                  <wcs-button mode="clear" shape="small" onClick={() => handleDelete(station)}>
                    <wcs-mat-icon icon="delete" />
                  </wcs-button>
                </div>
              </wcs-grid-custom-cell>
            </React.Fragment>
          ))}
        </wcs-grid>
      </div>
    );
  }

  // Rendu en cartes (ancien rendu, réutilisé)
  function renderCards() {
    return (
      <div className={styles.stationList}>
        {filteredStations.map(station => (
          <div key={station.id} className={styles.stationCard}>
            <div className={styles.stationHeader}>
              <div>
                <span className={styles.stationName}>{station.nom}</span>
                <span
                  className={`${styles.stationType} ${
                    station.type_gare === 'interurbaine'
                      ? styles.typeInterurbaine
                      : styles.typeVille
                  }`}
                >
                  {station.type_gare === 'interurbaine'
                    ? 'Gare interurbaine (12h)'
                    : 'Gare de ville (30 min)'}
                </span>
              </div>
              <div className={styles.stationActions}>
                <wcs-button
                  mode="clear"
                  shape="small"
                  onClick={() => onEdit(station)}
                >
                  <wcs-mat-icon icon="edit" />
                </wcs-button>
                <wcs-button
                  mode="clear"
                  shape="small"
                  onClick={() => handleDelete(station)}
                >
                  <wcs-mat-icon icon="delete" />
                </wcs-button>
              </div>
            </div>

            <div className={styles.stationDetails}>
              {/* Services */}
              <div className={styles.detailSection}>
                <div className={styles.detailTitle}>Services</div>
                <div className={styles.serviceList}>
                  {Array.isArray(station.service) && station.service.length > 0 ? (
                    station.service.map((service, idx) => (
                      <wcs-badge key={idx} color="primary">
                        {service}
                      </wcs-badge>
                    ))
                  ) : (
                    <span style={{ color: '#999', fontSize: '0.875rem' }}>
                      Aucun service
                    </span>
                  )}
                </div>
              </div>

              {/* Quais */}
              <div className={styles.detailSection}>
                <div className={styles.detailTitle}>
                  Quais ({station.quais?.length || 0})
                </div>
                <div className={styles.quaisList}>
                  {station.quais && station.quais.length > 0 ? (
                    <>
                      {/* Afficher jusqu'à 3 quais en clair */}
                      {(station.quais.length <= 3 ? station.quais : station.quais.slice(0, 3)).map((quai, idx) => (
                        <div key={idx} className={styles.quaiItem}>
                          <span style={{ fontWeight: 500 }}>Quai {quai.nom}</span>
                          <span style={{ color: '#666' }}>{quai.distance} m</span>
                        </div>
                      ))}

                      {/* Si plus de 3, afficher un toggle qui révèle le reste */}
                      {station.quais.length > 3 && (
                        <div>
                          {!expandedQuais[station.id] ? (
                            <button className={styles.toggleButton} onClick={() => toggleQuais(station.id)}>
                              Afficher {station.quais.length - 3} quai(s) de plus
                            </button>
                          ) : (
                            <>
                              <div className={styles.hiddenQuais}>
                                {station.quais.slice(3).map((quai, idx) => (
                                  <div key={idx} className={styles.quaiItem}>
                                    <span style={{ fontWeight: 500 }}>Quai {quai.nom}</span>
                                    <span style={{ color: '#666' }}>{quai.distance} m</span>
                                  </div>
                                ))}
                              </div>
                              <button className={styles.toggleButton} onClick={() => toggleQuais(station.id)}>
                                Masquer
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <span style={{ color: '#999', fontSize: '0.875rem' }}>
                      Aucun quai
                    </span>
                  )}
                </div>
              </div>

              {/* Transports en commun - afficher des icônes au lieu du texte */}
              <div className={styles.detailSection}>
                <div className={styles.detailTitle}>Transports en commun</div>
                <div className={styles.transportsList}>
                  {station.transports_commun && station.transports_commun.length > 0 ? (
                    station.transports_commun.map((transport, idx) => (
                      <wcs-badge
                        key={idx}
                        title={getTransportLabel(transport.type)}
                        aria-label={getTransportLabel(transport.type)}
                        style={{
                          backgroundColor: transport.couleur || '#0b7d48',
                          color: 'white',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 42, // augmenté de 6px
                          height: 42, // augmenté de 6px
                          borderRadius: 21,
                          boxSizing: 'border-box'
                        }}
                      >
                        <wcs-mat-icon icon={getTransportIcon(transport.type)} size="m" style={{ color: 'white' }} />
                      </wcs-badge>
                    ))
                  ) : (
                    <span style={{ color: '#999', fontSize: '0.875rem' }}>
                      Aucun transport
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Rendu principal avec contrôles
  return (
    <div>
      {/* hidden fallback trigger required by wcs-modal to avoid console warning */}
      <button id="open-quais-btn-fallback" style={{ display: 'none' }} aria-hidden="true" />
      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une gare, un service ou un transport..."
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', minWidth: 280 }}
            aria-label="Recherche de gares"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }} aria-label="Effacer la recherche">✕</button>
          )}
        </div>

        <div>
          <button
            onClick={() => setViewMode('cards')}
            aria-pressed={viewMode === 'cards'}
            title="Affichage en cartes"
            style={{ marginRight: 8 }}
          >
            <wcs-mat-icon icon="grid_view" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            aria-pressed={viewMode === 'table'}
            title="Affichage en tableau"
          >
            <wcs-mat-icon icon="table_rows" />
          </button>
        </div>
      </div>

      {viewMode === 'table' ? renderTable() : renderCards()}

      {/* Modal WCS affichant tous les quais d'une gare */}
      <wcs-modal ref={modalRef} modal-trigger-controls-id="open-quais-btn-fallback" show-close-button size="m" onWcsDialogClosed={closeModal}>
        <div slot="header">{modalStation ? `Quais — ${modalStation.nom}` : 'Quais'}</div>
        <div style={{ padding: 12, minWidth: 320, maxHeight: '60vh', overflow: 'auto', backgroundColor: '#fff' }}>
          {modalStation ? (
            <div>
              {Array.isArray(modalStation.quais) && modalStation.quais.length > 0 ? (
                modalStation.quais.map((q, i) => (
                  <div key={i} style={{ padding: 8, borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>Quai {q.nom}</div>
                      {q.distance != null && <div style={{ color: '#666', fontSize: '0.9rem' }}>{q.distance} m</div>}
                    </div>
                    <div style={{ color: '#666', fontSize: '0.9rem' }}>{q.description || ''}</div>
                  </div>
                ))
              ) : (
                <div style={{ color: '#666' }}>Aucun quai enregistré pour cette gare</div>
              )}
            </div>
          ) : (
            <div>Chargement...</div>
          )}
        </div>
      </wcs-modal>
    </div>
  );
}
