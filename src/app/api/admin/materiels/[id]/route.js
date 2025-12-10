import fs from 'fs';
import path from 'path';
import pool from '../../../../../lib/db';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'm-r');

function ensureUploadDir(){
  if(!fs.existsSync(UPLOAD_DIR)){
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

// GET - Récupérer un matériel par ID
export async function GET(req, { params }) {
  try {
    // params peut être une Promise dans certaines versions/configs de Next.js
    const { id } = await params;
    const [rows] = await pool.query('SELECT * FROM materiel_roulant WHERE id = ? LIMIT 1', [id]);

    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Matériel non trouvé' }), { status: 404 });
    }

    return new Response(JSON.stringify(rows[0]), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), { status: 500 });
  }
}

// PUT - Modifier un matériel
export async function PUT(req, { params }) {
  try {
    // await params pour obtenir l'objet réel
    const { id } = await params;
    const body = await req.json();

    // Vérifier si le matériel existe
    const [existing] = await pool.query('SELECT * FROM materiel_roulant WHERE id = ? LIMIT 1', [id]);
    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Matériel non trouvé' }), { status: 404 });
    }

    const existingMateriel = existing[0];

    // Extraction des champs
    const nom = body.nom || existingMateriel.nom;
    const nom_technique = body.nom_technique !== undefined ? body.nom_technique : existingMateriel.nom_technique;
    const capacite = body.capacite !== undefined ? parseInt(body.capacite, 10) : existingMateriel.capacite;
    const type_train = body.type_train || existingMateriel.type_train;
    const exploitant = body.exploitant !== undefined ? body.exploitant : existingMateriel.exploitant;

    let image_path = existingMateriel.image_path;

    // Traitement de la nouvelle image si fournie
    if (body.image_base64 && body.image_base64.trim() !== '') {
      try {
        ensureUploadDir();

        // Supprimer l'ancienne image si elle existe
        if (existingMateriel.image_path) {
          const oldImagePath = path.join(process.cwd(), 'public', existingMateriel.image_path);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
            console.log('[PUT Materiels] Ancienne image supprimée:', oldImagePath);
          }
        }

        // Extraire mime et base64
        const matches = /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/.exec(body.image_base64);
        if (!matches) {
          return new Response(JSON.stringify({ error: 'Image_base64 invalide' }), { status: 400 });
        }
        const mime = matches[1];
        const b64 = matches[2];

        // Utiliser le nom du fichier original s'il est fourni
        let filename;
        if (body.image_filename) {
          filename = body.image_filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        } else {
          const ext = mime.split('/')[1].split('+')[0];
          filename = `${existingMateriel.numero_serie}_${Date.now()}.${ext}`;
        }

        const filepath = path.join(UPLOAD_DIR, filename);
        fs.writeFileSync(filepath, Buffer.from(b64, 'base64'));
        image_path = `/m-r/${filename}`;

        console.log('[PUT Materiels] Nouvelle image sauvegardée:', image_path);
      } catch (imgError) {
        console.error('[PUT Materiels] Erreur lors du traitement de l\'image:', imgError);
        return new Response(JSON.stringify({ error: 'Erreur lors du traitement de l\'image: ' + imgError.message }), { status: 500 });
      }
    }

    // Mise à jour dans la base de données
    await pool.query(
      'UPDATE materiel_roulant SET nom = ?, nom_technique = ?, capacite = ?, image_path = ?, type_train = ?, exploitant = ? WHERE id = ?',
      [nom, nom_technique, capacite, image_path, type_train, exploitant, id]
    );

    // Récupérer le matériel mis à jour
    const [updated] = await pool.query('SELECT * FROM materiel_roulant WHERE id = ? LIMIT 1', [id]);

    return new Response(JSON.stringify(updated[0]), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message || 'Erreur serveur' }), { status: 500 });
  }
}

// DELETE - Supprimer un matériel
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;

    // Récupérer le matériel pour supprimer l'image associée
    const [rows] = await pool.query('SELECT * FROM materiel_roulant WHERE id = ? LIMIT 1', [id]);

    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Matériel non trouvé' }), { status: 404 });
    }

    const materiel = rows[0];

    // Supprimer l'image du système de fichiers si elle existe
    if (materiel.image_path) {
      const imagePath = path.join(process.cwd(), 'public', materiel.image_path);
      if (fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
          console.log('[DELETE Materiels] Image supprimée:', imagePath);
        } catch (err) {
          console.error('[DELETE Materiels] Erreur lors de la suppression de l\'image:', err);
        }
      }
    }

    // Supprimer le matériel de la base de données
    await pool.query('DELETE FROM materiel_roulant WHERE id = ?', [id]);

    return new Response(JSON.stringify({ message: 'Matériel supprimé avec succès', id }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message || 'Erreur serveur' }), { status: 500 });
  }
}
