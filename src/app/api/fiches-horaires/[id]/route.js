import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: 'horaires',
  charset: 'utf8mb4'
};

async function getConnection() {
  return await mysql.createConnection(dbConfig);
}

// GET - Récupérer une fiche horaire spécifique
export async function GET(request, { params }) {
  let connection;
  try {
    const { id } = await params;
    connection = await getConnection();

    const [fiches] = await connection.execute(
      `SELECT 
        fh.*,
        sa.nom as service_annuel_nom,
        sa.date_debut as service_date_debut,
        sa.date_fin as service_date_fin
       FROM fiches_horaires fh
       LEFT JOIN services_annuels sa ON fh.service_annuel_id = sa.id
       WHERE fh.id = ?`,
      [id]
    );

    if (fiches.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Fiche horaire non trouvée'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      fiche: fiches[0]
    });
  } catch (error) {
    console.error('Erreur GET fiche horaire:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la récupération de la fiche horaire'
    }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}

// PUT - Modifier une fiche horaire
export async function PUT(request, { params }) {
  let connection;
  try {
    const { id } = await params;
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

    connection = await getConnection();

    const [result] = await connection.execute(
      `UPDATE fiches_horaires 
       SET nom = ?, 
           service_annuel_id = ?, 
           type_fiche = ?, 
           design_region = ?, 
           ligne_id = ?, 
           afficher_page_recherche = ?
       WHERE id = ?`,
      [
        nom,
        service_annuel_id,
        type_fiche,
        design_region,
        (ligne_id && ligne_id !== '') ? ligne_id : null,
        afficher_page_recherche ? 1 : 0,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({
        success: false,
        message: 'Fiche horaire non trouvée'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Fiche horaire modifiée avec succès'
    });
  } catch (error) {
    console.error('Erreur PUT fiche horaire:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la modification de la fiche horaire'
    }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}

// DELETE - Supprimer une fiche horaire
export async function DELETE(request, { params }) {
  let connection;
  try {
    const { id } = await params;
    connection = await getConnection();

    // Récupérer le chemin du PDF pour le supprimer
    const [fiches] = await connection.execute(
      'SELECT pdf_path FROM fiches_horaires WHERE id = ?',
      [id]
    );

    const [result] = await connection.execute(
      'DELETE FROM fiches_horaires WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({
        success: false,
        message: 'Fiche horaire non trouvée'
      }, { status: 404 });
    }

    // TODO: Supprimer le fichier PDF du système de fichiers si nécessaire
    // const fs = require('fs').promises;
    // if (fiches[0]?.pdf_path) {
    //   await fs.unlink(path.join(process.cwd(), 'public', fiches[0].pdf_path));
    // }

    return NextResponse.json({
      success: true,
      message: 'Fiche horaire supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur DELETE fiche horaire:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la suppression de la fiche horaire'
    }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}

