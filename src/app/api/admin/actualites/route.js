import db from '../../../../lib/db';
import { NextResponse } from 'next/server';

function serializeRow(row) {
  if (!row) return row;

  // Fonction helper pour traiter une date
  const processDate = (dateValue) => {
    if (dateValue === null || dateValue === undefined || dateValue === '') {
      return null;
    }

    // Si c'est déjà une chaîne YYYY-MM-DD, la retourner telle quelle
    if (typeof dateValue === 'string') {
      const cleaned = dateValue.trim();
      if (cleaned.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return cleaned;
      }
      if (cleaned.includes('T') || cleaned.includes(' ')) {
        return cleaned.split('T')[0].split(' ')[0];
      }
      return cleaned || null;
    }

    // Si c'est un objet Date
    if (dateValue instanceof Date) {
      return dateValue.toISOString().slice(0, 10);
    }

    try {
      const str = String(dateValue);
      if (str && str !== 'null' && str !== 'undefined') {
        return str.slice(0, 10);
      }
    } catch (e) {
      console.warn('Erreur lors du traitement de la date:', dateValue, e);
    }

    return null;
  };

  // Parser les pièces jointes JSON
  let piecesJointes = [];
  if (row.pieces_jointes) {
    try {
      if (typeof row.pieces_jointes === 'string') {
        piecesJointes = JSON.parse(row.pieces_jointes);
      } else {
        piecesJointes = row.pieces_jointes;
      }
    } catch (e) {
      console.warn('Erreur lors du parsing des pièces jointes:', e);
      piecesJointes = [];
    }
  }

  return {
    ...row,
    date_publication: processDate(row.date_publication),
    date_creation: row.date_creation,
    date_modification: row.date_modification,
    pieces_jointes: piecesJointes
  };
}

// GET - Récupérer toutes les actualités
export async function GET() {
  try {
    console.log('[API Actualites] Fetching actualites...');

    const [rows] = await db.execute(`
      SELECT a.*, u.nom, u.prenom 
      FROM actualites a 
      LEFT JOIN users u ON a.auteur_id = u.id 
      ORDER BY a.date_publication DESC
    `);

    console.log('[API Actualites] Raw rows from DB:', rows.length);

    const serializedRows = rows.map(serializeRow);
    console.log('[API Actualites] Serialized rows:', serializedRows.length);

    return NextResponse.json(serializedRows);
  } catch (error) {
    console.error('[API Actualites] Error fetching actualites:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des actualités' },
      { status: 500 }
    );
  }
}

// POST - Créer une nouvelle actualité
export async function POST(request) {
  try {
    const body = await request.json();
    console.log('[API Actualites] POST body:', body);

    const { titre, description, resume, imageCouverture, piecesJointes, datePublication } = body;

    // Validation
    if (!titre || !description || !datePublication) {
      return NextResponse.json(
        { error: 'Les champs titre, description et datePublication sont requis' },
        { status: 400 }
      );
    }

    // Convertir les pièces jointes en JSON
    const piecesJointesJson = piecesJointes ? JSON.stringify(piecesJointes) : null;

    const [result] = await db.execute(
      `INSERT INTO actualites (titre, description, resume, image_couverture, pieces_jointes, date_publication)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [titre, description, resume || null, imageCouverture || null, piecesJointesJson, datePublication]
    );

    console.log('[API Actualites] Insert result:', result);

    // Récupérer l'actualité créée
    const [createdRows] = await db.execute(
      'SELECT * FROM actualites WHERE id = ?',
      [result.insertId]
    );

    if (createdRows.length === 0) {
      return NextResponse.json(
        { error: 'Erreur lors de la création de l\'actualité' },
        { status: 500 }
      );
    }

    const serializedResult = serializeRow(createdRows[0]);
    console.log('[API Actualites] Created actualite:', serializedResult);

    return NextResponse.json(serializedResult);
  } catch (error) {
    console.error('[API Actualites] Error creating actualite:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'actualité' },
      { status: 500 }
    );
  }
}

// PUT - Modifier une actualité
export async function PUT(request) {
  try {
    const body = await request.json();
    console.log('[API Actualites] PUT body:', body);

    const { id, titre, description, resume, imageCouverture, piecesJointes, datePublication } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'L\'ID de l\'actualité est requis' },
        { status: 400 }
      );
    }

    // Validation
    if (!titre || !description || !datePublication) {
      return NextResponse.json(
        { error: 'Les champs titre, description et datePublication sont requis' },
        { status: 400 }
      );
    }

    // Convertir les pièces jointes en JSON
    const piecesJointesJson = piecesJointes ? JSON.stringify(piecesJointes) : null;

    const [result] = await db.execute(
      `UPDATE actualites 
       SET titre = ?, description = ?, resume = ?, image_couverture = ?, pieces_jointes = ?, date_publication = ?
       WHERE id = ?`,
      [titre, description, resume || null, imageCouverture || null, piecesJointesJson, datePublication, id]
    );

    console.log('[API Actualites] Update result:', result);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Actualité non trouvée' },
        { status: 404 }
      );
    }

    // Récupérer l'actualité modifiée
    const [updatedRows] = await db.execute(
      'SELECT * FROM actualites WHERE id = ?',
      [id]
    );

    const serializedResult = serializeRow(updatedRows[0]);
    console.log('[API Actualites] Updated actualite:', serializedResult);

    return NextResponse.json(serializedResult);
  } catch (error) {
    console.error('[API Actualites] Error updating actualite:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la modification de l\'actualité' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer une actualité
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'L\'ID de l\'actualité est requis' },
        { status: 400 }
      );
    }

    console.log('[API Actualites] Deleting actualite with ID:', id);

    const [result] = await db.execute(
      'DELETE FROM actualites WHERE id = ?',
      [id]
    );

    console.log('[API Actualites] Delete result:', result);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Actualité non trouvée' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Actualites] Error deleting actualite:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'actualité' },
      { status: 500 }
    );
  }
}
