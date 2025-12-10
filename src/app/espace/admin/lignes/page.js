"use client";
import React, { useRef, useState } from 'react';
import styles from './lignes.module.css';
import LignesList from './components/LignesList';
import LigneForm from './components/LigneForm';

export default function LignesPage() {
  const modalRef = useRef(null);
  const [editLigne, setEditLigne] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [modalKey, setModalKey] = useState(0);

  function openCreate() {
    setEditLigne(null);
    setModalKey(k => k + 1);
    setTimeout(() => { if (modalRef.current) modalRef.current.setAttribute('show', ''); }, 50);
  }

  async function handleEdit(l) {
    try {
      const id = l?.id || l?.ID;
      if (id) {
        try {
          const res = await fetch(`/api/admin/lignes/${id}`);
          if (res.ok) {
            const fresh = await res.json();
            setEditLigne(fresh || l);
          } else {
            setEditLigne(l);
          }
        } catch (e) {
          console.warn('Impossible de récupérer la ligne fraîche, utilisation de l\'objet fourni', e);
          setEditLigne(l);
        }
      } else {
        setEditLigne(l);
      }
      setModalKey(k => k + 1);
      setTimeout(() => { if (modalRef.current) modalRef.current.setAttribute('show', ''); }, 50);
    } catch (e) {
      console.error('handleEdit error', e);
      setEditLigne(l);
    }
  }

  function handleClose() {
    if (modalRef.current) modalRef.current.removeAttribute('show');
    setEditLigne(null);
  }

  async function handleSuccess(data, opts) {
    setRefreshKey(k => k + 1);
    if (opts && opts.keepOpen) {
      try {
        const id = data?.id || data?.ID || (editLigne && editLigne.id);
        let fresh = data || null;
        if (id) {
          try {
            const res = await fetch(`/api/admin/lignes/${id}`);
            if (res.ok) fresh = await res.json();
          } catch (e) { console.warn('Impossible de récupérer la ressource fraîche', e); }
        }
        try { if (modalRef.current) modalRef.current.removeAttribute('show'); } catch(e){}
        setEditLigne(fresh || null);
        setModalKey(k => k + 1);
        setTimeout(() => { try { if (modalRef.current) modalRef.current.setAttribute('show', ''); } catch(e){} }, 120);
      } catch (e) { console.error('handleSuccess (keepOpen) error', e); }
      return;
    }
    handleClose();
  }

  return (
    <div className={styles.container}>
      <wcs-card mode="elevated" class={styles.card}>
        <wcs-card-header>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>Gestion des Lignes</div>
            </div>
            <div>
              <wcs-button onClick={openCreate}>
                <wcs-mat-icon icon="add" size="m" /> Créer
              </wcs-button>
            </div>
          </div>
        </wcs-card-header>
        <wcs-card-body>
          <LignesList onEdit={handleEdit} refreshTrigger={refreshKey} />
        </wcs-card-body>
      </wcs-card>

      <wcs-modal ref={modalRef} show-close-button size="l" onWcsDialogClosed={handleClose}>
        <div slot="header">{editLigne ? 'Modifier une ligne' : 'Créer une ligne'}</div>
        <div style={{ minHeight: 400, maxHeight: '70vh', overflow: 'auto', backgroundColor: '#fff', padding: 12 }}>
          <LigneForm key={modalKey} editLigne={editLigne} onSuccess={handleSuccess} onCancel={handleClose} />
        </div>
      </wcs-modal>
    </div>
  );
}
