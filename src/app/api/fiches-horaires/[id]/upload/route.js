import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
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

export const config = {
  api: {
    bodyParser: false
  }
};

// Next.js app router expects default export functions; using POST
export async function POST(request, { params }) {
  const { id } = params;
  try {
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
    const connection = await getConnection();
    await connection.execute(
      `UPDATE fiches_horaires SET pdf_path = ?, statut = 'importé' WHERE id = ?`,
      [`/fh/${filename}`, id]
    );
    await connection.end();

    return NextResponse.json({ success: true, message: 'Fichier importé', pdf_path: `/fh/${filename}` });
  } catch (err) {
    console.error('Erreur upload fiche:', err);
    return NextResponse.json({ success: false, message: 'Erreur lors de l\'import du fichier: ' + err.message }, { status: 500 });
  }
}

