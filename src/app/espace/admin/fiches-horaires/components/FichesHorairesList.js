"use client";
import React, { useState, useEffect } from 'react';
import PDFPreviewModal from './PDFPreviewModal';

export default function FichesHorairesList({ onEdit }) {
  const [fiches, setFiches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewPDF, setPreviewPDF] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadFiches();
  }, []);

  const loadFiches = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/fiches-horaires');
      const data = await res.json();
      if (data.success) {
        setFiches(data.fiches || []);
      } else {
        setError(data.message || 'Erreur de chargement');
      }
    } catch (err) {
      setError('Erreur réseau');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette fiche horaire ?')) {
      return;
    }

    try {
      const res = await fetch(`/api/fiches-horaires/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        loadFiches();
      } else {
        alert(data.message || 'Erreur lors de la suppression');
      }
    } catch (err) {
      alert('Erreur réseau');
      console.error(err);
    }
  };

  const handleGeneratePDF = async (id) => {
    setIsGenerating(true);
    setPreviewPDF(null);

    try {
      const res = await fetch(`/api/fiches-horaires/${id}/generate`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        // Ouvrir la modale de prévisualisation avec le PDF généré
        setPreviewPDF(data.pdf_path);
        loadFiches();
      } else {
        alert(data.message || 'Erreur lors de la génération du PDF');
      }
    } catch (err) {
      alert('Erreur réseau');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    if (previewPDF) {
      window.open(previewPDF, '_blank');
    }
  };

  const handleClosePreview = () => {
    setPreviewPDF(null);
  };

  const getStatusBadgeColor = (statut) => {
    switch (statut) {
      case 'brouillon': return '#999';
      case 'généré': return '#0b7d48';
      case 'publié': return '#0066cc';
      default: return '#666';
    }
  };

  const getTypeBadgeColor = (type) => {
    switch (type) {
      case 'SA': return '#0b7d48';
      case 'Travaux': return '#ff8c00';
      case 'Aménagement Spécial': return '#9c27b0';
      default: return '#666';
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Chargement...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ background: '#fee', color: '#c00', padding: '1rem', borderRadius: '4px' }}>
          {error}
        </div>
      </div>
    );
  }

  if (fiches.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
        <wcs-mat-icon icon="description" size="xl" style={{ opacity: 0.3 }}></wcs-mat-icon>
        <p style={{ margin: '1rem 0 0 0', fontSize: '1.125rem' }}>
          Aucune fiche horaire pour le moment
        </p>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
          Créez votre première fiche horaire pour commencer
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{
        display: 'grid',
        gap: '1rem',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))'
      }}>
        {fiches.map(fiche => (
          <div
            key={fiche.id}
            style={{
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '1.25rem',
              background: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              transition: 'box-shadow 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: '#0b2b1a', flex: 1 }}>
                {fiche.nom}
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span
                  style={{
                    background: getStatusBadgeColor(fiche.statut),
                    color: 'white',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {fiche.statut}
                </span>
                <span
                  style={{
                    background: getTypeBadgeColor(fiche.type_fiche),
                    color: 'white',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {fiche.type_fiche}
                </span>
              </div>
            </div>

            <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <wcs-mat-icon icon="event" size="s"></wcs-mat-icon>
                <span><strong>Service:</strong> {fiche.service_annuel_nom}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <wcs-mat-icon icon="palette" size="s"></wcs-mat-icon>
                <span><strong>Design:</strong> {fiche.design_region}</span>
              </div>
              {fiche.afficher_page_recherche && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', color: '#0b7d48' }}>
                  <wcs-mat-icon icon="visibility" size="s"></wcs-mat-icon>
                  <span style={{ fontWeight: 600 }}>Visible sur la page de recherche</span>
                </div>
              )}
            </div>

            {fiche.pdf_path && (
              <div style={{
                background: '#f0f9f5',
                padding: '0.5rem',
                borderRadius: '4px',
                marginTop: '0.75rem',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <wcs-mat-icon icon="check_circle" size="s" style={{ color: '#0b7d48' }}></wcs-mat-icon>
                <span style={{ fontSize: '0.875rem', color: '#0b7d48', fontWeight: 600 }}>
                  PDF généré
                </span>
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '0.5rem',
              marginTop: '1rem',
              paddingTop: '1rem',
              borderTop: '1px solid #e0e0e0'
            }}>
              <button
                onClick={() => onEdit(fiche)}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  background: 'white',
                  border: '1px solid #0b7d48',
                  color: '#0b7d48',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.25rem'
                }}
              >
                <wcs-mat-icon icon="edit" size="s"></wcs-mat-icon>
                Modifier
              </button>
              <button
                onClick={() => handleGeneratePDF(fiche.id)}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  background: '#0b7d48',
                  border: 'none',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.25rem'
                }}
              >
                <wcs-mat-icon icon="picture_as_pdf" size="s"></wcs-mat-icon>
                Générer PDF
              </button>
              <button
                onClick={() => handleDelete(fiche.id)}
                style={{
                  padding: '0.5rem',
                  background: 'white',
                  border: '1px solid #dc143c',
                  color: '#dc143c',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <wcs-mat-icon icon="delete" size="s"></wcs-mat-icon>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modale de prévisualisation du PDF */}
      {(previewPDF || isGenerating) && (
        <PDFPreviewModal
          pdfUrl={previewPDF}
          onClose={handleClosePreview}
          onDownload={handleDownloadPDF}
        />
      )}
    </div>
  );
}

