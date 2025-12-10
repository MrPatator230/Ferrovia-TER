"use client";
import { useState, useEffect } from 'react';

function formatDateForUI(dateStr) {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR');
  } catch (e) {
    return dateStr;
  }
}

export default function ServicesAnnuelsList({ onEdit }) {
  const [servicesAnnuels, setServicesAnnuels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchServicesAnnuels();
  }, []);

  async function fetchServicesAnnuels() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/services-annuels');

      if (!res.ok) {
        throw new Error(`Erreur ${res.status}`);
      }

      const data = await res.json();
      setServicesAnnuels(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[ServicesAnnuelsList] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce service annuel ?')) return;

    try {
      const res = await fetch(`/api/admin/services-annuels?id=${id}`, {
        method: 'DELETE'
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Si l'API indique qu'il y a des horaires liés, proposer une suppression forcée
        if (data && typeof data.count === 'number' && data.count > 0) {
          const again = confirm(`Il y a ${data.count} horaire(s) lié(s) à ce service annuel. Voulez-vous dissocier ces horaires et supprimer le service annuel ? (Suppression forcée)`);
          if (!again) return;

          const res2 = await fetch(`/api/admin/services-annuels?id=${id}&force=1`, { method: 'DELETE' });
          if (!res2.ok) {
            const d2 = await res2.json().catch(() => ({}));
            throw new Error(d2.error || 'Erreur lors de la suppression forcée');
          }

          // Recharger la liste
          await fetchServicesAnnuels();
          return;
        }

        throw new Error(data && data.error ? data.error : `Erreur ${res.status}`);
      }

      // Recharger la liste
      await fetchServicesAnnuels();
    } catch (err) {
      console.error('Error deleting:', err);
      alert('Erreur lors de la suppression : ' + err.message);
    }
  }

  if (loading) {
    return (
      <wcs-grid-column style={{ textAlign: 'center', padding: '40px' }}>
        <wcs-spinner size="l"></wcs-spinner>
        <p style={{ marginTop: '16px', color: 'var(--wcs-text-medium)' }}>Chargement des services annuels...</p>
      </wcs-grid-column>
    );
  }

  if (error) {
    return (
      <wcs-grid-column style={{ textAlign: 'center', padding: '40px' }}>
        <wcs-mat-icon icon="error" size="l" style={{ color: 'var(--wcs-red)' }}></wcs-mat-icon>
        <p style={{ marginTop: '16px', color: 'var(--wcs-text-medium)' }}>Erreur : {error}</p>
        <wcs-button mode="primary" onClick={fetchServicesAnnuels} style={{ marginTop: '16px' }}>
          <wcs-mat-icon icon="refresh" size="s"></wcs-mat-icon>
          Réessayer
        </wcs-button>
      </wcs-grid-column>
    );
  }

  if (servicesAnnuels.length === 0) {
    return (
      <wcs-grid-column style={{ textAlign: 'center', padding: '40px' }}>
        <wcs-mat-icon icon="event_note" size="l" style={{ color: 'var(--wcs-text-medium)' }}></wcs-mat-icon>
        <h3 style={{ marginTop: '16px', color: 'var(--wcs-text-dark)' }}>Aucun service annuel</h3>
        <p style={{ color: 'var(--wcs-text-medium)' }}>Cliquez sur "Nouveau SA" pour créer votre premier service annuel.</p>
      </wcs-grid-column>
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <wcs-mat-icon icon="event" size="s"></wcs-mat-icon>
          Services Annuels ({servicesAnnuels.length})
        </h3>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          backgroundColor: 'var(--wcs-white)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          borderRadius: '4px'
        }}>
          <thead>
            <tr style={{
              backgroundColor: 'var(--wcs-gray-100)',
              borderBottom: '2px solid var(--wcs-gray-300)'
            }}>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontWeight: '600',
                color: 'var(--wcs-text-dark)'
              }}>
                Nom
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontWeight: '600',
                color: 'var(--wcs-text-dark)'
              }}>
                Date de début
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontWeight: '600',
                color: 'var(--wcs-text-dark)'
              }}>
                Date de fin
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'center',
                fontWeight: '600',
                color: 'var(--wcs-text-dark)'
              }}>
                Statut
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'center',
                fontWeight: '600',
                color: 'var(--wcs-text-dark)',
                width: '180px'
              }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {servicesAnnuels.map(sa => {
              const dateDebut = formatDateForUI(sa.date_debut);
              const dateFin = formatDateForUI(sa.date_fin);

              // Calculer le statut basé sur les dates
              const aujourd_hui = new Date();
              const debut = new Date(sa.date_debut);
              const fin = new Date(sa.date_fin);
              let statut = 'À venir';
              let statutColor = 'var(--wcs-blue)';

              if (aujourd_hui >= debut && aujourd_hui <= fin) {
                statut = 'En cours';
                statutColor = 'var(--wcs-green)';
              } else if (aujourd_hui > fin) {
                statut = 'Terminé';
                statutColor = 'var(--wcs-orange)';
              }

              return (
                <tr key={sa.id} style={{
                  borderBottom: '1px solid var(--wcs-gray-200)',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--wcs-gray-50)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '12px 16px', fontWeight: '500' }}>
                    {sa.nom}
                    {sa.description && (
                      <div style={{ fontSize: '0.875rem', color: 'var(--wcs-text-medium)', marginTop: '4px' }}>
                        {sa.description.substring(0, 80)}{sa.description.length > 80 ? '...' : ''}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <wcs-mat-icon icon="play_arrow" size="xs" style={{ color: 'var(--wcs-text-medium)' }}></wcs-mat-icon>
                      {dateDebut}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <wcs-mat-icon icon="stop" size="xs" style={{ color: 'var(--wcs-text-medium)' }}></wcs-mat-icon>
                      {dateFin}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      backgroundColor: statutColor + '20',
                      color: statutColor
                    }}>
                      {statut}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <wcs-button mode="clear" size="s" onClick={() => onEdit && onEdit(sa)}>
                        <wcs-mat-icon icon="edit" size="s"></wcs-mat-icon>
                      </wcs-button>
                      <wcs-button mode="clear" size="s" onClick={() => handleDelete(sa.id)}>
                        <wcs-mat-icon icon="delete" size="s" style={{ color: 'var(--wcs-red)' }}></wcs-mat-icon>
                      </wcs-button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
