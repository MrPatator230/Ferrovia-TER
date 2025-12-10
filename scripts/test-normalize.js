// Test de la fonction normalizeInfo
function normalizeInfo(row) {
  if (!row) return row;
  // Avec dateStrings: true, les dates sont déjà des chaînes YYYY-MM-DD ou null
  const dDebut = row.date_debut || null;
  const dFin = row.date_fin || null;
  return {
    id: row.id,
    titre: row.titre,
    description: row.description,
    type: row.type,
    dateDebut: dDebut,
    dateFin: dFin,
    displayDateDebut: dDebut,
    displayDateFin: dFin,
    // inclure d'autres champs bruts si besoin
    raw: row
  };
}

// Données de test similaires à celles de la base
const testData = [
  {
    "id": 6,
    "titre": "TRAVAUX SUR LES VOIES",
    "description": "Travaux de maintenance prévus",
    "type": "travaux",
    "date_debut": "2025-12-07",
    "date_fin": "2025-12-08",
    "created_at": "2025-12-07 23:01:41",
    "updated_at": "2025-12-07 23:01:41"
  },
  {
    "id": 5,
    "titre": "test",
    "description": "<p>tet</p>",
    "type": "alerte",
    "date_debut": null,
    "date_fin": null,
    "created_at": "2025-12-07 22:58:08",
    "updated_at": "2025-12-07 22:58:08"
  }
];

console.log('Test de normalizeInfo:');
testData.forEach(item => {
  const normalized = normalizeInfo(item);
  console.log(`\nTitre: ${normalized.titre}`);
  console.log(`Date début: ${normalized.dateDebut || '—'}`);
  console.log(`Date fin: ${normalized.dateFin || '—'}`);
  console.log(`Affichage: Du ${normalized.dateDebut || '—'} au ${normalized.dateFin || '—'}`);
});
