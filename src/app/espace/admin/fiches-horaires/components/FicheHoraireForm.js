"use client";
import React, { useState, useEffect } from 'react';

export default function FicheHoraireForm({ fiche, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    nom: '',
    service_annuel_id: '',
    type_fiche: 'SA',
    design_region: 'Bourgogne - Franche-Comté',
    ligne_id: '',
    afficher_page_recherche: false
  });
  const [servicesAnnuels, setServicesAnnuels] = useState([]);
  const [lignes, setLignes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (fiche) {
      setFormData({
        nom: fiche.nom || '',
        service_annuel_id: fiche.service_annuel_id || '',
        type_fiche: fiche.type_fiche || 'SA',
        design_region: fiche.design_region || 'Bourgogne - Franche-Comté',
        ligne_id: fiche.ligne_id || '',
        afficher_page_recherche: fiche.afficher_page_recherche || false
      });
    }
  }, [fiche]);

  useEffect(() => {
    // Charger les services annuels
    fetch('/api/services-annuels')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setServicesAnnuels(data.services || []);
        }
      })
      .catch(err => console.error('Erreur chargement services annuels:', err));

    // Charger les lignes
    fetch('/api/lignes')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLignes(data.lignes || []);
        }
      })
      .catch(err => console.error('Erreur chargement lignes:', err));
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const url = fiche
        ? `/api/fiches-horaires/${fiche.id}`
        : '/api/fiches-horaires';

      const method = fiche ? 'PUT' : 'POST';

      // Nettoyer les données : convertir les chaînes vides en null
      const cleanedData = {
        ...formData,
        ligne_id: formData.ligne_id || null,
        service_annuel_id: formData.service_annuel_id || null
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedData)
      });

      const data = await res.json();

      if (data.success) {
        onSuccess();
      } else {
        setError(data.message || 'Erreur lors de la sauvegarde');
      }
    } catch (err) {
      setError('Erreur réseau');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: '1rem' }}>
      {error && (
        <div style={{
          background: '#fee',
          color: '#c00',
          padding: '0.75rem',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
          Nom de la fiche horaire *
        </label>
        <input
          type="text"
          required
          value={formData.nom}
          onChange={(e) => handleChange('nom', e.target.value)}
          placeholder="Ex: Ligne Dijon - Besançon - Service Hiver 2025"
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '1rem'
          }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
          Service Annuel *
        </label>
        <select
          required
          value={formData.service_annuel_id}
          onChange={(e) => handleChange('service_annuel_id', e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '1rem'
          }}
        >
          <option value="">-- Sélectionner un service annuel --</option>
          {servicesAnnuels.map(sa => (
            <option key={sa.id} value={sa.id}>
              {sa.nom} ({new Date(sa.date_debut).toLocaleDateString()} - {new Date(sa.date_fin).toLocaleDateString()})
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
          Type de fiche *
        </label>
        <select
          required
          value={formData.type_fiche}
          onChange={(e) => handleChange('type_fiche', e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '1rem'
          }}
        >
          <option value="SA">Service Annuel</option>
          <option value="Travaux">Travaux</option>
          <option value="Aménagement Spécial">Aménagement Spécial</option>
        </select>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
          Design de la région *
        </label>
        <select
          required
          value={formData.design_region}
          onChange={(e) => handleChange('design_region', e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '1rem'
          }}
        >
          <option value="Bourgogne - Franche-Comté">Bourgogne - Franche-Comté</option>
        </select>
        <small style={{ color: '#666', fontSize: '0.875rem' }}>
          Le design de la fiche horaire sera adapté à la région sélectionnée
        </small>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
          Ligne (optionnel)
        </label>
        <select
          value={formData.ligne_id}
          onChange={(e) => handleChange('ligne_id', e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '1rem'
          }}
        >
          <option value="">-- Toutes les lignes --</option>
          {lignes.map(ligne => (
            <option key={ligne.id} value={ligne.id}>
              {ligne.nom}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={formData.afficher_page_recherche}
            onChange={(e) => handleChange('afficher_page_recherche', e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <span style={{ fontWeight: 600 }}>Afficher sur la page de recherche</span>
        </label>
        <small style={{ color: '#666', fontSize: '0.875rem', marginLeft: '26px', display: 'block' }}>
          La fiche horaire sera visible et téléchargeable depuis la page de recherche publique
        </small>
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          style={{
            padding: '0.75rem 1.5rem',
            border: '1px solid #ccc',
            background: 'white',
            borderRadius: '4px',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: '#0b7d48',
            color: 'white',
            borderRadius: '4px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          {isLoading ? 'Enregistrement...' : (fiche ? 'Modifier' : 'Créer')}
        </button>
      </div>
    </form>
  );
}

