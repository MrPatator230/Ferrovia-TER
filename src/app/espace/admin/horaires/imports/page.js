"use client";
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

export default function ImportsPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedHoraire, setSelectedHoraire] = useState(null);
  const [showHoraireModal, setShowHoraireModal] = useState(false);
  const [missingGares, setMissingGares] = useState([]);
  const fileInputRef = useRef(null);
  const modalHoraireRef = useRef(null);

  // Fonction pour télécharger le fichier d'exemple
  const downloadExampleFile = () => {
    const exampleData = [
      {
        numero_train: 'TER001',
        type_train: 'TER',
        depart_station_code: 'DIJ',
        arrivee_station_code: 'BES',
        depart_time: '08:30:00',
        arrivee_time: '10:15:00',
        materiel_id: null,
        is_substitution: 0,
        jours_lun: 1,
        jours_mar: 1,
        jours_mer: 1,
        jours_jeu: 1,
        jours_ven: 1,
        jours_sam: 0,
        jours_dim: 0,
        circulent_jours_feries: 0,
        circulent_dimanches: 0,
        stops: '[]'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(exampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Horaires');
    XLSX.writeFile(wb, 'exemple_import_horaires.xlsx');
  };

  // Fonction pour parser le fichier Excel
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
  };

  // Fonction pour importer et parser le fichier
  const handleImportFile = async () => {
    if (!file) {
      setError('Veuillez sélectionner un fichier');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (jsonData.length === 0) {
            setError('Le fichier ne contient aucune donnée');
            setLoading(false);
            return;
          }

          // Étape 1: Récupérer toutes les gares existantes pour validation rapide
          const allStationsRes = await fetch('/api/admin/stations');
          const allStations = allStationsRes.ok ? await allStationsRes.json() : [];

          // Créer un map des codes de gares existants
          const stationsMap = {};
          allStations.forEach(station => {
            if (station.code) {
              stationsMap[station.code.toUpperCase()] = station;
            }
          });

          // Étape 2: Collecter tous les codes de gares utilisés dans le fichier
          const codesUsed = new Set();
          jsonData.forEach(row => {
            if (row.depart_station_code) {
              codesUsed.add(String(row.depart_station_code).toUpperCase());
            }
            if (row.arrivee_station_code) {
              codesUsed.add(String(row.arrivee_station_code).toUpperCase());
            }
          });

          // Étape 3: Vérifier quels codes n'existent pas
          const missingCodes = Array.from(codesUsed).filter(code => !stationsMap[code]);

          // Afficher un avertissement si des codes sont manquants
          if (missingCodes.length > 0) {
            console.warn('⚠️ Codes de gares manquants:', missingCodes);
          }

          // Étape 4: Convertir les données avec les informations des gares
          const dataWithIds = jsonData.map((row, index) => {
            try {
              const departCode = row.depart_station_code ? String(row.depart_station_code).toUpperCase() : null;
              const arriveeCode = row.arrivee_station_code ? String(row.arrivee_station_code).toUpperCase() : null;

              const departStation = departCode ? stationsMap[departCode] : null;
              const arriveeStation = arriveeCode ? stationsMap[arriveeCode] : null;

              return {
                ...row,
                _rowIndex: index + 2, // +2 car ligne 1 = header, +1 pour index base-1
                depart_station_code: departCode,
                arrivee_station_code: arriveeCode,
                depart_station_id: departStation?.id || null,
                arrivee_station_id: arriveeStation?.id || null,
                depart_station_name: departStation?.nom || departCode || 'Code invalide',
                arrivee_station_name: arriveeStation?.nom || arriveeCode || 'Code invalide',
                depart_station_exists: !!departStation,
                arrivee_station_exists: !!arriveeStation,
                jours_circulation: {
                  lun: Boolean(row.jours_lun),
                  mar: Boolean(row.jours_mar),
                  mer: Boolean(row.jours_mer),
                  jeu: Boolean(row.jours_jeu),
                  ven: Boolean(row.jours_ven),
                  sam: Boolean(row.jours_sam),
                  dim: Boolean(row.jours_dim)
                },
                stops: row.stops ? (typeof row.stops === 'string' ? JSON.parse(row.stops) : row.stops) : [],
                _isValid: !!departStation && !!arriveeStation
              };
            } catch (err) {
              console.error('Error processing row:', err);
              return {
                ...row,
                _rowIndex: index + 2,
                _isValid: false,
                error: 'Erreur lors du traitement de la ligne'
              };
            }
          });

          setParsedData(dataWithIds);

          // Afficher un résumé dans la console
          const validCount = dataWithIds.filter(d => d._isValid).length;
          const invalidCount = dataWithIds.length - validCount;
          console.log(`✅ Analyse terminée: ${validCount} horaires valides, ${invalidCount} invalides`);

          if (missingCodes.length > 0) {
            console.log(`⚠️ Gares manquantes (codes): ${missingCodes.join(', ')}`);
          }

          setCurrentStep(2);
        } catch (err) {
          console.error('Erreur parsing:', err);
          setError('Erreur lors de la lecture du fichier: ' + err.message);
        } finally {
          setLoading(false);
        }
      };

      reader.onerror = () => {
        setError('Erreur lors de la lecture du fichier');
        setLoading(false);
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      setError('Erreur: ' + err.message);
      setLoading(false);
    }
  };

  // Fonction pour afficher les détails d'un horaire
  const handleViewHoraire = (horaire, index) => {
    setSelectedHoraire({ ...horaire, _index: index });
    setShowHoraireModal(true);
  };

  // Fonction pour vérifier les gares manquantes
  const handleVerifyImport = async () => {
    setLoading(true);
    setError(null);

    try {
      const missing = parsedData.filter(h => !h.depart_station_id || !h.arrivee_station_id);
      setMissingGares(missing);
      setCurrentStep(3);
    } catch (err) {
      setError('Erreur lors de la vérification: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour importer les horaires dans la BDD
  const handleFinalImport = async () => {
    setLoading(true);
    setError(null);

    try {
      const validHoraires = parsedData.filter(h => h.depart_station_id && h.arrivee_station_id);

      const results = await Promise.all(validHoraires.map(async (horaire) => {
        try {
          const response = await fetch('/api/admin/horaires/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              numero_train: horaire.numero_train,
              type_train: horaire.type_train,
              depart_station_id: horaire.depart_station_id,
              arrivee_station_id: horaire.arrivee_station_id,
              depart_time: horaire.depart_time,
              arrivee_time: horaire.arrivee_time,
              materiel_id: horaire.materiel_id,
              stops: horaire.stops,
              is_substitution: Boolean(horaire.is_substitution),
              jours_circulation: horaire.jours_circulation,
              circulent_jours_feries: Boolean(horaire.circulent_jours_feries),
              circulent_dimanches: Boolean(horaire.circulent_dimanches)
            })
          });

          return { success: response.ok, horaire };
        } catch (err) {
          return { success: false, horaire, error: err.message };
        }
      }));

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      alert(`Import terminé!\n${successCount} horaires importés avec succès\n${failCount} échecs`);
      window.location.href = '/espace/admin/horaires';
    } catch (err) {
      setError('Erreur lors de l\'import: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '16px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* En-tête */}
      <wcs-card mode="flat" style={{ marginBottom: '24px' }}>
        <div slot="header">
          <wcs-card-title>
            <wcs-mat-icon icon="upload_file" size="s"></wcs-mat-icon>
            Import des horaires depuis Excel
          </wcs-card-title>
        </div>
        <div style={{ padding: '16px' }}>
          {/* Stepper */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', position: 'relative' }}>
            {[1, 2, 3].map((step) => (
              <div key={step} style={{
                flex: 1,
                textAlign: 'center',
                position: 'relative',
                zIndex: 1
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: currentStep >= step ? 'var(--wcs-primary)' : '#e0e0e0',
                  color: currentStep >= step ? 'white' : '#666',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 8px',
                  fontWeight: 'bold'
                }}>
                  {step}
                </div>
                <div style={{ fontSize: '14px', color: currentStep >= step ? 'var(--wcs-primary)' : '#666' }}>
                  {step === 1 && 'Import fichier'}
                  {step === 2 && 'Vérification'}
                  {step === 3 && 'Confirmation'}
                </div>
              </div>
            ))}
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '10%',
              right: '10%',
              height: '2px',
              backgroundColor: '#e0e0e0',
              zIndex: 0
            }}>
              <div style={{
                width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%',
                height: '100%',
                backgroundColor: 'var(--wcs-primary)',
                transition: 'width 0.3s ease'
              }}></div>
            </div>
          </div>
        </div>
      </wcs-card>

      {/* Étape 1: Import fichier */}
      {currentStep === 1 && (
        <wcs-card mode="elevated">
          <div slot="header">
            <wcs-card-title>
              <wcs-mat-icon icon="file_upload" size="s"></wcs-mat-icon>
              Étape 1: Sélection et import du fichier
            </wcs-card-title>
          </div>
          <div style={{ padding: '24px' }}>
            {error && (
              <wcs-message mode="error" style={{ marginBottom: '16px' }}>
                {error}
              </wcs-message>
            )}

            <div style={{ marginBottom: '24px' }}>
              <p style={{ marginBottom: '12px', color: '#666' }}>
                Utilisez le format Excel fourni avec les colonnes exactes du schéma de la table "horaires".
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <wcs-button mode="stroked" onClick={downloadExampleFile}>
                  <wcs-mat-icon icon="download" size="s"></wcs-mat-icon>
                  Générer un fichier d'exemple
                </wcs-button>
                <a href="/exemple_import_horaires.xlsx" download style={{ textDecoration: 'none' }}>
                  <wcs-button mode="stroked">
                    <wcs-mat-icon icon="file_download" size="s"></wcs-mat-icon>
                    Télécharger l'exemple pré-généré
                  </wcs-button>
                </a>
              </div>
            </div>

            <div style={{
              border: '2px dashed #ccc',
              borderRadius: '8px',
              padding: '40px',
              textAlign: 'center',
              marginBottom: '24px'
            }}>
              <wcs-mat-icon icon="cloud_upload" size="xl" style={{ fontSize: '64px', color: '#999' }}></wcs-mat-icon>
              <p style={{ marginTop: '16px', marginBottom: '16px', color: '#666' }}>
                {file ? `Fichier sélectionné: ${file.name}` : 'Sélectionnez un fichier Excel'}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <wcs-button onClick={() => fileInputRef.current?.click()}>
                <wcs-mat-icon icon="folder_open" size="s"></wcs-mat-icon>
                Choisir un fichier
              </wcs-button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <wcs-button mode="stroked" onClick={() => window.location.href = '/espace/admin/horaires'}>
                <wcs-mat-icon icon="arrow_back" size="s"></wcs-mat-icon>
                Retour
              </wcs-button>
              <wcs-button onClick={handleImportFile} disabled={!file || loading}>
                {loading ? <wcs-spinner size="s"></wcs-spinner> : <wcs-mat-icon icon="arrow_forward" size="s"></wcs-mat-icon>}
                Analyser le fichier
              </wcs-button>
            </div>
          </div>
        </wcs-card>
      )}

      {/* Étape 2: Liste des horaires détectés */}
      {currentStep === 2 && (
        <wcs-card mode="elevated">
          <div slot="header">
            <wcs-card-title>
              <wcs-mat-icon icon="list" size="s"></wcs-mat-icon>
              Étape 2: Horaires détectés ({parsedData.length})
            </wcs-card-title>
          </div>
          <div style={{ padding: '16px' }}>
            {/* Résumé de la vérification des codes de gares */}
            {parsedData.length > 0 && (() => {
              const validCount = parsedData.filter(h => h._isValid).length;
              const invalidCount = parsedData.length - validCount;
              const missingCodesSet = new Set();

              parsedData.forEach(h => {
                if (!h.depart_station_exists && h.depart_station_code) {
                  missingCodesSet.add(h.depart_station_code);
                }
                if (!h.arrivee_station_exists && h.arrivee_station_code) {
                  missingCodesSet.add(h.arrivee_station_code);
                }
              });

              const missingCodesArray = Array.from(missingCodesSet);

              return (
                <div style={{ marginBottom: '24px' }}>
                  <wcs-message mode={invalidCount > 0 ? 'warning' : 'success'} style={{ marginBottom: '16px' }}>
                    <strong>Vérification des codes de gares :</strong><br/>
                    ✅ {validCount} horaire(s) valide(s) - Toutes les gares existent<br/>
                    {invalidCount > 0 && (
                      <>
                        ⚠️ {invalidCount} horaire(s) invalide(s) - Gares manquantes<br/>
                        <div style={{ marginTop: '8px', padding: '8px', backgroundColor: 'rgba(255, 152, 0, 0.1)', borderRadius: '4px' }}>
                          <strong>Codes de gares manquants :</strong> {missingCodesArray.join(', ')}
                        </div>
                      </>
                    )}
                  </wcs-message>
                </div>
              );
            })()}

            {parsedData.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
                Aucun horaire détecté dans le fichier
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>N° Train</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Type</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Départ</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Arrivée</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Heure départ</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Heure arrivée</th>
                      <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Statut</th>
                      <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.map((horaire, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px' }}>{horaire.numero_train}</td>
                        <td style={{ padding: '12px' }}>{horaire.type_train}</td>
                        <td style={{ padding: '12px' }}>
                          {horaire.depart_station_name}
                          {!horaire.depart_station_id && (
                            <wcs-badge color="warning" style={{ marginLeft: '8px' }}>Manquante</wcs-badge>
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {horaire.arrivee_station_name}
                          {!horaire.arrivee_station_id && (
                            <wcs-badge color="warning" style={{ marginLeft: '8px' }}>Manquante</wcs-badge>
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>{horaire.depart_time}</td>
                        <td style={{ padding: '12px' }}>{horaire.arrivee_time}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {horaire.depart_station_id && horaire.arrivee_station_id ? (
                            <wcs-badge color="success">Valide</wcs-badge>
                          ) : (
                            <wcs-badge color="warning">Gares manquantes</wcs-badge>
                          )}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <wcs-button mode="stroked" size="s" onClick={() => handleViewHoraire(horaire, index)}>
                            <wcs-mat-icon icon="visibility" size="s"></wcs-mat-icon>
                            Voir
                          </wcs-button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '24px' }}>
              <wcs-button mode="stroked" onClick={() => setCurrentStep(1)}>
                <wcs-mat-icon icon="arrow_back" size="s"></wcs-mat-icon>
                Retour
              </wcs-button>
              <wcs-button onClick={handleVerifyImport} disabled={parsedData.length === 0}>
                <wcs-mat-icon icon="arrow_forward" size="s"></wcs-mat-icon>
                Continuer
              </wcs-button>
            </div>
          </div>
        </wcs-card>
      )}

      {/* Étape 3: Vérification avant import */}
      {currentStep === 3 && (
        <wcs-card mode="elevated">
          <div slot="header">
            <wcs-card-title>
              <wcs-mat-icon icon="check_circle" size="s"></wcs-mat-icon>
              Étape 3: Vérification avant import
            </wcs-card-title>
          </div>
          <div style={{ padding: '24px' }}>
            {error && (
              <wcs-message mode="error" style={{ marginBottom: '16px' }}>
                {error}
              </wcs-message>
            )}

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ marginBottom: '16px' }}>Résumé de l'import</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div style={{ padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--wcs-primary)' }}>
                    {parsedData.length}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>Total horaires</div>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#e8f5e9', borderRadius: '8px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4caf50' }}>
                    {parsedData.filter(h => h.depart_station_id && h.arrivee_station_id).length}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>Horaires valides</div>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#fff3e0', borderRadius: '8px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff9800' }}>
                    {missingGares.length}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>Gares manquantes</div>
                </div>
              </div>
            </div>

            {missingGares.length > 0 && (
              <wcs-message mode="warning" style={{ marginBottom: '16px' }}>
                <strong>Attention:</strong> {missingGares.length} horaire(s) ne pourront pas être importés car les gares n'existent pas dans la base de données.
                Veuillez créer ces gares avant de pouvoir importer ces horaires.
              </wcs-message>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <wcs-button mode="stroked" onClick={() => setCurrentStep(2)}>
                <wcs-mat-icon icon="arrow_back" size="s"></wcs-mat-icon>
                Retour
              </wcs-button>
              <wcs-button
                onClick={handleFinalImport}
                disabled={loading || parsedData.filter(h => h.depart_station_id && h.arrivee_station_id).length === 0}
              >
                {loading ? <wcs-spinner size="s"></wcs-spinner> : <wcs-mat-icon icon="upload" size="s"></wcs-mat-icon>}
                Importer les horaires
              </wcs-button>
            </div>
          </div>
        </wcs-card>
      )}

      {/* Modale Horaire avec onglet Données */}
      {showHoraireModal && selectedHoraire && (
        <wcs-modal
          show
          show-close-button
          close-button-aria-label="Fermer"
          ref={modalHoraireRef}
        >
          <div slot="header">
            <wcs-mat-icon icon="schedule" size="s"></wcs-mat-icon>
            Détails de l'horaire - {selectedHoraire.numero_train}
          </div>

          <div style={{ padding: '16px' }}>
            <wcs-tabs>
              <wcs-tab header="Données" item-key="donnees">
                <div style={{ padding: '16px' }}>
                  <h3 style={{ marginBottom: '16px' }}>Informations générales</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '8px', fontWeight: 'bold' }}>Numéro de train:</td>
                        <td style={{ padding: '8px' }}>{selectedHoraire.numero_train}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '8px', fontWeight: 'bold' }}>Type de train:</td>
                        <td style={{ padding: '8px' }}>{selectedHoraire.type_train}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '8px', fontWeight: 'bold' }}>Gare de départ:</td>
                        <td style={{ padding: '8px' }}>
                          {selectedHoraire.depart_station_name}
                          {!selectedHoraire.depart_station_id && (
                            <wcs-badge color="error" style={{ marginLeft: '8px' }}>Non trouvée</wcs-badge>
                          )}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '8px', fontWeight: 'bold' }}>Gare d'arrivée:</td>
                        <td style={{ padding: '8px' }}>
                          {selectedHoraire.arrivee_station_name}
                          {!selectedHoraire.arrivee_station_id && (
                            <wcs-badge color="error" style={{ marginLeft: '8px' }}>Non trouvée</wcs-badge>
                          )}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '8px', fontWeight: 'bold' }}>Heure de départ:</td>
                        <td style={{ padding: '8px' }}>{selectedHoraire.depart_time}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '8px', fontWeight: 'bold' }}>Heure d'arrivée:</td>
                        <td style={{ padding: '8px' }}>{selectedHoraire.arrivee_time}</td>
                      </tr>
                    </tbody>
                  </table>

                  {(!selectedHoraire.depart_station_id || !selectedHoraire.arrivee_station_id) && (
                    <div style={{ marginTop: '24px' }}>
                      <wcs-message mode="warning">
                        Une ou plusieurs gares n'existent pas dans la base de données.
                        Vous devez créer ces gares avant de pouvoir importer cet horaire.
                      </wcs-message>
                      <div style={{ marginTop: '16px' }}>
                        <wcs-button onClick={() => window.location.href = '/espace/admin/gares'}>
                          <wcs-mat-icon icon="add" size="s"></wcs-mat-icon>
                          Gérer les gares
                        </wcs-button>
                      </div>
                    </div>
                  )}
                </div>
              </wcs-tab>
            </wcs-tabs>
          </div>

          <div slot="actions">
            <wcs-button mode="stroked" onClick={() => setShowHoraireModal(false)}>
              <wcs-mat-icon icon="close" size="s"></wcs-mat-icon>
              Fermer
            </wcs-button>
          </div>
        </wcs-modal>
      )}
    </div>
  );
}

