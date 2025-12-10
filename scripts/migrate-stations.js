// Script pour exécuter la migration de la table stations
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  let connection;

  try {
    // Créer la connexion
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ferrovia_ter_bfc',
      charset: 'utf8mb4'
    });

    console.log('✓ Connecté à la base de données');

    // Lire le fichier SQL
    const sqlFile = path.join(__dirname, '../sql/migration_add_stations.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Séparer les requêtes SQL
    const queries = sql
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0 && !q.startsWith('--') && !q.startsWith('USE'));

    // Exécuter chaque requête
    for (const query of queries) {
      if (query) {
        await connection.execute(query);
        console.log('✓ Requête exécutée avec succès');
      }
    }

    console.log('✓ Migration terminée avec succès !');

  } catch (error) {
    console.error('✗ Erreur lors de la migration:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✓ Connexion fermée');
    }
  }
}

runMigration();

