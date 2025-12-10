// Script rapide pour créer la table stations
const mysql = require('mysql2/promise');

async function createTable() {
  let connection;

  try {
    // Créer la connexion (ajustez les paramètres selon votre configuration)
    connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '', // Mettez votre mot de passe ici
      database: 'ferrovia_ter_bfc'
    });

    console.log('✓ Connecté à la base de données');

    // Créer la table stations
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS stations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(255) NOT NULL,
        type_gare ENUM('interurbaine', 'ville') NOT NULL DEFAULT 'ville',
        service JSON NOT NULL COMMENT 'Liste des services: TER, TGV, Intercités, Fret',
        quais JSON NOT NULL COMMENT 'Liste des quais avec nom et distance',
        transports_commun JSON NOT NULL COMMENT 'Liste des transports en commun avec type et couleur',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_nom (nom),
        INDEX idx_type_gare (type_gare)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✓ Table "stations" créée avec succès !');

  } catch (error) {
    console.error('✗ Erreur:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✓ Connexion fermée');
    }
  }
}

createTable();

