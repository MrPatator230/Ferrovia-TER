import { NextResponse } from 'next/server';
import * as stationsLib from '@/lib/stations';

/**
 * POST - Vérifie si des gares existent déjà dans la BDD
 * Body: { stations: [{ nom, code }] }
 * Retourne: { duplicates: [{ nom, code, exists: boolean, id }] }
 */
export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      const t = await request.text();
      try {
        body = JSON.parse(t);
      } catch (e2) {
        body = {};
      }
    }

    if (!body.stations || !Array.isArray(body.stations)) {
      return NextResponse.json({ error: 'stations array required' }, { status: 400 });
    }

    // Récupérer toutes les gares existantes
    const existingStations = await stationsLib.listStations();

    // Vérifier chaque gare
    const results = body.stations.map(station => {
      // Vérifier par nom (insensible à la casse)
      const nameMatch = existingStations.find(
        s => s.nom.toLowerCase().trim() === station.nom.toLowerCase().trim()
      );

      // Vérifier par code si présent
      const codeMatch = station.code ? existingStations.find(
        s => s.code && s.code.toLowerCase() === station.code.toLowerCase()
      ) : null;

      const exists = nameMatch || codeMatch;

      return {
        nom: station.nom,
        code: station.code,
        exists: !!exists,
        existingId: exists ? exists.id : null,
        matchType: nameMatch ? 'nom' : (codeMatch ? 'code' : null)
      };
    });

    return NextResponse.json({ results });
  } catch (err) {
    console.error('POST /api/admin/stations/check-duplicates error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}

