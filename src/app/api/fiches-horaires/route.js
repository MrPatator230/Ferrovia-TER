import { NextResponse } from 'next/server';
import pool from '@/lib/db_horaires';

// GET - Liste de toutes les fiches horaires
export async function GET() {
  try {
    const [fiches] = await pool.execute(`
      SELECT 
        fh.*,
        sa.nom as service_annuel_nom,
        sa.date_debut as service_date_debut,
        sa.date_fin as service_date_fin
      FROM fiches_horaires fh
      LEFT JOIN services_annuels sa ON fh.service_annuel_id = sa.id
      ORDER BY fh.created_at DESC
    `);

    return NextResponse.json({
      success: true,
      fiches
    });
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

