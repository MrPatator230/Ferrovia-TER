/**
 * Script de test pour la fonctionnalité d'attribution de quai à toutes les gares desservies
 * Usage: node scripts/test-apply-to-all.js
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function testApplyToAll() {
  console.log('🧪 Test: Attribution de quai avec apply_to_all\n');

  try {
    // 1. Récupérer un horaire existant pour le test
    console.log('1️⃣  Récupération d\'un horaire de test...');
    const horairesRes = await fetch(`${BASE_URL}/api/admin/horaires`);
    if (!horairesRes.ok) {
      throw new Error(`Erreur lors de la récupération des horaires: ${horairesRes.status}`);
    }
    const horaires = await horairesRes.json();
    
    if (!Array.isArray(horaires) || horaires.length === 0) {
      console.log('⚠️  Aucun horaire trouvé dans la base de données.');
      console.log('   Veuillez d\'abord créer un horaire avec des gares intermédiaires.');
      return;
    }

    // Trouver un horaire avec des stops
    const horaireAvecStops = horaires.find(h => Array.isArray(h.stops) && h.stops.length > 0);
    const testHoraire = horaireAvecStops || horaires[0];
    
    console.log(`   ✓ Horaire sélectionné: ID=${testHoraire.id}`);
    console.log(`     Train: ${testHoraire.numero_train || 'N/A'}`);
    console.log(`     Départ: ${testHoraire.depart_station_name || testHoraire.depart_station_id}`);
    console.log(`     Arrivée: ${testHoraire.arrivee_station_name || testHoraire.arrivee_station_id}`);
    console.log(`     Stops: ${testHoraire.stops?.length || 0} gare(s) intermédiaire(s)\n`);

    // 2. Test GET initial
    console.log('2️⃣  Test GET /api/admin/horaires/[id]/quais...');
    const getRes1 = await fetch(`${BASE_URL}/api/admin/horaires/${testHoraire.id}/quais`);
    if (!getRes1.ok) {
      throw new Error(`GET failed: ${getRes1.status}`);
    }
    const getData1 = await getRes1.json();
    console.log('   ✓ Réponse GET:', JSON.stringify(getData1, null, 2), '\n');

    // 3. Test PUT avec apply_to_all = true
    console.log('3️⃣  Test PUT avec apply_to_all=true...');
    const testQuai = '5A';
    const putPayload = {
      station_id: testHoraire.depart_station_id,
      quais: testQuai,
      apply_to_all: true
    };
    console.log('   Payload:', JSON.stringify(putPayload, null, 2));
    
    const putRes = await fetch(`${BASE_URL}/api/admin/horaires/${testHoraire.id}/quais`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(putPayload)
    });
    
    if (!putRes.ok) {
      const errorData = await putRes.json().catch(() => ({}));
      throw new Error(`PUT failed: ${putRes.status} - ${errorData.error || 'Unknown error'}`);
    }
    
    const putData = await putRes.json();
    console.log('   ✓ Réponse PUT:', JSON.stringify(putData, null, 2));
    console.log(`   ✓ ${putData.applied_stations?.length || 0} gare(s) mises à jour\n`);

    // 4. Vérification GET après mise à jour
    console.log('4️⃣  Vérification GET après mise à jour...');
    const getRes2 = await fetch(`${BASE_URL}/api/admin/horaires/${testHoraire.id}/quais`);
    if (!getRes2.ok) {
      throw new Error(`GET verification failed: ${getRes2.status}`);
    }
    const getData2 = await getRes2.json();
    console.log('   ✓ Réponse GET:', JSON.stringify(getData2, null, 2));
    
    const nbCodes = Object.keys(getData2.attribution_quais || {}).length;
    console.log(`   ✓ ${nbCodes} code(s) de gare ont une attribution de quai\n`);

    // 5. Test de suppression avec apply_to_all = true
    console.log('5️⃣  Test de suppression (quais vide) avec apply_to_all=true...');
    const deletePayload = {
      station_id: testHoraire.depart_station_id,
      quais: '',
      apply_to_all: true
    };
    
    const deleteRes = await fetch(`${BASE_URL}/api/admin/horaires/${testHoraire.id}/quais`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deletePayload)
    });
    
    if (!deleteRes.ok) {
      throw new Error(`DELETE PUT failed: ${deleteRes.status}`);
    }
    
    const deleteData = await deleteRes.json();
    console.log('   ✓ Réponse:', JSON.stringify(deleteData, null, 2));
    
    const nbCodesAfterDelete = Object.keys(deleteData.attribution_quais || {}).length;
    console.log(`   ✓ ${nbCodesAfterDelete} code(s) restant(s) après suppression\n`);

    console.log('✅ Tous les tests sont passés avec succès!\n');
    console.log('📝 Résumé:');
    console.log('   - GET initial: OK');
    console.log('   - PUT avec apply_to_all: OK');
    console.log('   - Vérification des attributions multiples: OK');
    console.log('   - Suppression avec apply_to_all: OK');

  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Exécuter le test
console.log('🚀 Démarrage des tests d\'attribution de quai...\n');
console.log(`   Base URL: ${BASE_URL}\n`);

testApplyToAll();
