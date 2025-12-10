// Test direct de l'API infos-trafic
import db from '../src/lib/db.js';

async function testAPI() {
  try {
    console.log('=== TEST DIRECT DE LA BASE DE DONNÉES ===');

    // 1. Vérifier les données brutes dans la base
    const [rawRows] = await db.execute('SELECT * FROM info_trafic ORDER BY id DESC LIMIT 5');
    console.log('\n1. Données brutes de la BDD:');
    rawRows.forEach(row => {
      console.log(`ID ${row.id}: ${row.titre}`);
      console.log(`  - date_debut: ${JSON.stringify(row.date_debut)} (type: ${typeof row.date_debut})`);
      console.log(`  - date_fin: ${JSON.stringify(row.date_fin)} (type: ${typeof row.date_fin})`);
    });

    console.log('\n=== TEST DE LA FONCTION SERIALIZE ===');

    // 2. Tester la fonction serializeRow (copie exacte de l'API)
    function serializeRow(row) {
      if (!row) return row;

      // Fonction helper pour traiter une date de manière robuste
      const processDate = (dateValue) => {
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

      // Log pour debug (à supprimer en production)
      console.log(`[serializeRow] ID ${row.id}: date_debut raw="${row.date_debut}" -> processed="${dDebut}", date_fin raw="${row.date_fin}" -> processed="${dFin}"`);

      return {
        ...row,
        // snake_case as in DB
        date_debut: dDebut,
        date_fin: dFin,
        // camelCase convenience fields for front-end
        dateDebut: dDebut,
        dateFin: dFin,
        // display helpers (string or null)
        displayDateDebut: dDebut,
        displayDateFin: dFin
      };
    }

    console.log('\n2. Données sérialisées (comme l\'API):');
    const serializedRows = rawRows.map(serializeRow);
    serializedRows.forEach(row => {
      console.log(`ID ${row.id}: ${row.titre}`);
      console.log(`  - dateDebut: ${JSON.stringify(row.dateDebut)}`);
      console.log(`  - dateFin: ${JSON.stringify(row.dateFin)}`);
      console.log(`  - displayDateDebut: ${JSON.stringify(row.displayDateDebut)}`);
      console.log(`  - displayDateFin: ${JSON.stringify(row.displayDateFin)}`);
    });

    console.log('\n3. Simulation JSON.stringify (comme HTTP response):');
    const jsonString = JSON.stringify(serializedRows, null, 2);
    console.log(jsonString);

  } catch (error) {
    console.error('Erreur lors du test:', error);
  } finally {
    await db.end();
  }
}

testAPI();

