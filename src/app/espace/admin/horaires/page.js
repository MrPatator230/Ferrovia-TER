"use client";
import React, { useRef, useState, useEffect } from 'react';
import HorairesList from './components/HorairesList';
import ServicesAnnuelsList from './components/ServicesAnnuelsList';
import ServiceAnnuelForm from './components/ServiceAnnuelForm';
import HoraireForm from './components/HoraireForm';

export default function HorairesPage() {
  const tabsRef = useRef(null);
  const modalSaRef = useRef(null);
  const modalHoraireRef = useRef(null);
  const serviceAnnuelFormRef = useRef(null);

  // États
  const [activeTab, setActiveTab] = useState('liste');
  const [refreshServiceAnnuelKey, setRefreshServiceAnnuelKey] = useState(0);
  const [refreshHorairesKey, setRefreshHorairesKey] = useState(0);

  const [editServiceAnnuel, setEditServiceAnnuel] = useState(null);
  const [editHoraire, setEditHoraire] = useState(null);
  const [showSaModal, setShowSaModal] = useState(false);
  const [showHoraireModal, setShowHoraireModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Synchronisation des tabs WCS
  // Enregistrer les écouteurs une seule fois (au montage)
  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;

    const handler = (ev) => {
      const newKey = ev?.detail?.selectedKey ?? ev?.detail?.tabName ?? ev?.detail?.key;
      if (newKey !== undefined && newKey !== null) {
        // Utiliser le state updater fonctionnel pour éviter les closures obsolètes
        setActiveTab((prev) => {
          const s = String(newKey);
          return prev === s ? prev : s;
        });
      }
    };

    el.addEventListener('tabChange', handler);
    el.addEventListener('wcsTabChange', handler);
    el.addEventListener('change', handler);

    return () => {
      el.removeEventListener('tabChange', handler);
      el.removeEventListener('wcsTabChange', handler);
      el.removeEventListener('change', handler);
    };
  }, []);

  // Mettre à jour la vue externe (WCS) quand activeTab change,
  // sans réenregistrer les écouteurs (évite boucle infinie)
  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    try {
      if (el.selectedKey !== activeTab) {
        el.selectedKey = activeTab;
        el.setAttribute('selected-key', activeTab);
      }
    } catch (e) {
      console.log('Error setting selectedKey:', e);
    }
  }, [activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => { setIsLoading(false); }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Ouverture modales
  const openCreateServiceAnnuel = () => {
    setEditServiceAnnuel(null);
    setShowSaModal(true);
  };
  const openCreateHoraire = () => {
    setEditHoraire(null);
    setShowHoraireModal(true);
  };
  const handleEditService = (sa) => {
    setEditServiceAnnuel(sa);
    setShowSaModal(true);
  };
  const handleEditHoraire = (h) => {
    setEditHoraire(h);
    setShowHoraireModal(true);
  };

  // Fermeture modales
  const closeSa = () => {
    setShowSaModal(false);
    setEditServiceAnnuel(null);
  };
  const closeHoraire = () => {
    setShowHoraireModal(false);
    setEditHoraire(null);
  };

  // Callbacks succès
  const onSaSuccess = () => { setRefreshServiceAnnuelKey(k => k + 1); closeSa(); };
  const onHoraireSuccess = () => { setRefreshHorairesKey(k => k + 1); closeHoraire(); };


  return (
    <div style={{ padding: '16px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* En-tête WCS */}
      <wcs-card mode="flat" style={{ marginBottom: '24px' }}>
        <div slot="header">
          <wcs-card-title>
            <wcs-mat-icon icon="schedule" size="s"></wcs-mat-icon>
            Gestion des horaires
          </wcs-card-title>
        </div>
        <div style={{ padding: '16px' }}>
          {/* Onglets WCS */}
          <wcs-tabs aria-label="Onglets gestion horaires" align="start" ref={tabsRef} selected-key={activeTab}>
            <wcs-tab header="Liste des Horaires" item-key="liste"></wcs-tab>
            <wcs-tab header="Services Annuels" item-key="services-annuels"></wcs-tab>
          </wcs-tabs>

          {/* Barre d'actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            {activeTab === 'liste' && (
              <wcs-button mode="stroked" onClick={() => window.location.href = '/espace/admin/horaires/imports'}>
                <wcs-mat-icon icon="upload_file" size="s"></wcs-mat-icon>
                Importer depuis Excel
              </wcs-button>
            )}
            <wcs-button mode="stroked" onClick={activeTab === 'services-annuels' ? openCreateServiceAnnuel : openCreateHoraire}>
              <wcs-mat-icon icon="add" size="s"></wcs-mat-icon>
              {activeTab === 'services-annuels' ? 'Nouveau SA' : 'Créer Horaire'}
            </wcs-button>
          </div>
        </div>
      </wcs-card>

      {/* Contenu principal */}
      {isLoading ? (
        <wcs-card mode="flat">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <wcs-spinner size="l"></wcs-spinner>
            <p style={{ marginTop: '12px', color: 'var(--wcs-text-medium)' }}>Chargement…</p>
          </div>
        </wcs-card>
      ) : (
        <>
          {activeTab === 'liste' && (
            <wcs-card mode="elevated">
              <div slot="header">
                <wcs-card-title>
                  <wcs-mat-icon icon="train" size="s"></wcs-mat-icon>
                  Liste des horaires
                </wcs-card-title>
              </div>
              <div style={{ padding: '16px' }}>
                <HorairesList
                  key={refreshHorairesKey}
                  onEdit={handleEditHoraire}
                  onCreate={openCreateHoraire}
                  refreshTrigger={refreshHorairesKey}
                />
              </div>
            </wcs-card>
          )}

          {activeTab === 'services-annuels' && (
            <wcs-card mode="elevated">
              <div slot="header">
                <wcs-card-title>
                  <wcs-mat-icon icon="event" size="s"></wcs-mat-icon>
                  Services annuels
                </wcs-card-title>
              </div>
              <div>
                <ServicesAnnuelsList key={refreshServiceAnnuelKey} onEdit={handleEditService} />
              </div>
            </wcs-card>
          )}

          {activeTab !== 'liste' && activeTab !== 'services-annuels' && (
            <wcs-card mode="flat">
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--wcs-text-medium)' }}>
                <wcs-mat-icon icon="error_outline" size="m"></wcs-mat-icon>
                <p style={{ marginTop: '12px' }}>Onglet inconnu: "{activeTab}"</p>
                <div style={{ marginTop: '12px' }}>
                  <wcs-button onClick={() => setActiveTab('liste')}>Aller à Liste</wcs-button>
                  <wcs-button style={{ marginLeft: '8px' }} onClick={() => setActiveTab('services-annuels')}>Aller à Services Annuels</wcs-button>
                </div>
              </div>
            </wcs-card>
          )}
        </>
      )}

      {/* Modale Service Annuel */}
      {showSaModal && (
        <wcs-modal
          modal-trigger-controls-id="modal-trigger-sa"
          show-close-button
          close-button-aria-label="Fermer"
          initial-focus-element-id=""
          disable-auto-focus
          show
          ref={modalSaRef}
        >
          <div slot="header">
            <wcs-mat-icon icon="event" size="s"></wcs-mat-icon>
            {editServiceAnnuel ? 'Modifier le service annuel' : 'Créer un service annuel'}
          </div>
          <ServiceAnnuelForm
            ref={serviceAnnuelFormRef}
            editServiceAnnuel={editServiceAnnuel}
            onSuccess={onSaSuccess}
            onCancel={closeSa}
          />
          <div slot="actions" style={{ display: 'flex', gap: 'var(--wcs-semantic-spacing-base)' }}>
            <wcs-button mode="stroked" onClick={closeSa}>
              <wcs-mat-icon icon="close" size="s"></wcs-mat-icon>
              Annuler
            </wcs-button>
            <wcs-button onClick={() => {
              if (serviceAnnuelFormRef.current && typeof serviceAnnuelFormRef.current.syncAndSubmit === 'function') {
                serviceAnnuelFormRef.current.syncAndSubmit();
              } else if (serviceAnnuelFormRef.current && typeof serviceAnnuelFormRef.current.submit === 'function') {
                serviceAnnuelFormRef.current.submit();
              }
            }}>
              <wcs-mat-icon icon="check" size="s"></wcs-mat-icon>
              {editServiceAnnuel ? 'Modifier' : 'Créer'}
            </wcs-button>
          </div>
        </wcs-modal>
      )}

      {/* Modale Horaire */}
      {showHoraireModal && (
        <wcs-modal
          modal-trigger-controls-id="modal-trigger-horaire"
          show-close-button
          close-button-aria-label="Fermer"
          initial-focus-element-id=""
          disable-auto-focus
          show
          ref={modalHoraireRef}
        >
          <div slot="header">
            <wcs-mat-icon icon="schedule" size="s"></wcs-mat-icon>
            {editHoraire ? "Modifier l'horaire" : 'Créer un horaire'}
          </div>
          <HoraireForm
            editHoraire={editHoraire}
            onSuccess={onHoraireSuccess}
            onCancel={closeHoraire}
          />
          <div slot="actions" style={{ display: 'flex', gap: 'var(--wcs-semantic-spacing-base)' }}>
            <wcs-button mode="stroked" onClick={closeHoraire}>
              <wcs-mat-icon icon="close" size="s"></wcs-mat-icon>
              Annuler
            </wcs-button>
            <wcs-button type="submit" form="horaire-form" onClick={() => {
              try {
                const f = document.getElementById('horaire-form');
                if (f && typeof f.requestSubmit === 'function') f.requestSubmit();
                else if (f && typeof f.submit === 'function') f.submit();
              } catch (e) { console.warn('Could not programmatically submit horaire-form', e); }
            }}>
              <wcs-mat-icon icon="check" size="s"></wcs-mat-icon>
              {editHoraire ? 'Modifier' : 'Créer'}
            </wcs-button>
          </div>
        </wcs-modal>
      )}
    </div>
  );
}
