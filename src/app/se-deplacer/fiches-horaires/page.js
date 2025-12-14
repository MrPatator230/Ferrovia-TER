"use client";
import React, { useState, useEffect } from 'react';
import InfoBanner from '../../../components/InfoBanner';
import Header from '../../../components/Header';
import NavigationBar from '../../../components/NavigationBar';
import styles from './page.module.css';

export default function FichesHorairesPage() {
  const [lignes, setLignes] = useState([]);
  const [stations, setStations] = useState([]);
  const [selectedLigne, setSelectedLigne] = useState('');
  const [selectedStation, setSelectedStation] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Charger les lignes et les gares
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Charger les lignes
        const lignesRes = await fetch('/api/lignes');
        const lignesData = await lignesRes.json();
        if (lignesData.success && lignesData.lignes) {
          setLignes(lignesData.lignes);
        }

        // Charger les gares
        const stationsRes = await fetch('/api/admin/stations');
        const stationsData = await stationsRes.json();
        if (Array.isArray(stationsData)) {
          setStations(stationsData);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSearch = async () => {
    setSearching(true);
    setHasSearched(true);
    try {
      // Récupérer toutes les fiches horaires
      const res = await fetch('/api/fiches-horaires');
      const data = await res.json();

      if (data.success && data.fiches) {
        // Filtrer les fiches selon la ligne ou la gare sélectionnée
        let filteredFiches = data.fiches.filter(fiche => fiche.afficher_page_recherche);

        if (selectedLigne) {
          filteredFiches = filteredFiches.filter(fiche =>
            fiche.ligne_id && fiche.ligne_id.toString() === selectedLigne.toString()
          );
        }

        // Pour la recherche par gare, on devrait idéalement avoir une relation
        // entre gares et fiches horaires. Pour l'instant, on garde toutes les fiches
        // si une gare est sélectionnée (à améliorer selon votre logique métier)

        setSearchResults(filteredFiches);
      }
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <>
      <Header />
      <NavigationBar />
      <InfoBanner />

      <div className={styles.container}>
        <div className={styles.hero}>
          {/* Icône et titre */}
          <div className={styles.iconWrapper}>
            <wcs-mat-icon icon="schedule" size="xl" style={{ fontSize: '120px', color: '#0088ce' }}></wcs-mat-icon>
            <wcs-mat-icon icon="description" size="xl" style={{ fontSize: '120px', color: '#0088ce', marginLeft: '20px' }}></wcs-mat-icon>
          </div>

          <h1 className={styles.title}>Rechercher une fiche horaire</h1>
          <p className={styles.subtitle}>
            Consulter l'ensemble des fiches horaires, travaux et tous les horaires modifiés de votre ligne.
          </p>
        </div>

        <wcs-card className={styles.searchCard}>
          <wcs-card-body>
            <div className={styles.searchGrid}>
              {/* Colonne Ligne */}
              <div className={styles.searchColumn}>
                <wcs-label>Ligne</wcs-label>
                <wcs-select
                  placeholder="Sélectionner une ligne"
                  value={selectedLigne}
                  onWcsChange={(e) => setSelectedLigne(e.detail)}
                  disabled={loading}
                  style={{ width: '100%' }}
                >
                  <wcs-select-option value="">Ligne</wcs-select-option>
                  {lignes.map(ligne => (
                    <wcs-select-option key={ligne.id} value={ligne.id}>
                      {ligne.nom}
                    </wcs-select-option>
                  ))}
                </wcs-select>
              </div>

              {/* Séparateur "ou" */}
              <div className={styles.separator}>
                <span className={styles.separatorText}>ou</span>
              </div>

              {/* Colonne Gare */}
              <div className={styles.searchColumn}>
                <wcs-label>Gare</wcs-label>
                <wcs-select
                  placeholder="Sélectionner une gare"
                  value={selectedStation}
                  onWcsChange={(e) => setSelectedStation(e.detail)}
                  disabled={loading}
                  style={{ width: '100%' }}
                >
                  <wcs-select-option value="">Gare</wcs-select-option>
                  {stations.map(station => (
                    <wcs-select-option key={station.id} value={station.id}>
                      {station.nom}
                    </wcs-select-option>
                  ))}
                </wcs-select>
              </div>
            </div>

            {/* Bouton Rechercher */}
            <div className={styles.buttonWrapper}>
              <wcs-button
                mode="primary"
                onClick={handleSearch}
                disabled={loading || searching || (!selectedLigne && !selectedStation)}
                style={{ minWidth: '200px' }}
              >
                {searching ? (
                  <>
                    <wcs-spinner mode="light"></wcs-spinner>
                    <span style={{ marginLeft: '8px' }}>Recherche en cours...</span>
                  </>
                ) : (
                  <>
                    <wcs-mat-icon icon="search"></wcs-mat-icon>
                    <span style={{ marginLeft: '8px' }}>Rechercher</span>
                  </>
                )}
              </wcs-button>
            </div>
          </wcs-card-body>
        </wcs-card>

        {/* Résultats de recherche */}
        {hasSearched && (
          <div className={styles.resultsSection}>
            {searching ? (
              <div className={styles.loadingResults}>
                <wcs-spinner></wcs-spinner>
                <p style={{ marginTop: '1rem' }}>Recherche des fiches horaires...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <>
                <h2 className={styles.resultsTitle}>
                  <wcs-badge color="primary" style={{ marginRight: '1rem' }}>{searchResults.length}</wcs-badge>
                  fiche{searchResults.length > 1 ? 's' : ''} horaire{searchResults.length > 1 ? 's' : ''} trouvée{searchResults.length > 1 ? 's' : ''}
                </h2>
                <div className={styles.resultsGrid}>
                  {searchResults.map(fiche => (
                    <wcs-card key={fiche.id} className={styles.ficheCard}>
                      <wcs-card-body>
                        <div className={styles.ficheHeader}>
                          <wcs-mat-icon icon="description" size="l" style={{ color: '#0088ce' }}></wcs-mat-icon>
                          <wcs-badge
                            color={fiche.type_fiche === 'Travaux' ? 'warning' : 'info'}
                            style={{ textTransform: 'uppercase' }}
                          >
                            {fiche.type_fiche || 'SA'}
                          </wcs-badge>
                        </div>

                        <h3 className={styles.ficheTitle}>{fiche.nom}</h3>

                        <div className={styles.ficheDetails}>
                          {fiche.service_annuel_nom && (
                            <div className={styles.ficheDetail}>
                              <wcs-mat-icon icon="event" size="s"></wcs-mat-icon>
                              <span>{fiche.service_annuel_nom}</span>
                            </div>
                          )}

                          {fiche.service_date_debut && fiche.service_date_fin && (
                            <div className={styles.ficheDetail}>
                              <wcs-mat-icon icon="schedule" size="s"></wcs-mat-icon>
                              <span>
                                {new Date(fiche.service_date_debut).toLocaleDateString('fr-FR')} - {new Date(fiche.service_date_fin).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                          )}

                          {fiche.design_region && (
                            <div className={styles.ficheDetail}>
                              <wcs-mat-icon icon="place" size="s"></wcs-mat-icon>
                              <span>{fiche.design_region}</span>
                            </div>
                          )}
                        </div>

                        {fiche.pdf_path ? (
                          <wcs-button
                            mode="primary"
                            onClick={() => window.open(`/${fiche.pdf_path}`, '_blank')}
                            style={{ width: '100%', marginTop: '1rem' }}
                          >
                            <wcs-mat-icon icon="download"></wcs-mat-icon>
                            <span style={{ marginLeft: '8px' }}>Télécharger le PDF</span>
                          </wcs-button>
                        ) : (
                          <wcs-button
                            mode="stroked"
                            disabled
                            style={{ width: '100%', marginTop: '1rem' }}
                          >
                            <wcs-mat-icon icon="info"></wcs-mat-icon>
                            <span style={{ marginLeft: '8px' }}>PDF en cours de génération</span>
                          </wcs-button>
                        )}
                      </wcs-card-body>
                    </wcs-card>
                  ))}
                </div>
              </>
            ) : (
              <wcs-card className={styles.noResults}>
                <wcs-card-body style={{ textAlign: 'center', padding: '3rem' }}>
                  <wcs-mat-icon icon="search_off" size="xl" style={{ fontSize: '80px', opacity: 0.3, color: '#999' }}></wcs-mat-icon>
                  <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>Aucune fiche horaire trouvée</h3>
                  <p style={{ color: '#666', marginBottom: '0.5rem' }}>Aucune fiche horaire n'est disponible pour cette recherche.</p>
                  <p style={{ color: '#999', fontSize: '0.875rem' }}>Essayez avec une autre ligne ou gare.</p>
                </wcs-card-body>
              </wcs-card>
            )}
          </div>
        )}
      </div>
    </>
  );
}

