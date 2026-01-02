// filepath: c:\Users\MrPatator\Documents\Développement\Ferrovia-TER\src\app\api\admin\stations\[id]\route.js
import { NextResponse } from 'next/server';
import * as stationsLib from '@/lib/stations';

async function unwrapParams(params) {
  if (!params) return {};
  // Next.js peut fournir un objet thenable pour params — await si nécessaire
  if (typeof params === 'object' && typeof params.then === 'function') {
    try { return await params; } catch (e) { return {}; }
  }
  return params;
}

// GET /api/admin/stations/:id_or_code
export async function GET(request, { params }) {
  try {
    const resolved = await unwrapParams(params);
    const { id } = resolved || {};
    if (!id) return NextResponse.json({ error: 'ID/Code manquant' }, { status: 400 });
    const station = await stationsLib.findStationByIdentifier(id);
    if (!station) return NextResponse.json({ error: 'Gare non trouvée' }, { status: 404 });
    return NextResponse.json(station);
  } catch (err) {
    console.error('GET /api/admin/stations/:id error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: err.status || 500 });
  }
}

// PUT - update station by id or code
export async function PUT(request, { params }) {
  try {
    const resolved = await unwrapParams(params);
    const { id } = resolved || {};
    if (!id) return NextResponse.json({ error: 'ID/Code manquant' }, { status: 400 });

    // Lire le corps, tolérant JSON ou form-encoded
    let body;
    try { body = await request.json(); } catch (e) { const t = await request.text(); try { body = JSON.parse(t); } catch (e2) { body = {}; } }

    console.log('[PUT] /api/admin/stations/:id called', { paramsResolved: resolved, body });

    // Find existing station first
    const existing = await stationsLib.findStationByIdentifier(id);
    console.log('[PUT] existing station found:', existing ? { id: existing.id, code: existing.code, nom: existing.nom } : null);
    if (!existing) return NextResponse.json({ error: 'Gare non trouvée' }, { status: 404 });

    // If identifier passed was a code string, resolve to actual id
    const targetId = existing.id;

    const updated = await stationsLib.updateStationById(targetId, body);
    console.log('[PUT] update result:', updated);
    return NextResponse.json(updated);
  } catch (err) {
    console.error('PUT /api/admin/stations/:id error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: err.status || 500 });
  }
}

// DELETE - delete by id or code
export async function DELETE(request, { params }) {
  try {
    const resolved = await unwrapParams(params);
    const { id } = resolved || {};
    if (!id) return NextResponse.json({ error: 'ID/Code manquant' }, { status: 400 });

    const existing = await stationsLib.findStationByIdentifier(id);
    if (!existing) return NextResponse.json({ error: 'Gare non trouvée' }, { status: 404 });

    await stationsLib.deleteStationById(existing.id);
    return NextResponse.json({ message: 'Gare supprimée avec succès' });
  } catch (err) {
    console.error('DELETE /api/admin/stations/:id error:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: err.status || 500 });
  }
}
