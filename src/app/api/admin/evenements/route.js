import db from '../../../../lib/db';
import { NextResponse } from 'next/server';

function serializeRow(row) {
  if (!row) return row;

  return {
    ...row,
    date_creation: row.date_creation,
    date_modification: row.date_modification
  };
}

// GET - Récupérer tous les événements
export async function GET() {
  try {
    console.log('[API Evenements] Fetching evenements...');

    const [rows] = await db.execute(`
      SELECT e.*, u.nom, u.prenom 
      FROM evenements e 
      LEFT JOIN users u ON e.auteur_id = u.id 
      ORDER BY e.date_creation DESC
    `);

    console.log('[API Evenements] Raw rows from DB:', rows.length);

    const serializedRows = rows.map(serializeRow);
    console.log('[API Evenements] Serialized rows:', serializedRows.length);

    return NextResponse.json(serializedRows);
  } catch (error) {
    console.error('[API Evenements] Error fetching evenements:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des événements' },
      { status: 500 }
    );
  }
}

// POST - Créer un nouvel événement
export async function POST(request) {
  try {
    const body = await request.json();
    console.log('[API Evenements] POST body:', body);

    const { nomEvenement, description, nomBandeau, pageDediee } = body;

    // Validation
    if (!nomEvenement || !description) {
      return NextResponse.json(
        { error: 'Les champs nom de l\'événement et description sont requis' },
        { status: 400 }
      );
    }

    const [result] = await db.execute(
      `INSERT INTO evenements (nom_evenement, description, nom_bandeau, page_dediee)
       VALUES (?, ?, ?, ?)`,
      [nomEvenement, description, nomBandeau || null, pageDediee || null]
    );

    console.log('[API Evenements] Insert result:', result);

    // Récupérer l'événement créé
    const [createdRows] = await db.execute(
      'SELECT * FROM evenements WHERE id = ?',
      [result.insertId]
    );

    if (createdRows.length === 0) {
      return NextResponse.json(
        { error: 'Erreur lors de la création de l\'événement' },
        { status: 500 }
      );
    }

    const serializedResult = serializeRow(createdRows[0]);
    console.log('[API Evenements] Created evenement:', serializedResult);

    return NextResponse.json(serializedResult);
  } catch (error) {
    console.error('[API Evenements] Error creating evenement:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'événement' },
      { status: 500 }
    );
  }
}

// PUT - Modifier un événement
export async function PUT(request) {
  try {
    const body = await request.json();
    console.log('[API Evenements] PUT body:', body);

    const { id, nomEvenement, description, nomBandeau, pageDediee } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'L\'ID de l\'événement est requis' },
        { status: 400 }
      );
    }

    // Validation
    if (!nomEvenement || !description) {
      return NextResponse.json(
        { error: 'Les champs nom de l\'événement et description sont requis' },
        { status: 400 }
      );
    }

    const [result] = await db.execute(
      `UPDATE evenements 
       SET nom_evenement = ?, description = ?, nom_bandeau = ?, page_dediee = ?
       WHERE id = ?`,
      [nomEvenement, description, nomBandeau || null, pageDediee || null, id]
    );

    console.log('[API Evenements] Update result:', result);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      );
    }

    // Récupérer l'événement modifié
    const [updatedRows] = await db.execute(
      'SELECT * FROM evenements WHERE id = ?',
      [id]
    );

    const serializedResult = serializeRow(updatedRows[0]);
    console.log('[API Evenements] Updated evenement:', serializedResult);

    return NextResponse.json(serializedResult);
  } catch (error) {
    console.error('[API Evenements] Error updating evenement:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la modification de l\'événement' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un événement
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'L\'ID de l\'événement est requis' },
        { status: 400 }
      );
    }

    console.log('[API Evenements] Deleting evenement with ID:', id);

    const [result] = await db.execute(
      'DELETE FROM evenements WHERE id = ?',
      [id]
    );

    console.log('[API Evenements] Delete result:', result);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Evenements] Error deleting evenement:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'événement' },
      { status: 500 }
    );
  }
}
