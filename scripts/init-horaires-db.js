// Script pour initialiser la base de données horaires et créer la table services_annuels
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement depuis .env.local
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
  }
}

loadEnv();

async function initHorairesDB() {
  let connection;

  try {
    console.log('🔄 Initialisation de la base de données horaires...\n');

    // Créer la connexion sans spécifier de base de données
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      charset: 'utf8mb4'
    });

    console.log('✅ Connexion à MySQL établie');

    // 1. Créer la base de données horaires si elle n'existe pas
    await connection.execute('CREATE DATABASE IF NOT EXISTS horaires CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('✅ Base de données "horaires" créée ou vérifiée');

    // 2. Utiliser la base de données horaires
    await connection.execute('USE horaires');

    // 3. Créer la table services_annuels
    const createServicesAnnuelsTable = `
      CREATE TABLE IF NOT EXISTS services_annuels (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nom VARCHAR(255) NOT NULL COMMENT 'Nom du service annuel (ex: "Service Été 2025")',
          date_debut DATE NOT NULL COMMENT 'Date de début du service annuel',
          date_fin DATE NOT NULL COMMENT 'Date de fin du service annuel',
          description TEXT DEFAULT NULL COMMENT 'Description optionnelle du service annuel',
          actif BOOLEAN DEFAULT TRUE COMMENT 'Indique si le service annuel est actif',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_date_debut (date_debut),
          INDEX idx_date_fin (date_fin),
          INDEX idx_actif (actif)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.execute(createServicesAnnuelsTable);
    console.log('✅ Table "services_annuels" créée ou vérifiée');

    // 4. Créer la table horaires si elle n'existe pas (structure basique)
    const createHorairesTable = `
      CREATE TABLE IF NOT EXISTS horaires (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nom VARCHAR(255) NOT NULL COMMENT 'Nom du sillon/horaire',
          service_annuel_id INT DEFAULT NULL COMMENT 'Référence au service annuel',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (service_annuel_id) REFERENCES services_annuels(id) ON DELETE SET NULL,
          INDEX idx_service_annuel (service_annuel_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.execute(createHorairesTable);
    console.log('✅ Table "horaires" créée ou vérifiée');

    // 5. Vérifier les tables créées
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('\n📋 Tables dans la base de données horaires:');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`  - ${tableName}`);
    });

    // 6. Insérer des données de test si la table services_annuels est vide
    const [existingData] = await connection.execute('SELECT COUNT(*) as count FROM services_annuels');
    if (existingData[0].count === 0) {
      console.log('\n🌱 Insertion de données de test...');

      const testData = [
        ['Service Hiver 2024-2025', '2024-12-01', '2025-03-31'],
        ['Service Été 2025', '2025-04-01', '2025-09-30'],
        ['Service Automne 2025', '2025-10-01', '2025-11-30']
      ];

      for (const [nom, dateDebut, dateFin] of testData) {
        await connection.execute(
          'INSERT INTO services_annuels (nom, date_debut, date_fin) VALUES (?, ?, ?)',
          [nom, dateDebut, dateFin]
        );
      }

      console.log('✅ Données de test insérées');
    }

    console.log('\n🎉 Initialisation terminée avec succès !');
    console.log('\n💡 Vous pouvez maintenant tester la fonctionnalité Services Annuels');

  } catch (error) {
    console.error('\n❌ Erreur lors de l\'initialisation:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Exécuter le script
initHorairesDB();
