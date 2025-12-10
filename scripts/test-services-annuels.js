// Script simple pour tester la création d'un service annuel
const mysql = require('mysql2/promise');

async function testServicesAnnuels() {
  let connection;

  try {
    // Configuration de connexion (à adapter selon votre config)
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '', // Mettez votre mot de passe MySQL
      database: 'horaires',
      charset: 'utf8mb4'
    });

    console.log('✅ Connexion à la base "horaires" établie');

    // Créer la table si elle n'existe pas
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS services_annuels (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nom VARCHAR(255) NOT NULL,
          date_debut DATE NOT NULL,
          date_fin DATE NOT NULL,
          description TEXT DEFAULT NULL,
          actif BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.execute(createTableSQL);
    console.log('✅ Table services_annuels créée/vérifiée');

    // Vérifier s'il y a déjà des données
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM services_annuels');

    if (rows[0].count === 0) {
      console.log('📝 Insertion de données de test...');

      // Insérer quelques services annuels de test
      const testData = [
        {
          nom: 'Service Hiver 2024-2025',
          date_debut: '2024-12-01',
          date_fin: '2025-03-31'
        },
        {
          nom: 'Service Été 2025',
          date_debut: '2025-04-01',
          date_fin: '2025-09-30'
        },
        {
          nom: 'Service Automne 2025',
          date_debut: '2025-10-01',
          date_fin: '2025-11-30'
        }
      ];

      for (const sa of testData) {
        await connection.execute(
          'INSERT INTO services_annuels (nom, date_debut, date_fin) VALUES (?, ?, ?)',
          [sa.nom, sa.date_debut, sa.date_fin]
        );
      }

      console.log('✅ 3 services annuels de test créés');
    } else {
      console.log(`ℹ️  ${rows[0].count} service(s) annuel(s) déjà présent(s)`);
    }

    // Afficher les services annuels
    const [services] = await connection.execute('SELECT * FROM services_annuels ORDER BY date_debut DESC');

    console.log('\n📋 Services Annuels dans la base :');
    services.forEach(sa => {
      console.log(`  - ${sa.nom} (${sa.date_debut} → ${sa.date_fin})`);
    });

    console.log('\n🎉 Test terminé avec succès !');
    console.log('💡 Vous pouvez maintenant tester l\'interface web');

  } catch (error) {
    console.error('❌ Erreur :', error.message);
    console.log('\n💡 Vérifiez que :');
    console.log('  - MySQL est démarré');
    console.log('  - La base de données "horaires" existe');
    console.log('  - Les identifiants de connexion sont corrects');
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testServicesAnnuels();
