import { NextResponse } from 'next/server';
import pool from '@/lib/db_horaires';

/**
 * Fonction utilitaire pour parser le JSON de manière sécurisée
 */
function safeParseJSON(input, fallback) {
  if (input == null) return fallback;
  if (typeof input === 'object') return input;
  try {
    return JSON.parse(input);
  } catch (e) {
    return fallback;
  }
}

// Fonction utilitaire exportée pour tester le matching d'un stop
export function matchStopAgainstStation(s, stationId, stationCode) {
  if (s == null) return false;
  // primitive (id or code)
  if (typeof s === 'string' || typeof s === 'number') {
    if (String(s) === String(stationId)) return true;
    if (stationCode && String(s).toUpperCase() === stationCode) return true;
    return false;
  }

  // objet simple avec station_id ou id
  if (s.station_id != null && Number(s.station_id) === Number(stationId)) return true;
  if (s.id != null && Number(s.id) === Number(stationId)) return true;

  // nested station object
  if (s.station && typeof s.station === 'object') {
    if (s.station.id != null && Number(s.station.id) === Number(stationId)) return true;
    const nestedCode = s.station.code || s.station.station_code || s.station.stationCode || null;
    if (nestedCode && stationCode && String(nestedCode).toUpperCase() === stationCode) return true;
  }

  // station_code or code fields
  const scode = s.station_code || s.code || s.stationCode || null;
  if (scode && stationCode && String(scode).toUpperCase() === stationCode) return true;

  return false;
}

/**
 * PUT /api/admin/horaires/[id]/quais
 * Met à jour le quai pour une station donnée dans un horaire
 * Utilise la colonne attribution_quais (JSON: {"CODE_GARE": "quai_attribué"})
 * Body: { station_id: number, quais: string } // quai au format "3A" (un seul quai)
 */
export async function PUT(request, { params }) {
  let horaireId = null;

  try {
    // Await params pour Next.js 15+
    const resolvedParams = await params;
    horaireId = resolvedParams?.id ? parseInt(resolvedParams.id, 10) : null;

    if (!horaireId || Number.isNaN(horaireId)) {
      return NextResponse.json({ error: 'ID horaire invalide' }, { status: 400 });
    }

    // Parser le body de la requête
    const body = await request.json().catch(() => ({}));
    const stationId = body?.station_id ? parseInt(body.station_id, 10) : null;
    const quaisValue = body?.quais != null ? String(body.quais) : '';

    if (!stationId || Number.isNaN(stationId)) {
      return NextResponse.json({ error: 'station_id invalide ou manquant' }, { status: 400 });
    }

    console.log('[PUT quais] Requête reçue:', { horaireId, stationId, quaisValue });

    // 1. Récupérer les informations de la station pour obtenir son code
    const { data: station, error: stationError } = await pool.client
      .from('stations')
      .select('id, code, nom, quais')
      .eq('id', stationId)
      .single();

    if (stationError || !station) {
      console.error('[PUT quais] Erreur récupération station:', stationError);
      return NextResponse.json({ error: 'Station non trouvée' }, { status: 404 });
    }

    if (!station.code) {
      console.error('[PUT quais] Code de station manquant pour:', station);
      return NextResponse.json({
        error: 'Code de station manquant',
        details: `La station ${station.nom} (ID: ${stationId}) n'a pas de code défini dans la base de données`
      }, { status: 400 });
    }

    const stationCode = station.code.toUpperCase(); // Normaliser en majuscules
    console.log('[PUT quais] Station trouvée:', { code: stationCode, nom: station.nom });

    // 2. Récupérer l'horaire actuel
    const { data: horaire, error: fetchError } = await pool.client
      .from('horaires')
      .select('*')
      .eq('id', horaireId)
      .single();

    if (fetchError || !horaire) {
      console.error('[PUT quais] Erreur récupération horaire:', fetchError);
      return NextResponse.json({ error: 'Horaire non trouvé' }, { status: 404 });
    }

    console.log('[PUT quais] Horaire trouvé:', { id: horaire.id, numero_train: horaire.numero_train });

    // 3. Vérifier que la station fait partie de cet horaire
    const stops = safeParseJSON(horaire.stops, []);
    const isTerminusDepart = horaire.depart_station_id === stationId;
    const isTerminusArrivee = horaire.arrivee_station_id === stationId;
    // helper: matcher une station dans un stop quel que soit le format
    const matchesStop = (s) => {
      if (s == null) return false;
      // primitive (id or code)
      if (typeof s === 'string' || typeof s === 'number') {
        if (String(s) === String(stationId)) return true;
        if (stationCode && String(s).toUpperCase() === stationCode) return true;
        return false;
      }

      // objet simple avec station_id ou id
      if (s.station_id != null && Number(s.station_id) === Number(stationId)) return true;
      if (s.id != null && Number(s.id) === Number(stationId)) return true;

      // nested station object
      if (s.station && typeof s.station === 'object') {
        if (s.station.id != null && Number(s.station.id) === Number(stationId)) return true;
        const nestedCode = s.station.code || s.station.station_code || s.station.stationCode || null;
        if (nestedCode && stationCode && String(nestedCode).toUpperCase() === stationCode) return true;
      }

      // station_code or code fields
      const scode = s.station_code || s.code || s.stationCode || null;
      if (scode && stationCode && String(scode).toUpperCase() === stationCode) return true;

      return false;
    };

    const isInStops = Array.isArray(stops) && stops.some(matchesStop);

    if (!isTerminusDepart && !isTerminusArrivee && !isInStops) {
      console.warn('[PUT quais] Station non trouvée dans le trajet:', { stationCode, horaireId });
      return NextResponse.json({
        error: 'Station non trouvée dans cet horaire',
        details: `La station ${stationCode} (${station.nom}) ne fait pas partie du trajet de l'horaire ${horaireId}`
      }, { status: 404 });
    }

    // 4. Récupérer l'attribution actuelle des quais
    let attributionQuais = safeParseJSON(horaire.attribution_quais, {});

    // S'assurer que c'est bien un objet
    if (typeof attributionQuais !== 'object' || Array.isArray(attributionQuais)) {
      console.warn('[PUT quais] attribution_quais n\'est pas un objet, réinitialisation');
      attributionQuais = {};
    }

    console.log('[PUT quais] Attribution actuelle:', attributionQuais);

    // 5. Mettre à jour le quai pour cette station
    // Format: {"CODE_GARE": "quai_attribué"}
    if (!quaisValue || quaisValue.trim() === '') {
      // Supprimer l'entrée si aucun quai n'est sélectionné
      delete attributionQuais[stationCode];
      console.log('[PUT quais] Quai supprimé pour:', stationCode);
    } else {
      // Nettoyer et assigner le quai (un seul quai)
      const cleanedQuai = quaisValue.trim();
      attributionQuais[stationCode] = cleanedQuai;
      console.log('[PUT quais] Quai attribué:', { [stationCode]: cleanedQuai });
    }

    console.log('[PUT quais] Nouvelle attribution:', attributionQuais);

    // 6. Enregistrer dans Supabase
    const { data: updated, error: updateError } = await pool.client
      .from('horaires')
      .update({
        attribution_quais: attributionQuais
      })
      .eq('id', horaireId)
      .select('id, numero_train, attribution_quais')
      .single();

    if (updateError) {
      console.error('[PUT quais] Erreur lors de la mise à jour Supabase:', updateError);
      return NextResponse.json({
        error: 'Erreur lors de la mise à jour dans la base de données',
        details: updateError.message
      }, { status: 500 });
    }

    console.log('[PUT quais] ✅ Mise à jour réussie dans Supabase:', {
      horaire_id: updated.id,
      attribution_quais: updated.attribution_quais
    });

    // 7. Retourner la réponse avec les données mises à jour
    return NextResponse.json({
      success: true,
      horaire_id: horaireId,
      numero_train: updated.numero_train,
      station_id: stationId,
      station_code: stationCode,
      quai: attributionQuais[stationCode] || '',
      attribution_quais: updated.attribution_quais,
      message: `Quai ${quaisValue ? 'attribué' : 'supprimé'} avec succès`
    });

  } catch (e) {
    console.error('[PUT /api/admin/horaires/:id/quais] Erreur inattendue:', e);
    return NextResponse.json({
      error: 'Erreur serveur inattendue',
      details: e.message,
      stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
    }, { status: 500 });
  }
}


/**
 * GET /api/admin/horaires/[id]/quais
 * Récupère l'attribution des quais pour un horaire
 * Retourne: { horaire_id, numero_train, attribution_quais: {"CODE_GARE": "quai"} }
 */
export async function GET(request, { params }) {
  try {
    // Await params pour Next.js 15+
    const resolvedParams = await params;
    const horaireId = resolvedParams?.id ? parseInt(resolvedParams.id, 10) : null;

    if (!horaireId || Number.isNaN(horaireId)) {
      return NextResponse.json({ error: 'ID horaire invalide' }, { status: 400 });
    }

    console.log('[GET quais] Requête pour horaire:', horaireId);

    // Récupérer l'horaire depuis Supabase
    const { data: horaire, error: fetchError } = await pool.client
      .from('horaires')
      .select('id, numero_train, attribution_quais')
      .eq('id', horaireId)
      .single();

    if (fetchError || !horaire) {
      console.error('[GET quais] Erreur récupération horaire:', fetchError);
      return NextResponse.json({ error: 'Horaire non trouvé' }, { status: 404 });
    }

    // Parser l'attribution des quais
    const attributionQuais = safeParseJSON(horaire.attribution_quais, {});

    console.log('[GET quais] Attribution récupérée:', attributionQuais);

    return NextResponse.json({
      horaire_id: horaireId,
      numero_train: horaire.numero_train,
      attribution_quais: attributionQuais
    });

  } catch (e) {
    console.error('[GET /api/admin/horaires/:id/quais] Erreur inattendue:', e);
    return NextResponse.json({
      error: 'Erreur serveur inattendue',
      details: e.message
    }, { status: 500 });
  }
}
