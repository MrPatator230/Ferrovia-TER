import db from '../../../../lib/db';

function serializeRow(row) {
  if (!row) return row;

  // Fonction helper pour traiter une date de manière robuste
  const processDate = (dateValue) => {
    if (dateValue === null || dateValue === undefined || dateValue === '') {
      return null;
    }

    // Si c'est déjà une chaîne YYYY-MM-DD, la retourner telle quelle
    if (typeof dateValue === 'string') {
      // Nettoyer la chaîne et vérifier le format
      const cleaned = dateValue.trim();
      if (cleaned.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return cleaned;
      }
      // Si c'est une chaîne avec timestamp, extraire juste la date
      if (cleaned.includes('T') || cleaned.includes(' ')) {
        return cleaned.split('T')[0].split(' ')[0];
      }
      return cleaned || null;
    }

    // Si c'est un objet Date
    if (dateValue instanceof Date) {
      return dateValue.toISOString().slice(0, 10);
    }

    // Tenter de convertir en string et nettoyer
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

  const dDebut = processDate(row.date_debut);
  const dFin = processDate(row.date_fin);

      return {
    ...row,
    // snake_case as in DB
    date_debut: dDebut,
    date_fin: dFin,
    // camelCase convenience fields for front-end
    dateDebut: dDebut,
    dateFin: dFin,
    // display helpers (string or null)
    displayDateDebut: dDebut,
    displayDateFin: dFin
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { titre, description, type, dateDebut, dateFin } = body;

    if (!titre) {
      return new Response(JSON.stringify({ error: 'titre requis', received: body }), { status: 400 });
    }
    if (!description) {
      // autoriser mais avertir
      console.warn('Création info_trafic sans description reçue:', body);
    }

    const [result] = await db.execute(
      `INSERT INTO info_trafic (titre, description, type, date_debut, date_fin) VALUES (?, ?, ?, ?, ?)`,
      [titre, description || '', type || 'information', dateDebut || null, dateFin || null]
    );

    const insertedId = result.insertId;
    const [rows] = await db.execute('SELECT * FROM info_trafic WHERE id = ?', [insertedId]);
    const created = rows[0];
    return new Response(JSON.stringify(serializeRow(created)), { status: 201 });
  } catch (err) {
    console.error('API /api/admin/infos-trafic POST error', err);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}

export async function GET(request) {
  try {
    const [rows] = await db.execute('SELECT * FROM info_trafic ORDER BY id DESC LIMIT 100');
    const serializedRows = rows.map(serializeRow);
    return new Response(JSON.stringify(serializedRows), { status: 200 });
  } catch (err) {
    console.error('API /api/admin/infos-trafic GET error', err);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, titre, description, type, dateDebut, dateFin } = body;
    if (!id) return new Response(JSON.stringify({ error: 'id requis' }), { status: 400 });
    if (!titre) return new Response(JSON.stringify({ error: 'titre requis' }), { status: 400 });

    await db.execute(
      `UPDATE info_trafic SET titre = ?, description = ?, type = ?, date_debut = ?, date_fin = ? WHERE id = ?`,
      [titre, description || '', type || 'information', dateDebut || null, dateFin || null, id]
    );
    const [rows] = await db.execute('SELECT * FROM info_trafic WHERE id = ?', [id]);
    return new Response(JSON.stringify(serializeRow(rows[0] || {})), { status: 200 });
  } catch (err) {
    console.error('API /api/admin/infos-trafic PUT error', err);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return new Response(JSON.stringify({ error: 'id requis' }), { status: 400 });
    await db.execute('DELETE FROM info_trafic WHERE id = ?', [id]);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error('API /api/admin/infos-trafic DELETE error', err);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}