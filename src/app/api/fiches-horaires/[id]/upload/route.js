import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import pool from '@/lib/db_horaires';

// Next.js app router expects default export functions; using POST
export async function POST(request, { params }) {
  try {
    // Await params (Next.js 15 compatibility)
    const resolvedParams = await params;
    const { id } = resolvedParams;

    // Vérifier que l'ID est valide
    if (!id) {
      return NextResponse.json({ success: false, message: 'ID de fiche manquant' }, { status: 400 });
    }

    // Récupérer le multipart/form-data raw body
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ success: false, message: 'Content-Type must be multipart/form-data' }, { status: 400 });
    }

    // Utiliser Web API FormData
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) {
      return NextResponse.json({ success: false, message: 'Aucun fichier reçu (champ `file` manquant)' }, { status: 400 });
    }

    // Le file est un Blob/ File (Web API). On peut lire son buffer via arrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Créer dossier public/fh
    const fhDir = path.join(process.cwd(), 'public', 'fh');
    await fs.mkdir(fhDir, { recursive: true });

    // Nommer le fichier
    const ext = (file.name && path.extname(file.name)) || '.pdf';
    const filename = `fiche_${id}_${Date.now()}${ext}`;
    const filepath = path.join(fhDir, filename);

    // Sauvegarder
    await fs.writeFile(filepath, buffer);

    // Mettre à jour la fiche en base
    const pdfPath = `fh/${filename}`;
    const statut = 'publié'; // Valeurs possibles: 'brouillon', 'généré', 'publié'

    await pool.execute(
      `UPDATE fiches_horaires SET pdf_path = ?, statut = ? WHERE id = ?`,
      [pdfPath, statut, id]
    );

    return NextResponse.json({ success: true, message: 'Fichier importé', pdf_path: `/${pdfPath}` });
  } catch (err) {
    console.error('Erreur upload fiche:', err);
    return NextResponse.json({ success: false, message: 'Erreur lors de l\'import du fichier: ' + err.message }, { status: 500 });
  }
}
}

