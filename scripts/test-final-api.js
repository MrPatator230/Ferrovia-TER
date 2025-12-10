// Test final pour vérifier le bon fonctionnement de l'API
import db from '../src/lib/db.js';

async function testFinalAPI() {
  try {
    console.log('=== TEST FINAL DE L\'API INFOS TRAFIC ===');
    
    // 1. Créer une nouvelle info avec des dates
    console.log('\n1. Test création avec dates...');
    const createPayload = {
      titre: 'TEST FINAL DATES',
      description: 'Test final avec des dates',
      type: 'travaux',
      dateDebut: '2025-12-20',
      dateFin: '2025-12-21'
    };

    // Simuler la requête POST
    const [result] = await db.execute(
      `INSERT INTO info_trafic (titre, description, type, date_debut, date_fin) VALUES (?, ?, ?, ?, ?)`,
      [createPayload.titre, createPayload.description, createPayload.type, createPayload.dateDebut, createPayload.dateFin]
    );

    const insertedId = result.insertId;
    console.log(`✓ Créé avec ID: ${insertedId}`);

    // 2. Récupérer les données comme le fait l'API GET
    console.log('\n2. Test récupération (GET)...');
    const [rows] = await db.execute('SELECT * FROM info_trafic WHERE id = ?', [insertedId]);
    const retrieved = rows[0];

    console.log('Données récupérées:');
    console.log(`  - titre: "${retrieved.titre}"`);
    console.log(`  - type: "${retrieved.type}"`);
    console.log(`  - date_debut: "${retrieved.date_debut}"`);
    console.log(`  - date_fin: "${retrieved.date_fin}"`);

    // 3. Test de sérialisation (comme dans l'API)
    function serializeRow(row) {
      if (!row) return row;
      
      const processDate = (dateValue) => {
        if (dateValue === null || dateValue === undefined || dateValue === '') {
          return null;
        }
        
        if (typeof dateValue === 'string') {
          const cleaned = dateValue.trim();
          if (cleaned.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return cleaned;
          }
          if (cleaned.includes('T') || cleaned.includes(' ')) {
            return cleaned.split('T')[0].split(' ')[0];
          }
          return cleaned || null;
        }
        
        if (dateValue instanceof Date) {
          return dateValue.toISOString().slice(0, 10);
        }
        
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

    const serialized = serializeRow(retrieved);
    console.log('\n3. Données sérialisées (comme réponse API):');
    console.log(`  - dateDebut: "${serialized.dateDebut}"`);
    console.log(`  - dateFin: "${serialized.dateFin}"`);

    // 4. Test JSON (comme réponse HTTP)
    const jsonResponse = JSON.stringify(serialized);
    const parsed = JSON.parse(jsonResponse);
    
    console.log('\n4. Après JSON.stringify/parse:');
    console.log(`  - dateDebut: "${parsed.dateDebut}"`);
    console.log(`  - dateFin: "${parsed.dateFin}"`);

    if (parsed.dateDebut === '2025-12-20' && parsed.dateFin === '2025-12-21') {
      console.log('\n✅ SUCCESS: Les dates sont correctement préservées !');
    } else {
      console.log('\n❌ FAILURE: Les dates ne sont pas correctement préservées');
    }

    // 5. Test avec dates null
    console.log('\n5. Test avec dates null...');
    const [resultNull] = await db.execute(
      `INSERT INTO info_trafic (titre, description, type, date_debut, date_fin) VALUES (?, ?, ?, ?, ?)`,
      ['TEST NULL', 'Test sans dates', 'information', null, null]
    );

    const [rowsNull] = await db.execute('SELECT * FROM info_trafic WHERE id = ?', [resultNull.insertId]);
    const serializedNull = serializeRow(rowsNull[0]);

    console.log(`  - dateDebut null: ${serializedNull.dateDebut === null ? '✓' : '❌'}`);
    console.log(`  - dateFin null: ${serializedNull.dateFin === null ? '✓' : '❌'}`);

    console.log('\n=== TEST TERMINÉ ===');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    await db.end();
  }
}

testFinalAPI();
