"use client";
import { useState, useEffect } from 'react';
import styles from '../horaires.module.css';

export default function HoraireFormSimple({ editHoraire, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    numeroTrain: '',
    departStation: '',
    arriveeStation: '',
    departTime: '',
    arriveeTime: '',
    typeTrain: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Initialiser le formulaire avec les données existantes en cas de modification
  useEffect(() => {
    if (editHoraire) {
      setFormData({
        numeroTrain: editHoraire.numero_train || '',
        departStation: editHoraire.depart_station_id || '',
        arriveeStation: editHoraire.arrivee_station_id || '',
        departTime: editHoraire.depart_time ? formatTimeForInput(editHoraire.depart_time) : '',
        arriveeTime: editHoraire.arrivee_time ? formatTimeForInput(editHoraire.arrivee_time) : '',
        typeTrain: editHoraire.type_train || 'TER'
      });
    } else {
      // Réinitialiser le formulaire pour une nouvelle création
      setFormData({
        numeroTrain: '',
        departStation: '',
        arriveeStation: '',
        departTime: '',
        arriveeTime: '',
        typeTrain: 'TER'
      });
    }
    setErrors({});
  }, [editHoraire]);

  // Fonction helper pour formatter l'heure pour les inputs
  function formatTimeForInput(timeStr) {
    if (!timeStr) return '';
    // Si c'est déjà au format HH:MM, le garder
    if (timeStr.match(/^\d{2}:\d{2}$/)) return timeStr;
    // Si c'est HH:MM:SS, prendre seulement HH:MM
    if (timeStr.match(/^\d{2}:\d{2}:\d{2}$/)) return timeStr.slice(0, 5);
    // Si c'est un datetime, extraire la partie time
    if (timeStr.includes('T')) return timeStr.split('T')[1].slice(0, 5);
    return timeStr;
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Effacer l'erreur du champ modifié
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.numeroTrain.trim()) {
      newErrors.numeroTrain = 'Le numéro de train est requis';
    }

    if (!formData.departStation) {
      newErrors.departStation = 'La gare de départ est requise';
    }

    if (!formData.arriveeStation) {
      newErrors.arriveeStation = 'La gare d\'arrivée est requise';
    }

    if (!formData.departTime) {
      newErrors.departTime = 'L\'heure de départ est requise';
    }

    if (!formData.arriveeTime) {
      newErrors.arriveeTime = 'L\'heure d\'arrivée est requise';
    }

    // Validation des heures
    if (formData.departTime && formData.arriveeTime) {
      const [depHour, depMin] = formData.departTime.split(':').map(Number);
      const [arrHour, arrMin] = formData.arriveeTime.split(':').map(Number);
      const depMinutes = depHour * 60 + depMin;
      const arrMinutes = arrHour * 60 + arrMin;

      if (arrMinutes <= depMinutes) {
        newErrors.arriveeTime = 'L\'heure d\'arrivée doit être postérieure à l\'heure de départ';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const payload = {
        numeroTrain: formData.numeroTrain.trim(),
        departStation: formData.departStation,
        arriveeStation: formData.arriveeStation,
        departTime: formData.departTime,
        arriveeTime: formData.arriveeTime,
        typeTrain: formData.typeTrain
      };

      if (editHoraire) {
        payload.id = editHoraire.id;
      }

      const res = await fetch('/api/admin/horaires', {
        method: editHoraire ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = errorText;
        try {
          const parsed = JSON.parse(errorText);
          errorMessage = parsed.error || errorText;
        } catch (_) {}
        throw new Error(errorMessage);
      }

      const result = await res.json();

      // Appeler le callback de succès
      if (onSuccess) {
        onSuccess(result);
      }

    } catch (error) {
      console.error('[HoraireForm] Submit error:', error);
      alert('Erreur lors de la sauvegarde : ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className={`${styles.formContainer} ${styles.modalContent}`}>
      <form onSubmit={handleSubmit} className={styles.serviceAnnuelForm}>
        <div className={styles.formSection}>
          <wcs-form-field className={styles.modalFormField}>
            <wcs-label className={styles.modalLabel}>Numéro de train *</wcs-label>
            <input
              type="text"
              name="numeroTrain"
              value={formData.numeroTrain}
              onChange={handleInputChange}
              placeholder="Ex: 871502"
              required
              className={`${styles.modalInput} ${errors.numeroTrain ? styles.inputError : ''}`}
            />
            {errors.numeroTrain && (
              <div className={styles.errorMessage}>{errors.numeroTrain}</div>
            )}
          </wcs-form-field>
        </div>

        <div className={styles.formRow}>
          <wcs-form-field className={styles.modalFormField}>
            <wcs-label className={styles.modalLabel}>Type de train *</wcs-label>
            <select
              name="typeTrain"
              value={formData.typeTrain}
              onChange={handleInputChange}
              required
              className={styles.modalInput}
            >
              <option value="TER">TER</option>
              <option value="INTERCITES">INTERCITÉS</option>
              <option value="TGV">TGV</option>
            </select>
          </wcs-form-field>
        </div>

        <div className={styles.formRow}>
          <wcs-form-field className={styles.modalFormField}>
            <wcs-label className={styles.modalLabel}>Gare de départ *</wcs-label>
            <input
              type="text"
              name="departStation"
              value={formData.departStation}
              onChange={handleInputChange}
              placeholder="Ex: Dijon-Ville"
              required
              className={`${styles.modalInput} ${errors.departStation ? styles.inputError : ''}`}
            />
            {errors.departStation && (
              <div className={styles.errorMessage}>{errors.departStation}</div>
            )}
          </wcs-form-field>

          <wcs-form-field className={styles.modalFormField}>
            <wcs-label className={styles.modalLabel}>Gare d'arrivée *</wcs-label>
            <input
              type="text"
              name="arriveeStation"
              value={formData.arriveeStation}
              onChange={handleInputChange}
              placeholder="Ex: Besançon-Franche-Comté TGV"
              required
              className={`${styles.modalInput} ${errors.arriveeStation ? styles.inputError : ''}`}
            />
            {errors.arriveeStation && (
              <div className={styles.errorMessage}>{errors.arriveeStation}</div>
            )}
          </wcs-form-field>
        </div>

        <div className={styles.formRow}>
          <wcs-form-field className={styles.modalFormField}>
            <wcs-label className={styles.modalLabel}>Heure de départ *</wcs-label>
            <input
              type="time"
              name="departTime"
              value={formData.departTime}
              onChange={handleInputChange}
              required
              className={`${styles.modalInput} ${errors.departTime ? styles.inputError : ''}`}
            />
            {errors.departTime && (
              <div className={styles.errorMessage}>{errors.departTime}</div>
            )}
          </wcs-form-field>

          <wcs-form-field className={styles.modalFormField}>
            <wcs-label className={styles.modalLabel}>Heure d'arrivée *</wcs-label>
            <input
              type="time"
              name="arriveeTime"
              value={formData.arriveeTime}
              onChange={handleInputChange}
              required
              className={`${styles.modalInput} ${errors.arriveeTime ? styles.inputError : ''}`}
            />
            {errors.arriveeTime && (
              <div className={styles.errorMessage}>{errors.arriveeTime}</div>
            )}
          </wcs-form-field>
        </div>

        <div className={styles.formActions}>
          <wcs-button
            type="button"
            mode="clear"
            onClick={handleCancel}
            disabled={loading}
          >
            Annuler
          </wcs-button>
          <wcs-button
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <wcs-spinner mode="border" size="s" />
                {editHoraire ? 'Modification...' : 'Création...'}
              </>
            ) : (
              editHoraire ? 'Modifier' : 'Créer'
            )}
          </wcs-button>
        </div>
      </form>
    </div>
  );
}
