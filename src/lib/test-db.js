// Script pour tester la connexion à la base de données MySQL
// Exécuter avec: node src/lib/test-db.js

import pool from './db.js';

async function testConnection() {
  try {
    console.log('🔄 Test de connexion à la base de données MySQL...\n');

    // Test de connexion
    const connection = await pool.getConnection();
    console.log('✅ Connexion réussie à MySQL !');

    // Vérifier la base de données
    const [databases] = await connection.query('SHOW DATABASES');
    console.log('\n📊 Bases de données disponibles:');
    databases.forEach(db => {
      console.log(`  - ${Object.values(db)[0]}`);
    });

    // Vérifier les tables
    const [tables] = await connection.query('SHOW TABLES');
    console.log('\n📋 Tables dans la base de données:');
    if (tables.length === 0) {
      console.log('  ⚠️  Aucune table trouvée. Exécutez le script sql/schema.sql');
    } else {
      tables.forEach(table => {
        console.log(`  - ${Object.values(table)[0]}`);
      });
    }

    // Vérifier la structure de la table users
    try {
      const [columns] = await connection.query('DESCRIBE users');
      console.log('\n👤 Structure de la table users:');
      columns.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type})`);
      });
    } catch (err) {
      console.log('\n⚠️  Table users non trouvée. Exécutez le script sql/schema.sql');
    }

    connection.release();
    console.log('\n✅ Test terminé avec succès !');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erreur lors du test de connexion:');
    console.error('Message:', error.message);
    console.error('\n💡 Vérifiez:');
    console.error('  1. MySQL est bien installé et démarré');
    console.error('  2. Les informations de connexion dans .env.local sont correctes');
    console.error('  3. La base de données "ferrovia_ter" existe');
    console.error('  4. L\'utilisateur a les droits nécessaires');
    process.exit(1);
  }
}

testConnection();

