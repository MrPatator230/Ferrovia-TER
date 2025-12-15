import { NextResponse } from 'next/server';
import pool from '@/lib/db_horaires';

// GET - Liste de toutes les fiches horaires
export async function GET() {
  try {
    // Récupérer les fiches sans JOIN (compatible Supabase client wrapper)
    const [fiches] = await pool.execute(`SELECT * FROM fiches_horaires ORDER BY created_at DESC`);

    // Si aucune fiche, retourner tableau vide
    if (!Array.isArray(fiches) || fiches.length === 0) {
      return NextResponse.json({ success: true, fiches: [] });
    }

    // Récupérer les services_annuels référencés (si présents)
    const saIds = Array.from(new Set(fiches.map(f => f.service_annuel_id).filter(Boolean)));
    let saMap = {};
    if (saIds.length > 0) {
      try {
        // Utiliser pool.execute pour faire un SELECT ... WHERE id IN (...)
        const placeholders = saIds.map(() => '?').join(',');
        const [saRows] = await pool.execute(`SELECT id, nom, date_debut, date_fin FROM services_annuels WHERE id IN (${placeholders})`, saIds);
        if (Array.isArray(saRows)) {
          saRows.forEach(s => { if (s && s.id != null) saMap[String(s.id)] = s; });
        }
      } catch (e) {
        console.warn('GET fiches_horaires: failed to load services_annuels fallback', e.message || e);
      }
    }

    // Merge des infos du service_annuel dans chaque fiche (nom, date_debut, date_fin)
    const merged = (fiches || []).map(f => {
      const copy = { ...f };
      const sa = f && f.service_annuel_id ? saMap[String(f.service_annuel_id)] : null;
      copy.service_annuel_nom = sa ? sa.nom || null : null;
      copy.service_date_debut = sa ? sa.date_debut || null : null;
      copy.service_date_fin = sa ? sa.date_fin || null : null;
      return copy;
    });

    return NextResponse.json({ success: true, fiches: merged });
  } catch (error) {
    console.error('Erreur GET fiches horaires:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la récupération des fiches horaires'
    }, { status: 500 });
  }
}

// POST - Créer une nouvelle fiche horaire
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      nom,
      service_annuel_id,
      type_fiche,
      design_region,
      ligne_id,
      afficher_page_recherche
    } = body;

    // Validation
    if (!nom || !service_annuel_id || !type_fiche || !design_region) {
      return NextResponse.json({
        success: false,
        message: 'Tous les champs obligatoires doivent être remplis'
      }, { status: 400 });
    }

    const [result] = await pool.execute(
      `INSERT INTO fiches_horaires 
       (nom, service_annuel_id, type_fiche, design_region, ligne_id, afficher_page_recherche, statut) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        nom,
        service_annuel_id,
        type_fiche,
        design_region,
        (ligne_id && ligne_id !== '') ? ligne_id : null,
        afficher_page_recherche ? true : false,
        'brouillon'
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Fiche horaire créée avec succès',
      id: result.insertId
    }, { status: 201 });
  } catch (error) {
    console.error('Erreur POST fiche horaire:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la création de la fiche horaire'
    }, { status: 500 });
  }
}
