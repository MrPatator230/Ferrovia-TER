"use client";
import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';

export default function ImportGaresPage() {
    const [step, setStep] = useState(1);
    const [stations, setStations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [selectedStation, setSelectedStation] = useState(null);
    const modalRef = useRef(null);

    // Fonction pour générer un fichier Excel d'exemple
    const generateExampleFile = () => {
        const exampleData = [
            {
                nom: 'Dijon-Ville',
                type_gare: 'ville',
                service: '["TER","TGV","Intercités"]',
                quais: '[{"nom":"A","distance":200},{"nom":"B","distance":250}]',
                transports_commun: '[{"type":"Tram","couleur":"#FF0000"},{"type":"Bus","couleur":"#0000FF"}]',
                code: 'DIJ',
                correspondance: '["TER","TGV"]'
            },
            {
                nom: 'Besançon-Viotte',
                type_gare: 'ville',
                service: '["TER","TGV"]',
                quais: '[{"nom":"1","distance":180},{"nom":"2","distance":180},{"nom":"3","distance":200}]',
                transports_commun: '[{"type":"Bus","couleur":"#00AA00"}]',
                code: 'BES',
                correspondance: '["TER"]'
            },
            {
                nom: 'Dole-Ville',
                type_gare: 'interurbaine',
                service: '["TER"]',
                quais: '[{"nom":"1","distance":150}]',
                transports_commun: '[{"type":"Bus","couleur":"#FFA500"}]',
                code: 'DOL',
                correspondance: '[]'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(exampleData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Gares');
        XLSX.writeFile(wb, 'exemple_import_gares.xlsx');
    };

    // Fonction pour analyser le fichier Excel
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);

                // Conversion des données
                const parsedStations = jsonData.map((row, index) => {
                    try {
                        return {
                            _tempId: index,
                            nom: row.nom || '',
                            type_gare: row.type_gare || 'ville',
                            service: typeof row.service === 'string' ? JSON.parse(row.service) : (row.service || []),
                            quais: typeof row.quais === 'string' ? JSON.parse(row.quais) : (row.quais || []),
                            transports_commun: typeof row.transports_commun === 'string' ? JSON.parse(row.transports_commun) : (row.transports_commun || []),
                            code: row.code || null,
                            correspondance: typeof row.correspondance === 'string' ? JSON.parse(row.correspondance) : (row.correspondance || []),
                            _valid: true,
                            _errors: [],
                            _exists: false
                        };
                    } catch (err) {
                        return {
                            _tempId: index,
                            nom: row.nom || 'Erreur',
                            _valid: false,
                            _errors: ['Erreur de parsing: ' + err.message],
                            _rawData: row,
                            _exists: false
                        };
                    }
                });

                // Vérifier les doublons avec l'API
                try {
                    const checkResponse = await fetch('/api/admin/stations/check-duplicates', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            stations: parsedStations.map(s => ({ nom: s.nom, code: s.code }))
                        })
                    });

                    if (checkResponse.ok) {
                        const checkResult = await checkResponse.json();

                        // Marquer les gares existantes
                        const stationsWithDuplicates = parsedStations.map((station, index) => {
                            const duplicateInfo = checkResult.results[index];
                            if (duplicateInfo && duplicateInfo.exists) {
                                return {
                                    ...station,
                                    _exists: true,
                                    _existingId: duplicateInfo.existingId,
                                    _matchType: duplicateInfo.matchType
                                };
                            }
                            return station;
                        });

                        setStations(stationsWithDuplicates);
                    } else {
                        // Si la vérification échoue, continuer quand même
                        setStations(parsedStations);
                    }
                } catch (checkErr) {
                    console.error('Erreur lors de la vérification des doublons:', checkErr);
                    // Continuer quand même
                    setStations(parsedStations);
                }

                setStep(2);
            } catch (err) {
                alert('Erreur lors de la lecture du fichier: ' + err.message);
            } finally {
                setLoading(false);
            }
        };

        reader.readAsArrayBuffer(file);
    };

    // Fonction pour ouvrir la modale de détails
    const openStationModal = (station) => {
        setSelectedStation(station);
        setTimeout(() => {
            if (modalRef.current) {
                modalRef.current.setAttribute('show', '');
            }
        }, 50);
    };

    // Fonction pour fermer la modale
    const closeModal = () => {
        if (modalRef.current) {
            modalRef.current.removeAttribute('show');
        }
        setSelectedStation(null);
    };

    // Fonction pour mettre à jour une gare
    const updateStation = (tempId, updates) => {
        setStations(prev => prev.map(s =>
            s._tempId === tempId ? { ...s, ...updates } : s
        ));
    };

    // Fonction pour importer les gares dans la BDD
    const handleImport = async () => {
        setLoading(true);
        // Filtrer uniquement les gares valides ET qui n'existent pas déjà
        const validStations = stations.filter(s => s._valid && !s._exists);

        try {
            const response = await fetch('/api/admin/stations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stations: validStations.map(s => ({
                    nom: s.nom,
                    type_gare: s.type_gare,
                    service: s.service,
                    quais: s.quais,
                    transports_commun: s.transports_commun,
                    code: s.code,
                    correspondance: s.correspondance
                })) })
            });

            const result = await response.json();

            if (response.ok) {
                setImportResult({
                    success: true,
                    imported: result.imported || validStations.length,
                    total: stations.length,
                    skipped: stations.filter(s => s._exists).length
                });
                setTimeout(() => {
                    window.location.href = '/espace/admin/gares';
                }, 3000);
            } else {
                setImportResult({
                    success: false,
                    error: result.error || 'Erreur lors de l\'import'
                });
            }
        } catch (err) {
            setImportResult({
                success: false,
                error: err.message
            });
        } finally {
            setLoading(false);
        }
    };

    const validStationsCount = stations.filter(s => s._valid && !s._exists).length;
    const invalidStationsCount = stations.filter(s => !s._valid).length;
    const existingStationsCount = stations.filter(s => s._exists).length;

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1>Import de Gares depuis Excel</h1>
                <p style={{ color: '#666' }}>
                    Importez plusieurs gares en une seule fois depuis un fichier Excel
                </p>
            </div>

            {/* Stepper */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '3rem', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: step >= 1 ? '#3b82f6' : '#e5e7eb',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold'
                    }}>1</div>
                    <div style={{ marginLeft: '0.5rem', fontWeight: step === 1 ? 'bold' : 'normal' }}>Import fichier</div>
                </div>

                <div style={{ width: '80px', height: '2px', backgroundColor: step >= 2 ? '#3b82f6' : '#e5e7eb', margin: '0 1rem' }}></div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: step >= 2 ? '#3b82f6' : '#e5e7eb',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold'
                    }}>2</div>
                    <div style={{ marginLeft: '0.5rem', fontWeight: step === 2 ? 'bold' : 'normal' }}>Vérification</div>
                </div>

                <div style={{ width: '80px', height: '2px', backgroundColor: step >= 3 ? '#3b82f6' : '#e5e7eb', margin: '0 1rem' }}></div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: step >= 3 ? '#3b82f6' : '#e5e7eb',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold'
                    }}>3</div>
                    <div style={{ marginLeft: '0.5rem', fontWeight: step === 3 ? 'bold' : 'normal' }}>Confirmation</div>
                </div>
            </div>

            {/* Étape 1 : Import fichier */}
            {step === 1 && (
                <wcs-card>
                    <div style={{ padding: '2rem' }}>
                        <h2>Étape 1 : Sélectionner un fichier Excel</h2>
                        <p style={{ marginBottom: '2rem', color: '#666' }}>
                            Choisissez un fichier Excel contenant les données de vos gares
                        </p>

                        <div style={{
                            border: '2px dashed #d1d5db',
                            borderRadius: '8px',
                            padding: '3rem',
                            textAlign: 'center',
                            marginBottom: '2rem'
                        }}>
                            <wcs-mat-icon icon="upload_file" size="xl" style={{ fontSize: '3rem', color: '#9ca3af' }} />
                            <p style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                                Glissez un fichier Excel ici ou cliquez pour sélectionner
                            </p>
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                                id="file-input"
                            />
                            <label htmlFor="file-input">
                                <wcs-button mode="stroked" onClick={() => document.getElementById('file-input').click()}>
                                    Sélectionner un fichier
                                </wcs-button>
                            </label>
                        </div>

                        <div style={{ marginTop: '2rem' }}>
                            <h3>Besoin d'un exemple ?</h3>
                            <p style={{ marginBottom: '1rem', color: '#666' }}>
                                Téléchargez un fichier d'exemple pour voir le format attendu
                            </p>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <wcs-button mode="stroked" onClick={generateExampleFile}>
                                    <wcs-mat-icon icon="download" size="m" />
                                    Générer un fichier d'exemple
                                </wcs-button>
                                <wcs-button mode="stroked" onClick={() => window.open('/exemple_import_gares.xlsx')}>
                                    <wcs-mat-icon icon="file_download" size="m" />
                                    Télécharger l'exemple pré-généré
                                </wcs-button>
                            </div>
                        </div>

                        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                            <wcs-button mode="stroked" onClick={() => window.location.href = '/espace/admin/gares'}>
                                <wcs-mat-icon icon="arrow_back" size="m" />
                                Retour
                            </wcs-button>
                        </div>
                    </div>
                </wcs-card>
            )}

            {/* Étape 2 : Liste des gares */}
            {step === 2 && (
                <wcs-card>
                    <div style={{ padding: '2rem' }}>
                        <h2>Étape 2 : Vérification des gares</h2>
                        <p style={{ marginBottom: '2rem', color: '#666' }}>
                            {stations.length} gare(s) détectée(s). Vérifiez les informations avant l'import.
                        </p>

                        {stations.length === 0 ? (
                            <wcs-message show-close-button={false}>
                                <div slot="header">Aucune gare détectée</div>
                                Le fichier ne contient aucune gare valide.
                            </wcs-message>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Nom</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Code</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Type</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Services</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'center' }}>Statut</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'center' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stations.map(station => (
                                            <tr key={station._tempId} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                                <td style={{ padding: '0.75rem' }}>{station.nom}</td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    <wcs-badge color="gray">{station.code || 'N/A'}</wcs-badge>
                                                </td>
                                                <td style={{ padding: '0.75rem' }}>{station.type_gare}</td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    {station._valid && station.service ? station.service.join(', ') : '-'}
                                                </td>
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                    {station._exists ? (
                                                        <wcs-badge color="info">Existante</wcs-badge>
                                                    ) : station._valid ? (
                                                        <wcs-badge color="success">Valide</wcs-badge>
                                                    ) : (
                                                        <wcs-badge color="warning">Erreur</wcs-badge>
                                                    )}
                                                </td>
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                    <wcs-button mode="stroked" onClick={() => openStationModal(station)}>
                                                        <wcs-mat-icon icon="visibility" size="s" />
                                                        Voir
                                                    </wcs-button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                            <wcs-button mode="stroked" onClick={() => setStep(1)}>
                                <wcs-mat-icon icon="arrow_back" size="m" />
                                Retour
                            </wcs-button>
                            <wcs-button onClick={() => setStep(3)} disabled={stations.length === 0}>
                                Continuer
                                <wcs-mat-icon icon="arrow_forward" size="m" />
                            </wcs-button>
                        </div>
                    </div>
                </wcs-card>
            )}

            {/* Étape 3 : Confirmation */}
            {step === 3 && (
                <wcs-card>
                    <div style={{ padding: '2rem' }}>
                        <h2>Étape 3 : Confirmation de l'import</h2>
                        <p style={{ marginBottom: '2rem', color: '#666' }}>
                            Vérifiez le résumé avant de lancer l'import définitif dans la base de données
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                            <wcs-card mode="raised">
                                <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>
                                        {stations.length}
                                    </div>
                                    <div style={{ marginTop: '0.5rem', color: '#666' }}>
                                        Total gares
                                    </div>
                                </div>
                            </wcs-card>

                            <wcs-card mode="raised">
                                <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
                                        {validStationsCount}
                                    </div>
                                    <div style={{ marginTop: '0.5rem', color: '#666' }}>
                                        Gares valides
                                    </div>
                                </div>
                            </wcs-card>

                            <wcs-card mode="raised">
                                <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>
                                        {invalidStationsCount}
                                    </div>
                                    <div style={{ marginTop: '0.5rem', color: '#666' }}>
                                        Erreurs
                                    </div>
                                </div>
                            </wcs-card>
                        </div>

                        {(invalidStationsCount > 0 || existingStationsCount > 0) && (
                            <wcs-message show-close-button={false} type="warning">
                                <div slot="header">Attention</div>
                                {invalidStationsCount > 0 && (
                                    <div>{invalidStationsCount} gare(s) ne pourront pas être importées en raison d'erreurs de format.</div>
                                )}
                                {existingStationsCount > 0 && (
                                    <div>{existingStationsCount} gare(s) existent déjà dans la base de données et seront ignorées.</div>
                                )}
                                {validStationsCount > 0 ? (
                                    <div style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>
                                        Seules {validStationsCount} nouvelle(s) gare(s) seront importées.
                                    </div>
                                ) : (
                                    <div style={{ marginTop: '0.5rem', fontWeight: 'bold', color: '#dc2626' }}>
                                        Aucune nouvelle gare à importer.
                                    </div>
                                )}
                            </wcs-message>
                        )}

                        {importResult && (
                            <div style={{ marginTop: '1rem' }}>
                                {importResult.success ? (
                                    <wcs-message show-close-button={false} type="success">
                                        <div slot="header">Import réussi !</div>
                                        {importResult.imported} gare(s) sur {importResult.total} ont été importées avec succès.
                                        {importResult.skipped > 0 && (
                                            <div>{importResult.skipped} gare(s) existante(s) ont été ignorées.</div>
                                        )}
                                        <div style={{ marginTop: '0.5rem' }}>Redirection en cours...</div>
                                    </wcs-message>
                                ) : (
                                    <wcs-message show-close-button={false} type="error">
                                        <div slot="header">Erreur d'import</div>
                                        {importResult.error}
                                    </wcs-message>
                                )}
                            </div>
                        )}

                        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                            <wcs-button mode="stroked" onClick={() => setStep(2)} disabled={loading}>
                                <wcs-mat-icon icon="arrow_back" size="m" />
                                Retour
                            </wcs-button>
                            <wcs-button onClick={handleImport} disabled={loading || validStationsCount === 0}>
                                {loading ? (
                                    <>
                                        <wcs-spinner mode="border" />
                                        Import en cours...
                                    </>
                                ) : (
                                    <>
                                        <wcs-mat-icon icon="cloud_upload" size="m" />
                                        Importer les gares
                                    </>
                                )}
                            </wcs-button>
                        </div>
                    </div>
                </wcs-card>
            )}

            {/* Modale de détails */}
            <button id="station-detail-modal-trigger" style={{ display: 'none' }} aria-hidden="true" />
            <wcs-modal ref={modalRef} modal-trigger-controls-id="station-detail-modal-trigger" show-close-button size="l" onWcsDialogClosed={closeModal}>
                <div slot="header">Détails de la gare</div>
                {selectedStation && (
                    <div style={{ padding: '1.5rem', backgroundColor: 'white' }}>
                        {selectedStation._exists && (
                            <wcs-message show-close-button={false} type="info" style={{ marginBottom: '1rem' }}>
                                <div slot="header">Gare existante</div>
                                Cette gare existe déjà dans la base de données (correspondance par {selectedStation._matchType === 'nom' ? 'nom' : 'code'}).
                                Elle ne sera pas importée à nouveau.
                            </wcs-message>
                        )}
                        <wcs-tabs>
                            <wcs-tab header="Données">
                                <div style={{ padding: '1rem' }}>
                                    {selectedStation._valid ? (
                                        <div>
                                            <div style={{ marginBottom: '1rem' }}>
                                                <strong>Nom :</strong> {selectedStation.nom}
                                            </div>
                                            <div style={{ marginBottom: '1rem' }}>
                                                <strong>Code :</strong> {selectedStation.code || 'N/A'}
                                            </div>
                                            <div style={{ marginBottom: '1rem' }}>
                                                <strong>Type de gare :</strong> {selectedStation.type_gare}
                                            </div>
                                            <div style={{ marginBottom: '1rem' }}>
                                                <strong>Services :</strong>
                                                <div style={{ marginTop: '0.5rem' }}>
                                                    {selectedStation.service && selectedStation.service.map((s, i) => (
                                                        <wcs-badge key={i} color="info" style={{ marginRight: '0.5rem' }}>{s}</wcs-badge>
                                                    ))}
                                                </div>
                                            </div>
                                            <div style={{ marginBottom: '1rem' }}>
                                                <strong>Quais :</strong>
                                                <pre style={{ backgroundColor: '#f3f4f6', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem', overflow: 'auto' }}>
                                                    {JSON.stringify(selectedStation.quais, null, 2)}
                                                </pre>
                                            </div>
                                            <div style={{ marginBottom: '1rem' }}>
                                                <strong>Transports en commun :</strong>
                                                <pre style={{ backgroundColor: '#f3f4f6', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem', overflow: 'auto' }}>
                                                    {JSON.stringify(selectedStation.transports_commun, null, 2)}
                                                </pre>
                                            </div>
                                            <div style={{ marginBottom: '1rem' }}>
                                                <strong>Correspondances :</strong>
                                                <pre style={{ backgroundColor: '#f3f4f6', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem', overflow: 'auto' }}>
                                                    {JSON.stringify(selectedStation.correspondance, null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <wcs-message show-close-button={false} type="error">
                                                <div slot="header">Erreur de parsing</div>
                                                Cette gare contient des erreurs :
                                                <ul>
                                                    {selectedStation._errors && selectedStation._errors.map((err, i) => (
                                                        <li key={i}>{err}</li>
                                                    ))}
                                                </ul>
                                            </wcs-message>
                                            <div style={{ marginTop: '1rem' }}>
                                                <strong>Données brutes :</strong>
                                                <pre style={{ backgroundColor: '#f3f4f6', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem', overflow: 'auto' }}>
                                                    {JSON.stringify(selectedStation._rawData, null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </wcs-tab>
                        </wcs-tabs>
                    </div>
                )}
            </wcs-modal>
        </div>
    );
}

