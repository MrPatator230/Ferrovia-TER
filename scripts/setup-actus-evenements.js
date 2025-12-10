const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ferrovia_ter_bfc'
};

async function createTablesActusEvenements() {
  let connection;

  try {
    console.log('Connexion à la base de données...');
    connection = await mysql.createConnection(dbConfig);

    console.log('Création de la table actualites...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS actualites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titre VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        resume TEXT,
        image_couverture VARCHAR(512),
        pieces_jointes JSON,
        date_publication DATE NOT NULL,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        statut ENUM('brouillon', 'publie', 'archive') DEFAULT 'publie',
        auteur_id INT,
        INDEX idx_date_publication (date_publication),
        INDEX idx_statut (statut),
        FOREIGN KEY (auteur_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Table actualites créée avec succès !');

    console.log('Création de la table evenements...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS evenements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom_evenement VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        nom_bandeau VARCHAR(255),
        page_dediee TEXT,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        statut ENUM('actif', 'inactif', 'archive') DEFAULT 'actif',
        auteur_id INT,
        INDEX idx_statut (statut),
        FOREIGN KEY (auteur_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Table evenements créée avec succès !');

    // Ajouter des données de test
    console.log('Ajout de données de test...');

    // Actualités de test
    await connection.execute(`
      INSERT IGNORE INTO actualites (titre, description, resume, date_publication) VALUES 
      ('Nouvelle ligne TER inaugurée', '<p>Une nouvelle ligne TER reliant Dijon à Beaune vient d\'être inaugurée. Cette ligne permettra de réduire les temps de trajet de 30%.</p>', 'Inauguration de la ligne Dijon-Beaune', '2024-12-01'),
      ('Travaux de modernisation', '<p>D\'importants travaux de modernisation sont en cours sur l\'ensemble du réseau ferroviaire de Bourgogne-Franche-Comté.</p>', 'Modernisation du réseau', '2024-11-28')
    `);

    // Événements de test
    await connection.execute(`
      INSERT IGNORE INTO evenements (nom_evenement, description, nom_bandeau) VALUES 
      ('Journée portes ouvertes', '<p>Venez découvrir les coulisses du transport ferroviaire en Bourgogne-Franche-Comté.</p>', 'Portes Ouvertes'),
      ('Fête du rail', '<p>Célébrez avec nous l\'histoire et l\'avenir du chemin de fer régional.</p>', 'Fête du Rail')
    `);

    console.log('✅ Données de test ajoutées !');
    console.log('🎉 Installation terminée avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors de la création des tables:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Connexion fermée.');
    }
  }
}

// Exécuter le script
if (require.main === module) {
  createTablesActusEvenements();
}

module.exports = { createTablesActusEvenements };
