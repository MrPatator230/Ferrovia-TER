// Script temporaire pour insérer des données de test dans info_trafic
import db from '../src/lib/db.js';

async function insertTestData() {
  try {
    console.log('Insertion de données de test...');

    // Insérer quelques enregistrements de test avec des dates
    const testData = [
      {
        titre: 'TRAVAUX SUR LES VOIES',
        description: 'Travaux de maintenance prévus',
        type: 'travaux',
        date_debut: '2025-12-07',
        date_fin: '2025-12-08'
      },
      {
        titre: 'Information trafic',
        description: 'Information importante',
        type: 'information',
        date_debut: '2025-12-06',
        date_fin: '2025-12-10'
      }
    ];

    for (const item of testData) {
      const [result] = await db.execute(
        `INSERT INTO info_trafic (titre, description, type, date_debut, date_fin) VALUES (?, ?, ?, ?, ?)`,
        [item.titre, item.description, item.type, item.date_debut, item.date_fin]
      );
      console.log(`Inséré: ${item.titre} (ID: ${result.insertId})`);
    }

    // Afficher les données actuelles
    const [rows] = await db.execute('SELECT * FROM info_trafic ORDER BY id DESC');
    console.log('Données actuelles dans info_trafic:');
    console.log(JSON.stringify(rows, null, 2));

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await db.end();
  }
}

insertTestData();
