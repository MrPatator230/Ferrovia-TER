import { NextResponse } from 'next/server';
import pool from '@/lib/db_horaires';

function safeParseJSON(input, fallback) {
  if (input == null) return fallback;
  if (typeof input === 'object') return input;
  try { return JSON.parse(input); } catch (e) { return fallback; }
}

// GET /api/admin/horaires/[id]/quais - Récupérer les attributions de quais pour un horaire
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const horaireId = parseInt(id, 10);
    
    if (isNaN(horaireId) || horaireId <= 0) {
      return NextResponse.json({ error: 'ID horaire invalide' }, { status: 400 });
    }

    // Récupérer l'horaire
    const { data: horaire, error } = await pool.client
      .from('horaires')
      .select('attribution_quais')
      .eq('id', horaireId)
      .single();

    if (error || !horaire) {
      return NextResponse.json({ error: 'Horaire non trouvé' }, { status: 404 });
    }

    const attributionQuais = safeParseJSON(horaire.attribution_quais, {});
    
    return NextResponse.json({
      success: true,
      attribution_quais: attributionQuais
    });
  } catch (err) {
    console.error('GET /api/admin/horaires/[id]/quais error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/admin/horaires/[id]/quais - Mettre à jour les attributions de quais
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const horaireId = parseInt(id, 10);
    
    if (isNaN(horaireId) || horaireId <= 0) {
      return NextResponse.json({ error: 'ID horaire invalide' }, { status: 400 });
    }

    const body = await request.json();
    const { station_id, quais, apply_to_all } = body;

    // Récupérer l'horaire complet
    const { data: horaire, error: fetchError } = await pool.client
      .from('horaires')
      .select('*')
      .eq('id', horaireId)
      .single();

    if (fetchError || !horaire) {
      return NextResponse.json({ error: 'Horaire non trouvé' }, { status: 404 });
    }

    let attributionQuais = safeParseJSON(horaire.attribution_quais, {});
    let appliedStations = [];

    if (apply_to_all) {
      // Appliquer à toutes les gares du trajet (départ, arrivée et stops)
      const stationIds = new Set();
      
      // Ajouter la gare de départ et d'arrivée
      if (horaire.depart_station_id) stationIds.add(horaire.depart_station_id);
      if (horaire.arrivee_station_id) stationIds.add(horaire.arrivee_station_id);
      
      // Ajouter les gares intermédiaires (stops)
      const stops = safeParseJSON(horaire.stops, []);
      if (Array.isArray(stops)) {
        stops.forEach(stop => {
          if (stop && stop.station_id) {
            stationIds.add(stop.station_id);
          }
        });
      }

      // Récupérer les codes de toutes les stations
      const stationIdsArray = Array.from(stationIds);
      if (stationIdsArray.length === 0) {
        return NextResponse.json({ error: 'Aucune gare trouvée dans le trajet' }, { status: 400 });
      }

      const { data: stations, error: stationsError } = await pool.client
        .from('stations')
        .select('id, code')
        .in('id', stationIdsArray);

      if (stationsError) {
        console.error('Error fetching stations:', stationsError);
        return NextResponse.json({ error: 'Erreur lors de la récupération des codes de gares' }, { status: 500 });
      }

      // Créer un mapping id -> code
      const idToCode = {};
      if (Array.isArray(stations)) {
        stations.forEach(s => {
          if (s && s.id && s.code) {
            idToCode[s.id] = s.code;
          }
        });
      }

      // Appliquer ou supprimer le quai pour chaque code de station
      stationIdsArray.forEach(stationId => {
        const code = idToCode[stationId];
        if (code) {
          appliedStations.push({ station_id: stationId, code });
          
          if (quais && quais.trim() !== '') {
            // Appliquer le quai
            attributionQuais[code] = quais.trim();
          } else {
            // Supprimer le quai si vide
            delete attributionQuais[code];
          }
        }
      });
    } else {
      // Appliquer seulement à la station spécifiée
      if (!station_id) {
        return NextResponse.json({ error: 'station_id requis' }, { status: 400 });
      }

      // Récupérer le code de la station
      const { data: station, error: stationError } = await pool.client
        .from('stations')
        .select('code')
        .eq('id', station_id)
        .single();

      if (stationError || !station || !station.code) {
        return NextResponse.json({ error: 'Station non trouvée' }, { status: 404 });
      }

      const stationCode = station.code;
      appliedStations.push({ station_id, code: stationCode });

      if (quais && quais.trim() !== '') {
        // Appliquer le quai
        attributionQuais[stationCode] = quais.trim();
      } else {
        // Supprimer le quai si vide
        delete attributionQuais[stationCode];
      }
    }

    // Mettre à jour l'horaire avec les nouvelles attributions
    const { error: updateError } = await pool.client
      .from('horaires')
      .update({ attribution_quais: attributionQuais })
      .eq('id', horaireId);

    if (updateError) {
      console.error('Error updating horaire:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      applied_stations: appliedStations,
      attribution_quais: attributionQuais
    });
  } catch (err) {
    console.error('PUT /api/admin/horaires/[id]/quais error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
