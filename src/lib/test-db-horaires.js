// Script pour tester la connexion à la base de données MySQL des horaires
// Exécuter avec: node src/lib/test-db-horaires.js

import pool from './db_horaires.js';

async function testConnection() {
  try {
    console.log('🔄 Test de connexion à la base de données MySQL (horaires)...\n');

    const connection = await pool.getConnection();
    console.log('✅ Connexion réussie à MySQL (horaires) !');

    const [databases] = await connection.query('SHOW DATABASES');
    console.log('\n📊 Bases de données disponibles:');
    databases.forEach(db => {
      console.log(`  - ${Object.values(db)[0]}`);
    });

    const [tables] = await connection.query('SHOW TABLES');
    console.log('\n📋 Tables dans la base de données:');
    if (tables.length === 0) {
      console.log('  ⚠️  Aucune table trouvée. Assurez-vous que la DB des horaires existe.');
    } else {
      tables.forEach(table => {
        console.log(`  - ${Object.values(table)[0]}`);
      });
    }

    connection.release();
    console.log('\n✅ Test terminé avec succès !');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erreur lors du test de connexion (horaires):');
    console.error('Message:', error.message);
    process.exit(1);
  }
}

testConnection();

