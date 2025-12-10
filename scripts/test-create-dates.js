// Test de création d'info trafic avec dates
import db from '../src/lib/db.js';

async function testCreateWithDates() {
  try {
    console.log('=== TEST CRÉATION INFO TRAFIC AVEC DATES ===');

    // Simuler la fonction serializeRow de l'API
    function serializeRow(row) {
      if (!row) return row;

      // Fonction helper pour traiter une date de manière robuste
      const processDate = (dateValue) => {
        console.log(`[processDate] Input: ${JSON.stringify(dateValue)}, type: ${typeof dateValue}`);

        if (dateValue === null || dateValue === undefined || dateValue === '') {
          return null;
        }

        // Si c'est déjà une chaîne YYYY-MM-DD, la retourner telle quelle
        if (typeof dateValue === 'string') {
          // Nettoyer la chaîne et vérifier le format
          const cleaned = dateValue.trim();
          if (cleaned.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return cleaned;
          }
          // Si c'est une chaîne avec timestamp, extraire juste la date
          if (cleaned.includes('T') || cleaned.includes(' ')) {
            return cleaned.split('T')[0].split(' ')[0];
          }
          return cleaned || null;
        }

        // Si c'est un objet Date
        if (dateValue instanceof Date) {
          return dateValue.toISOString().slice(0, 10);
        }

        // Tenter de convertir en string et nettoyer
        try {
          const str = String(dateValue);
          if (str && str !== 'null' && str !== 'undefined') {
            return str.slice(0, 10);
          }
        } catch (e) {
          console.warn('Erreur lors du traitement de la date:', dateValue, e);
        }

        return null;
      };

      const dDebut = processDate(row.date_debut);
      const dFin = processDate(row.date_fin);

      return {
        ...row,
        date_debut: dDebut,
        date_fin: dFin,
        dateDebut: dDebut,
        dateFin: dFin,
        displayDateDebut: dDebut,
        displayDateFin: dFin
      };
    }

    // 1. Simuler l'insertion d'une nouvelle info avec dates
    const testData = {
      titre: 'TEST AVEC DATES',
      description: 'Test avec des dates valides',
      type: 'travaux',
      dateDebut: '2025-12-15',
      dateFin: '2025-12-16'
    };

    console.log('\n1. Données à insérer:', testData);

    // Insertion comme dans l'API POST
    const [result] = await db.execute(
      `INSERT INTO info_trafic (titre, description, type, date_debut, date_fin) VALUES (?, ?, ?, ?, ?)`,
      [testData.titre, testData.description, testData.type, testData.dateDebut || null, testData.dateFin || null]
    );

    const insertedId = result.insertId;
    console.log('\n2. ID inséré:', insertedId);

    // Récupération comme dans l'API POST
    const [rows] = await db.execute('SELECT * FROM info_trafic WHERE id = ?', [insertedId]);
    const created = rows[0];

    console.log('\n3. Données brutes récupérées:', created);
    console.log('   - date_debut type:', typeof created.date_debut, 'value:', JSON.stringify(created.date_debut));
    console.log('   - date_fin type:', typeof created.date_fin, 'value:', JSON.stringify(created.date_fin));

    // Sérialisation comme dans l'API
    const serialized = serializeRow(created);
    console.log('\n4. Données sérialisées:', serialized);

    // Simulation de la réponse JSON
    const jsonResponse = JSON.stringify(serialized);
    console.log('\n5. Réponse JSON finale:');
    console.log(jsonResponse);

    // Test avec dates null
    console.log('\n=== TEST AVEC DATES NULL ===');
    const testDataNull = {
      titre: 'TEST SANS DATES',
      description: 'Test sans dates',
      type: 'information',
      dateDebut: null,
      dateFin: null
    };

    const [resultNull] = await db.execute(
      `INSERT INTO info_trafic (titre, description, type, date_debut, date_fin) VALUES (?, ?, ?, ?, ?)`,
      [testDataNull.titre, testDataNull.description, testDataNull.type, testDataNull.dateDebut, testDataNull.dateFin]
    );

    const insertedIdNull = resultNull.insertId;
    const [rowsNull] = await db.execute('SELECT * FROM info_trafic WHERE id = ?', [insertedIdNull]);
    const createdNull = rowsNull[0];

    console.log('6. Données brutes avec dates null:', createdNull);
    console.log('   - date_debut type:', typeof createdNull.date_debut, 'value:', JSON.stringify(createdNull.date_debut));
    console.log('   - date_fin type:', typeof createdNull.date_fin, 'value:', JSON.stringify(createdNull.date_fin));

    const serializedNull = serializeRow(createdNull);
    console.log('7. Données sérialisées avec dates null:', serializedNull);

  } catch (error) {
    console.error('Erreur lors du test:', error);
  } finally {
    await db.end();
  }
}

testCreateWithDates();
