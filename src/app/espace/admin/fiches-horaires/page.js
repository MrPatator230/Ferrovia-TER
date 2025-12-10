"use client";
import React, { useState, useEffect, useRef } from 'react';
import FichesHorairesList from './components/FichesHorairesList';
import FicheHoraireForm from './components/FicheHoraireForm';

export default function FichesHorairesPage() {
  const tabsRef = useRef(null);
  const modalRef = useRef(null);

  const [activeTab, setActiveTab] = useState('liste');
  const [refreshKey, setRefreshKey] = useState(0);
  const [editFiche, setEditFiche] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Synchronisation des tabs WCS
  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;

    const handler = (ev) => {
      const newKey = ev?.detail?.selectedKey ?? ev?.detail?.tabName ?? ev?.detail?.key;
      if (newKey !== undefined && newKey !== null) {
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

  // Gestion de la fermeture de la modale
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const handleClose = () => {
      closeModal();
    };

    modal.addEventListener('wcsDialogClosed', handleClose);
    return () => {
      modal.removeEventListener('wcsDialogClosed', handleClose);
    };
  }, [showModal]);

  const openCreateFiche = () => {
    setEditFiche(null);
    setShowModal(true);
  };

  const handleEditFiche = (fiche) => {
    setEditFiche(fiche);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditFiche(null);
  };

  const handleSaveSuccess = () => {
    setRefreshKey(prev => prev + 1);
    closeModal();
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: '#0b2b1a' }}>
            Fiches Horaires
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', color: '#666' }}>
            Générez et gérez les fiches horaires PDF pour vos services annuels
          </p>
        </div>
        <button
          onClick={openCreateFiche}
          style={{
            background: '#0b7d48',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <wcs-mat-icon icon="add" size="m"></wcs-mat-icon>
          Créer une fiche horaire
        </button>
      </div>

      <wcs-tabs ref={tabsRef} selectedKey={activeTab}>
        <wcs-tab header="Liste des fiches" item-key="liste">
          {!isLoading && (
            <FichesHorairesList
              key={refreshKey}
              onEdit={handleEditFiche}
            />
          )}
        </wcs-tab>
      </wcs-tabs>

      {showModal && (
        <wcs-modal
          ref={modalRef}
          show
          show-close-button
          close-button-aria-label="Fermer"
          disable-auto-focus
          modal-trigger-controls-id="modal-trigger-fiche"
        >
          <div slot="header">
            <wcs-mat-icon icon="description" size="s"></wcs-mat-icon>
            {editFiche ? 'Modifier la fiche horaire' : 'Créer une fiche horaire'}
          </div>
          <FicheHoraireForm
            fiche={editFiche}
            onSuccess={handleSaveSuccess}
            onCancel={closeModal}
          />
        </wcs-modal>
      )}
    </div>
  );
}

