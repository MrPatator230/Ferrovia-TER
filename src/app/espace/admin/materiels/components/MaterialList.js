"use client";
import React, { useState, useEffect, useMemo } from 'react';
import styles from './MaterialList.module.css';

export default function MaterialList() {
  const [materiels, setMateriels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const [imageScrollPosition, setImageScrollPosition] = useState({});

  // Nouveaux états pour les filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    fetchMateriels();

    // Écouter l'événement de création de matériel
    const handleMaterielCreated = () => {
      fetchMateriels();
    };

    window.addEventListener('materiel-created', handleMaterielCreated);

    return () => {
      window.removeEventListener('materiel-created', handleMaterielCreated);
    };
  }, []);

  async function fetchMateriels() {
    try {
      const res = await fetch('/api/admin/materiels');
      if (res.ok) {
        const data = await res.json();
        setMateriels(data.items || []);
        // Initialiser l'index d'image à 0 pour chaque matériel
        const indexes = {};
        const scrollPositions = {};
        (data.items || []).forEach(item => {
          indexes[item.id] = 0;
          scrollPositions[item.id] = 0;
        });
        setCurrentImageIndex(indexes);
        setImageScrollPosition(scrollPositions);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des matériels', err);
    } finally {
      setLoading(false);
    }
  }

  // Calculer les types uniques disponibles pour le select de filtre
  const typesOptions = useMemo(() => {
    const setTypes = new Set();
    materiels.forEach(m => {
      if (m.type_train) setTypes.add(m.type_train);
    });
    return Array.from(setTypes).sort();
  }, [materiels]);

  // Liste filtrée par searchTerm et typeFilter
  const filteredMateriels = useMemo(() => {
    return materiels.filter(m => {
      const matchesType = typeFilter ? m.type_train === typeFilter : true;
      const matchesSearch = searchTerm
        ? (m.nom || '').toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      return matchesType && matchesSearch;
    });
  }, [materiels, searchTerm, typeFilter]);

  function handlePrevImage(id) {
    setCurrentImageIndex(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) - 1)
    }));
  }

  function handleNextImage(id, maxIndex) {
    setCurrentImageIndex(prev => ({
      ...prev,
      [id]: Math.min(maxIndex, (prev[id] || 0) + 1)
    }));
  }

  function handleScrollLeft(id) {
    setImageScrollPosition(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) - 20)
    }));
  }

  function handleScrollRight(id) {
    setImageScrollPosition(prev => ({
      ...prev,
      [id]: Math.min(100, (prev[id] || 0) + 20)
    }));
  }

  async function handleDelete(id, nom) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le matériel "${nom}" ?`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/materiels/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        // Rafraîchir la liste après suppression
        await fetchMateriels();
      } else {
        const error = await res.json();
        alert(`Erreur lors de la suppression : ${error.error || 'Erreur inconnue'}`);
      }
    } catch (err) {
      console.error('Erreur lors de la suppression', err);
      alert('Erreur lors de la suppression du matériel');
    } finally {
      setDeletingId(null);
    }
  }

  function handleEdit(materiel) {
    // Déclencher un événement personnalisé avec les données du matériel à éditer
    window.dispatchEvent(new CustomEvent('edit-materiel', { detail: materiel }));
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <wcs-spinner></wcs-spinner>
        <p>Chargement des matériels...</p>
      </div>
    );
  }

  if (materiels.length === 0) {
    return (
      <wcs-card className={styles.emptyCard}>
        <div style={{ padding: 16, textAlign: 'center' }}>
          <p>Aucun matériel roulant enregistré</p>
        </div>
      </wcs-card>
    );
  }

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <h3>Filtres</h3>

        <label className={styles.label} htmlFor="search">Rechercher par nom</label>
        <input
          id="search"
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Nom du train..."
          className={styles.searchInput}
        />

        <label className={styles.label} htmlFor="type">Type de train</label>
        <select id="type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={styles.select}>
          <option value="">Tous les types</option>
          {typesOptions.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <button className={styles.clearButton} onClick={() => { setTypeFilter(''); setSearchTerm(''); }}>
          Réinitialiser
        </button>
      </aside>

      <div className={styles.grid}>
        {filteredMateriels.map(materiel => {
          // Pour l'instant on n'a qu'une image, mais la structure permet d'en gérer plusieurs
          const images = materiel.image_path ? [materiel.image_path] : [];
          const currentIndex = currentImageIndex[materiel.id] || 0;
          const scrollPos = imageScrollPosition[materiel.id] || 0;

          return (
            <wcs-card key={materiel.id} className={styles.card}>
              <div className={styles.imageContainer}>
                {images.length > 0 ? (
                  <>
                    <img
                      src={images[currentIndex]}
                      alt={materiel.nom}
                      className={styles.image}
                      style={{ objectPosition: `${scrollPos}% center` }}
                    />
                    <div className={styles.imageControls}>
                      <wcs-button
                        shape="round"
                        size="s"
                        mode="clear"
                        className={styles.navButton}
                        disabled={scrollPos === 0}
                        onClick={() => handleScrollLeft(materiel.id)}
                        title="Défiler vers la gauche"
                      >
                        <wcs-mat-icon icon="chevron_left"></wcs-mat-icon>
                      </wcs-button>
                      <span className={styles.imageCounter}>
                        {images.length > 1 ? `${currentIndex + 1}/${images.length}` : 'Défiler'}
                      </span>
                      <wcs-button
                        shape="round"
                        size="s"
                        mode="clear"
                        className={styles.navButton}
                        disabled={scrollPos === 100}
                        onClick={() => handleScrollRight(materiel.id)}
                        title="Défiler vers la droite"
                      >
                        <wcs-mat-icon icon="chevron_right"></wcs-mat-icon>
                      </wcs-button>
                    </div>
                  </>
                ) : (
                  <div className={styles.noImage}>
                    <wcs-mat-icon icon="train" size="xl"></wcs-mat-icon>
                    <span>Pas d'image</span>
                  </div>
                )}
              </div>

              <div className={styles.content}>
                <h3 className={styles.title}>{materiel.nom}</h3>

                {materiel.nom_technique && (
                  <p className={styles.subtitle}>{materiel.nom_technique}</p>
                )}

                <div className={styles.details}>
                  <div className={styles.detailItem}>
                    <wcs-mat-icon icon="tag" size="s"></wcs-mat-icon>
                    <span>N° {materiel.numero_serie}</span>
                  </div>

                  <div className={styles.detailItem}>
                    <wcs-mat-icon icon="people" size="s"></wcs-mat-icon>
                    <span>{materiel.capacite} places</span>
                  </div>

                  <div className={styles.detailItem}>
                    <wcs-mat-icon icon="train" size="s"></wcs-mat-icon>
                    <span>{materiel.type_train}</span>
                  </div>

                  {materiel.exploitant && (
                    <div className={styles.detailItem}>
                      <wcs-mat-icon icon="business" size="s"></wcs-mat-icon>
                      <span>{materiel.exploitant}</span>
                    </div>
                  )}
                </div>

                <div className={styles.actions}>
                  <wcs-button
                    mode="clear"
                    size="s"
                    onClick={() => handleEdit(materiel)}
                  >
                    <wcs-mat-icon icon="edit"></wcs-mat-icon>
                    Modifier
                  </wcs-button>
                  <wcs-button
                    mode="clear"
                    size="s"
                    class="danger"
                    disabled={deletingId === materiel.id}
                    onClick={() => handleDelete(materiel.id, materiel.nom)}
                  >
                    <wcs-mat-icon icon="delete"></wcs-mat-icon>
                    {deletingId === materiel.id ? 'Suppression...' : 'Supprimer'}
                  </wcs-button>
                </div>
              </div>
            </wcs-card>
          );
        })}
      </div>
    </div>
  );
}
