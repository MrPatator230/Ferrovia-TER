import { NextResponse } from 'next/server';
// Importer la base de données horaires
import dbHoraires from '../../../../lib/db_horaires';

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
      // Construire YYYY-MM-DD en utilisant la date locale pour éviter les décalages timezone
      const y = dateValue.getFullYear();
      const m = String(dateValue.getMonth() + 1).padStart(2, '0');
      const d = String(dateValue.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
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

  return {
    ...row,
    date_debut: processDate(row.date_debut),
    date_fin: processDate(row.date_fin),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

// GET - Récupérer tous les services annuels
export async function GET() {
  try {
    console.log('[API Services Annuels] Fetching services annuels...');

    const [rows] = await dbHoraires.execute(`
      SELECT * FROM services_annuels 
      ORDER BY date_debut DESC
    `);

    console.log('[API Services Annuels] Raw rows from DB:', rows.length);

    const serializedRows = rows.map(serializeRow);
    console.log('[API Services Annuels] Serialized rows:', serializedRows.length);

    return NextResponse.json(serializedRows);
  } catch (error) {
    console.error('[API Services Annuels] Error fetching services annuels:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des services annuels' },
      { status: 500 }
    );
  }
}

// POST - Créer un nouveau service annuel
export async function POST(request) {
  try {
    const body = await request.json();
    console.log('[API Services Annuels] POST body:', body);

    const { nomSA, dateDebut, dateFin } = body;

    // Validation
    if (!nomSA || !dateDebut || !dateFin) {
      return NextResponse.json(
        { error: 'Les champs nom du SA, date de début et date de fin sont requis' },
        { status: 400 }
      );
    }

    // Validation des dates
    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);

    if (debut >= fin) {
      return NextResponse.json(
        { error: 'La date de début doit être antérieure à la date de fin' },
        { status: 400 }
      );
    }

    const [result] = await dbHoraires.execute(
      `INSERT INTO services_annuels (nom, date_debut, date_fin)
       VALUES (?, ?, ?)`,
      [nomSA, dateDebut, dateFin]
    );

    console.log('[API Services Annuels] Insert result:', result);

    // Récupérer le service annuel créé
    const [createdRows] = await dbHoraires.execute(
      'SELECT * FROM services_annuels WHERE id = ?',
      [result.insertId]
    );

    if (createdRows.length === 0) {
      return NextResponse.json(
        { error: 'Erreur lors de la création du service annuel' },
        { status: 500 }
      );
    }

    const serializedResult = serializeRow(createdRows[0]);
    console.log('[API Services Annuels] Created service annuel:', serializedResult);

    return NextResponse.json(serializedResult);
  } catch (error) {
    console.error('[API Services Annuels] Error creating service annuel:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du service annuel' },
      { status: 500 }
    );
  }
}

// PUT - Modifier un service annuel
export async function PUT(request) {
  try {
    const body = await request.json();
    console.log('[API Services Annuels] PUT body:', body);

    const { id, nomSA, dateDebut, dateFin } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'L\'ID du service annuel est requis' },
        { status: 400 }
      );
    }

    // Validation
    if (!nomSA || !dateDebut || !dateFin) {
      return NextResponse.json(
        { error: 'Les champs nom du SA, date de début et date de fin sont requis' },
        { status: 400 }
      );
    }

    // Validation des dates
    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);

    if (debut >= fin) {
      return NextResponse.json(
        { error: 'La date de début doit être antérieure à la date de fin' },
        { status: 400 }
      );
    }

    const [result] = await dbHoraires.execute(
      `UPDATE services_annuels 
       SET nom = ?, date_debut = ?, date_fin = ?
       WHERE id = ?`,
      [nomSA, dateDebut, dateFin, id]
    );

    console.log('[API Services Annuels] Update result:', result);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Service annuel non trouvé' },
        { status: 404 }
      );
    }

    // Récupérer le service annuel modifié
    const [updatedRows] = await dbHoraires.execute(
      'SELECT * FROM services_annuels WHERE id = ?',
      [id]
    );

    const serializedResult = serializeRow(updatedRows[0]);
    console.log('[API Services Annuels] Updated service annuel:', serializedResult);

    return NextResponse.json(serializedResult);
  } catch (error) {
    console.error('[API Services Annuels] Error updating service annuel:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la modification du service annuel' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un service annuel
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const force = (searchParams.get('force') || '').toString().toLowerCase() === '1' || (searchParams.get('force') || '').toString().toLowerCase() === 'true';

    if (!id) {
      return NextResponse.json(
        { error: 'L\'ID du service annuel est requis' },
        { status: 400 }
      );
    }

    console.log('[API Services Annuels] Deleting service annuel with ID:', id, 'force=', force);

    // Vérifier s'il y a des horaires associés
    const [horaireRows] = await dbHoraires.execute(
      'SELECT COUNT(*) as count FROM horaires WHERE service_annuel_id = ?',
      [id]
    );

    const linkedCount = (horaireRows && horaireRows[0] && horaireRows[0].count) ? Number(horaireRows[0].count) : 0;

    if (linkedCount > 0 && !force) {
      // Renvoyer le nombre d'horaires liés pour que le front propose une suppression forcée
      return NextResponse.json(
        { error: 'Impossible de supprimer ce service annuel car il est utilisé par des horaires', count: linkedCount },
        { status: 400 }
      );
    }

    if (linkedCount > 0 && force) {
      // Dissocier les horaires liés en mettant service_annuel_id = NULL
      await dbHoraires.execute(
        'UPDATE horaires SET service_annuel_id = NULL WHERE service_annuel_id = ?',
        [id]
      );
      console.log('[API Services Annuels] Dissociated linked horaires for service_annuel_id=', id);
    }

    const [result] = await dbHoraires.execute(
      'DELETE FROM services_annuels WHERE id = ?',
      [id]
    );

    console.log('[API Services Annuels] Delete result:', result);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Service annuel non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Services Annuels] Error deleting service annuel:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du service annuel' },
      { status: 500 }
    );
  }
}
