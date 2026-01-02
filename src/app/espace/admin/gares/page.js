"use client";
import React, { useState, useRef, useEffect } from 'react';
import styles from './gares.module.css';
import StationForm from './components/StationForm';
import StationList from './components/StationList';

export default function GaresPage() {
    const [editStation, setEditStation] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [modalKey, setModalKey] = useState(0);
    const modalRef = useRef(null);

    function handleCreateClick() {
        setEditStation(null);
        setModalKey(prev => prev + 1);
        setTimeout(() => {
            try { modalRef.current && modalRef.current.setAttribute('show', ''); } catch (e) {}
        }, 50);
    }

    function handleEdit(station) {
        setEditStation(station);
        setModalKey(prev => prev + 1);
        setTimeout(() => {
            try { modalRef.current && modalRef.current.setAttribute('show', ''); } catch (e) {}
        }, 50);
    }

    function handleCloseModal() {
        try { modalRef.current && modalRef.current.removeAttribute('show'); } catch (e) {}
        setEditStation(null);
    }

    function handleSuccess() {
        setRefreshKey(prev => prev + 1);
    }

    // Debug: observer qui logge l'attribut show du modal
    useEffect(() => {
        if (!modalRef.current) return;
        const modal = modalRef.current;
        const mo = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.type === 'attributes' && m.attributeName === 'show') {
                    console.log('[GaresPage] modal show changed ->', modal.hasAttribute('show'));
                }
            }
        });
        mo.observe(modal, { attributes: true });
        return () => mo.disconnect();
    }, [modalRef.current]);

    return (
        <div className={styles.container}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Gestion des Gares</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <wcs-button mode="stroked" onClick={() => window.location.href = '/espace/admin/gares/imports'}>
                        <wcs-mat-icon icon="upload_file" size="m" />
                        Importer depuis Excel
                    </wcs-button>
                    <wcs-button onClick={handleCreateClick}>
                        <wcs-mat-icon icon="add" size="m" />
                        Créer
                    </wcs-button>
                </div>
            </div>

            <StationList onEdit={handleEdit} refreshTrigger={refreshKey} />

            {/* Hidden fallback trigger for gares modal */}
            <button id="gares-modal-trigger-fallback" style={{ display: 'none' }} aria-hidden="true" />

            <wcs-modal ref={modalRef} modal-trigger-controls-id="gares-modal-trigger-fallback" show-close-button size="l" onWcsDialogClosed={handleCloseModal}>
                <div slot="header">{editStation ? 'Modifier la gare' : 'Créer une nouvelle gare'}</div>
                <div style={{ minHeight: '400px', maxHeight: '70vh', overflow: 'auto', backgroundColor: 'white', display: 'block', padding: 12 }}>
                    <div id="gares-modal-debug" style={{ padding: 12, background: '#fff3cd', border: '1px solid #ffeeba', marginBottom: 12 }}>
                        RENDER-TEST : React rend du contenu dans la modale
                    </div>
                    <StationForm key={modalKey} editStation={editStation} onClose={handleCloseModal} onSuccess={handleSuccess} />
                </div>
            </wcs-modal>
        </div>
    );
}
