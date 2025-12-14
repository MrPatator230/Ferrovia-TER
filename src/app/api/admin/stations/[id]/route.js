// filepath: c:\Users\MrPatator\Documents\Développement\Ferrovia-TER\src\app\api\admin\stations\[id]\route.js
import { NextResponse } from 'next/server';
import pool from '@/lib/db_horaires';

async function unwrapParams(params) {
  if (!params) return {};
  // Si params est une Promise (Next.js peut fournir un objet thenable), await it
  if (typeof params === 'object' && typeof params.then === 'function') {
    try {
      return await params;
    } catch (e) {
      return {};
    }
  }
  return params;
}

function safeParseJsonOrCsv(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return [];

  const s = value.trim();
  if (!s) return [];

  if (s.startsWith('{') || s.startsWith('[')) {
    try { return JSON.parse(s); } catch (e) { /* fallback */ }
  }
  try { return s.split(',').map(it => it.trim()).filter(Boolean); } catch (e) { return []; }
}

// GET - Récupérer une gare par ID
export async function GET(request, { params }) {
  try {
    const resolved = await unwrapParams(params);
    const { id } = resolved || {};
    const [rows] = await pool.execute('SELECT * FROM stations WHERE id = ?', [id]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Gare non trouvée' }, { status: 404 });
    }

    const stationRow = rows[0];
    const station = {
      ...stationRow,
      service: safeParseJsonOrCsv(stationRow.service || '[]'),
      quais: (() => {
        try {
          const parsed = safeParseJsonOrCsv(stationRow.quais || '[]');
          if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') return [];
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) { return []; }
      })(),
      transports_commun: (() => {
        try {
          const parsed = safeParseJsonOrCsv(stationRow.transports_commun || '[]');
          if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') return parsed.map(p => ({ type: p }));
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) { return []; }
      })()
    };

    return NextResponse.json(station);
  } catch (error) {
    console.error('Erreur lors de la récupération de la gare:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération de la gare' }, { status: 500 });
  }
}

// PUT - Modifier une gare
export async function PUT(request, { params }) {
  try {
    const resolved = await unwrapParams(params);
    const { id } = resolved || {};
    if (!id) {
      return NextResponse.json({ error: 'ID de la gare manquant' }, { status: 400 });
    }
    const idNum = parseInt(id, 10);
    if (Number.isNaN(idNum) || idNum <= 0) {
      return NextResponse.json({ error: 'ID de gare invalide' }, { status: 400 });
    }
    let body;
    try {
      body = await request.json();
    } catch (err) {
      const text = await request.text();
      try {
        const paramsObj = Object.fromEntries(new URLSearchParams(text).entries());
        body = paramsObj;
      } catch (e) {
        body = { raw: text };
      }
    }

    // Extraire les champs possibles (on autorise les mises à jour partielles)
    let { nom, type_gare, service, quais, transports_commun } = body || {};

    // Normaliser les champs composites si fournis
    if (typeof service === 'string') {
      try { service = JSON.parse(service); } catch (e) { service = service.split(',').map(s => s.trim()).filter(Boolean); }
    }
    if (typeof quais === 'string') {
      try { quais = JSON.parse(quais); } catch (e) { quais = []; }
    }
    if (typeof transports_commun === 'string') {
      try { transports_commun = JSON.parse(transports_commun); } catch (e) { transports_commun = []; }
    }

    // Construire dynamiquement la mise à jour pour ne transmettre que les champs présents
    const setParts = [];
    const paramsSql = [];

    if (typeof nom !== 'undefined') {
      // validation simple
      if (!nom) return NextResponse.json({ error: 'Le nom ne peut pas être vide' }, { status: 400 });
      setParts.push('nom = ?');
      paramsSql.push(String(nom));
    }

    if (typeof type_gare !== 'undefined') {
      if (!type_gare) return NextResponse.json({ error: "Le type_de_gare ne peut pas être vide" }, { status: 400 });
      setParts.push('type_gare = ?');
      paramsSql.push(String(type_gare));
    }

    if (typeof service !== 'undefined') {
      // garantir un tableau
      if (!Array.isArray(service)) service = [];
      setParts.push('service = ?');
      paramsSql.push(JSON.stringify(service));
    }

    if (typeof quais !== 'undefined') {
      if (!Array.isArray(quais)) quais = [];
      setParts.push('quais = ?');
      paramsSql.push(JSON.stringify(quais));
    }

    if (typeof transports_commun !== 'undefined') {
      if (!Array.isArray(transports_commun)) transports_commun = [];
      setParts.push('transports_commun = ?');
      paramsSql.push(JSON.stringify(transports_commun));
    }

    if (setParts.length === 0) {
      return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 });
    }

    const sql = `UPDATE stations SET ${setParts.join(', ')} WHERE id = ?`;
    paramsSql.push(idNum);

    console.log('PUT /api/admin/stations/:id executing', { sql, paramsSql });

    await pool.execute(sql, paramsSql);

    const [updatedRows] = await pool.execute('SELECT * FROM stations WHERE id = ?', [idNum]);
    if (updatedRows.length === 0) {
      return NextResponse.json({ error: 'Gare non trouvée' }, { status: 404 });
    }

    const updated = updatedRows[0];
    const station = {
      ...updated,
      service: safeParseJsonOrCsv(updated.service || '[]'),
      quais: (() => {
        try {
          const parsed = safeParseJsonOrCsv(updated.quais || '[]');
          if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') return [];
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) { return []; }
      })(),
      transports_commun: (() => {
        try {
          const parsed = safeParseJsonOrCsv(updated.transports_commun || '[]');
          if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') return parsed.map(p => ({ type: p }));
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) { return []; }
      })()
    };

    return NextResponse.json(station);
  } catch (error) {
    console.error('Erreur lors de la modification de la gare:', error);
    return NextResponse.json({ error: 'Erreur lors de la modification de la gare' }, { status: 500 });
  }
}

// DELETE - Supprimer une gare
export async function DELETE(request, { params }) {
  try {
    const resolved = await unwrapParams(params);
    const { id } = resolved || {};

    const [existing] = await pool.execute('SELECT * FROM stations WHERE id = ?', [id]);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Gare non trouvée' }, { status: 404 });
    }

    await pool.execute('DELETE FROM stations WHERE id = ?', [id]);
    return NextResponse.json({ message: 'Gare supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la gare:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression de la gare' }, { status: 500 });
  }
}
