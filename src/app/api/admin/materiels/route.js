import fs from 'fs';
import path from 'path';
import pool from '../../../../lib/db';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'm-r');

function ensureUploadDir(){
  if(!fs.existsSync(UPLOAD_DIR)){
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function generateSerie(){
  const n = Math.floor(Math.random() * 100000);
  return String(n).padStart(5, '0');
}

async function existsNumeroSerie(numero){
  const [rows] = await pool.query('SELECT 1 FROM materiel_roulant WHERE numero_serie = ? LIMIT 1', [numero]);
  return rows.length > 0;
}

async function generateUniqueNumero(){
  for(let i=0;i<20;i++){
    const num = generateSerie();
    const exists = await existsNumeroSerie(num);
    if(!exists) return num;
  }
  throw new Error('Impossible de générer un numéro de série unique');
}

export async function GET(){
  try{
    const [rows] = await pool.query('SELECT * FROM materiel_roulant ORDER BY created_at DESC');
    return new Response(JSON.stringify({ items: rows }), { status: 200 });
  }catch(err){
    console.error(err);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), { status: 500 });
  }
}

export async function POST(req){
  try{
    const contentType = req.headers.get('content-type') || '';
    let body;
    if(contentType.includes('application/json')){
      body = await req.json();
    } else {
      // tenter formData
      body = await req.formData();
    }

    // extraction des champs
    const nom = body.get ? body.get('nom') : body.nom;
    const nom_technique = body.get ? body.get('nom_technique') : body.nom_technique;
    const capaciteRaw = body.get ? body.get('capacite') : body.capacite;
    const type_train = body.get ? body.get('type_train') : body.type_train;
    const exploitant = body.get ? body.get('exploitant') : body.exploitant;
    const image_base64 = body.get ? body.get('image_base64') : body.image_base64;
    const image_filename = body.get ? body.get('image_filename') : body.image_filename;

    if(!nom || !type_train){
      return new Response(JSON.stringify({ error: 'Champs requis manquants' }), { status: 400 });
    }

    const capacite = parseInt(capaciteRaw || '0', 10) || 0;

    // génération numero de série unique
    const numero_serie = await generateUniqueNumero();

    // traitement image si présent (on attend un base64: data:<mime>;base64,AAAA...)
    let image_path = null;
    if(image_base64 && image_base64.trim() !== ''){
      try {
        ensureUploadDir();
        console.log('[POST Materiels] Traitement de l\'image, taille base64:', image_base64.length);

        // extraire mime et base64
        const matches = /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/.exec(image_base64);
        if(!matches){
          console.error('[POST Materiels] Format image_base64 invalide');
          return new Response(JSON.stringify({ error: 'Image_base64 invalide' }), { status: 400 });
        }
        const mime = matches[1];
        const b64 = matches[2];

        // Utiliser le nom du fichier original s'il est fourni, sinon utiliser le numéro de série
        let filename;
        if(image_filename){
          // Nettoyer le nom du fichier pour éviter les caractères problématiques
          filename = image_filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        } else {
          // Fallback: utiliser numéro de série + extension détectée
          const ext = mime.split('/')[1].split('+')[0];
          filename = `${numero_serie}.${ext}`;
        }

        const filepath = path.join(UPLOAD_DIR, filename);
        console.log('[POST Materiels] Sauvegarde de l\'image dans:', filepath);

        fs.writeFileSync(filepath, Buffer.from(b64, 'base64'));
        image_path = `/m-r/${filename}`;

        console.log('[POST Materiels] Image sauvegardée avec succès, image_path:', image_path);
      } catch(imgError) {
        console.error('[POST Materiels] Erreur lors du traitement de l\'image:', imgError);
        return new Response(JSON.stringify({ error: 'Erreur lors du traitement de l\'image: ' + imgError.message }), { status: 500 });
      }
    } else {
      console.log('[POST Materiels] Aucune image fournie');
    }

    const [result] = await pool.query(
      'INSERT INTO materiel_roulant (nom, nom_technique, capacite, image_path, type_train, exploitant, numero_serie) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nom, nom_technique || null, capacite, image_path, type_train, exploitant || null, numero_serie]
    );

    const insertedId = result.insertId;
    const [rows] = await pool.query('SELECT * FROM materiel_roulant WHERE id = ? LIMIT 1', [insertedId]);
    const inserted = rows[0];

    return new Response(JSON.stringify(inserted), { status: 201 });

  }catch(err){
    console.error(err);
    return new Response(JSON.stringify({ error: err.message || 'Erreur serveur' }), { status: 500 });
  }
}
