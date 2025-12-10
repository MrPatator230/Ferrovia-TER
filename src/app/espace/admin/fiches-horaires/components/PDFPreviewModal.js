"use client";
import React from 'react';

export default function PDFPreviewModal({ pdfUrl, onClose, onDownload }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        maxWidth: '1200px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <wcs-mat-icon icon="picture_as_pdf" size="m" style={{ color: '#0b7d48' }}></wcs-mat-icon>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
              Prévisualisation de la fiche horaire
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Fermer"
          >
            <wcs-mat-icon icon="close" size="m"></wcs-mat-icon>
          </button>
        </div>

        {/* PDF Viewer */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: '#f5f5f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}>
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                backgroundColor: 'white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
              title="Aperçu de la fiche horaire"
            />
          ) : (
            <div style={{ textAlign: 'center', color: '#666' }}>
              <wcs-mat-icon icon="hourglass_empty" size="xl" style={{ opacity: 0.5 }}></wcs-mat-icon>
              <p style={{ marginTop: '1rem' }}>Génération du PDF en cours...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1.5rem',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          gap: '1rem',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              border: '1px solid #ccc',
              background: 'white',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Fermer
          </button>
          {pdfUrl && (
            <button
              onClick={onDownload}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                background: '#0b7d48',
                color: 'white',
                borderRadius: '4px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <wcs-mat-icon icon="download" size="s"></wcs-mat-icon>
              Télécharger le PDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

