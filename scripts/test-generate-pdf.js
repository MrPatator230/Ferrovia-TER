import { generatePDF } from '../src/app/api/fiches-horaires/[id]/generate/route.js';
import fs from 'fs';

(async () => {
  try {
    const fiche = {
      id: 'test-1',
      nom: 'BOURG-EN-BRESSE > SEURRE > DIJON',
      service_date_debut: '2025-12-14',
      service_date_fin: '2026-12-12',
      type_fiche: 'Travaux'
    };

    const horaires = [
      { numero_train: '891800', depart_station_nom: 'LYON PART-DIEU', depart_time: '05:34', arrivee_station_nom: null, arrivee_time: null },
      { numero_train: '891802', depart_station_nom: 'BOURG-EN-BRESSE', depart_time: '06:34', arrivee_station_nom: null, arrivee_time: null },
      { numero_train: '891804', depart_station_nom: 'ST-AMOUR', depart_time: '07:30', arrivee_station_nom: null, arrivee_time: null },
    ];

    console.log('Lancement génération PDF de test...');
    const pdfPath = await generatePDF(fiche, horaires);
    console.log('PDF généré:', pdfPath);

    const fullPath = `public${pdfPath}`;
    if (fs.existsSync(fullPath)) {
      console.log('Fichier présent:', fullPath);
    } else {
      console.error('Fichier non trouvé:', fullPath);
    }
  } catch (err) {
    console.error('Erreur test generatePDF:', err);
    process.exit(1);
  }
})();

