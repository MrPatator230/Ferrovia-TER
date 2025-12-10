const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  multipleStatements: true,
  charset: 'utf8mb4'
};

async function runMigration() {
  let connection;
  try {
    console.log('📦 Connexion à MySQL...');
    connection = await mysql.createConnection(dbConfig);

    console.log('📂 Lecture du fichier de migration...');
    const sqlFile = path.join(__dirname, '..', 'sql', 'migration_add_lignes.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('🚀 Exécution de la migration...');
    await connection.query(sql);

    console.log('✅ Migration terminée avec succès !');

    // Vérifier que la table existe
    const [tables] = await connection.query("SHOW TABLES FROM horaires LIKE 'lignes'");
    console.log('🔍 Vérification:', tables.length > 0 ? 'Table lignes créée ✓' : 'Erreur: table non trouvée ✗');

    // Compter les lignes insérées
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM horaires.lignes');
    console.log(`📊 Nombre de lignes dans la table: ${rows[0].count}`);

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

runMigration();

