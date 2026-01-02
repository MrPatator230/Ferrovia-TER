import { NextResponse } from 'next/server';
import * as stationsLib from '@/lib/stations';

// GET - lister toutes les stations
export async function GET() {
  try {
    const data = await stationsLib.listStations();
    return NextResponse.json(data);
  } catch (err) {
    console.error('GET /api/admin/stations error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: err.status || 500 });
  }
}

// POST - créer une nouvelle station (ou plusieurs en batch)
export async function POST(request) {
  try {
    let body;
    try { body = await request.json(); } catch (e) { const t = await request.text(); try { body = JSON.parse(t); } catch (e2) { body = {}; } }

    // Import en batch si un tableau de stations est fourni
    if (body.stations && Array.isArray(body.stations)) {
      const results = [];
      const errors = [];

      for (const station of body.stations) {
        try {
          const created = await stationsLib.createStation(station);
          results.push(created);
        } catch (err) {
          console.error('Error creating station:', station.nom, err);
          errors.push({ station: station.nom, error: err.message });
        }
      }

      return NextResponse.json({
        success: true,
        imported: results.length,
        total: body.stations.length,
        errors: errors.length > 0 ? errors : undefined
      }, { status: 201 });
    }

    // Création d'une seule station
    const created = await stationsLib.createStation(body);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/stations error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: err.status || 500 });
  }
}
