"use client";
import React, { useRef, useEffect, useState } from 'react';
import styles from './materiels.module.css';
import MaterialForm from './components/MaterialForm';
import MaterialList from './components/MaterialList';

export default function MaterielsPage(){
  const createModalRef = useRef(null);
  const editModalRef = useRef(null);
  const createButtonRef = useRef(null);
  const [editMateriel, setEditMateriel] = useState(null);

  useEffect(() => {
    const createButton = createButtonRef.current;
    const createModal = createModalRef.current;

    if (createButton && createModal) {
      const handleCreateClick = () => {
        createModal.setAttribute('show', '');
      };
      createButton.addEventListener('click', handleCreateClick);
    }

    // Écouter l'événement d'ouverture de la modal d'édition
    const handleOpenEditModal = (event) => {
      const materiel = event.detail;
      setEditMateriel(materiel);
      if (editModalRef.current) {
        editModalRef.current.setAttribute('show', '');
      }
    };

    window.addEventListener('open-edit-modal', handleOpenEditModal);

    return () => {
      if (createButton && createModal) {
        createButton.removeEventListener('click', handleCreateClick);
      }
      window.removeEventListener('open-edit-modal', handleOpenEditModal);
    };
  }, []);

  return (
    <div className={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Matériels Roulants</h1>
        <div>
          <wcs-button ref={createButtonRef} id="create-materiel-trigger">Créer</wcs-button>
        </div>
      </div>

      {/* hidden fallback trigger for edit modal to satisfy wcs-modal requirement */}
      <button id="edit-materiel-trigger" style={{ display: 'none' }} aria-hidden="true" />

      <div className={styles.listWrap}>
        <MaterialList />
      </div>

      {/* Modal de création */}
      <wcs-modal ref={createModalRef} data-materiel-modal modal-trigger-controls-id="create-materiel-trigger" show-close-button size="m">
        <div slot="header">Créer un matériel roulant</div>
        <div style={{ padding: 12 }}>
          <MaterialForm />
        </div>
      </wcs-modal>

      {/* Modal d'édition */}
      <wcs-modal ref={editModalRef} data-edit-modal modal-trigger-controls-id="edit-materiel-trigger" show-close-button size="m">
        <div slot="header">Modifier le matériel roulant</div>
        <div style={{ padding: 12 }}>
          <MaterialForm editMateriel={editMateriel} />
        </div>
      </wcs-modal>

    </div>
  );
}
