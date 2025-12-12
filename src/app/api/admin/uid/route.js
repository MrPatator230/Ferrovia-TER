import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// Générateur UUID v4 léger (sans dépendance externe)
function uuidv4() {
  // https://stackoverflow.com/a/2117523/1046713
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// GET - retourne l'admin_uid de l'utilisateur connecté
export async function GET(request) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const [sessions] = await pool.query('SELECT user_id, expires FROM sessions WHERE session_token = ?', [sessionToken]);
    if (sessions.length === 0) {
      return NextResponse.json({ error: 'Session invalide' }, { status: 401 });
    }

    const session = sessions[0];
    if (new Date(session.expires) < new Date()) {
      await pool.query('DELETE FROM sessions WHERE session_token = ?', [sessionToken]);
      return NextResponse.json({ error: 'Session expirée' }, { status: 401 });
    }

    const [users] = await pool.query('SELECT id, email, nom, prenom, role, admin_uid FROM users WHERE id = ?', [session.user_id]);
    if (users.length === 0) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    return NextResponse.json({ user: users[0] }, { status: 200 });
  } catch (err) {
    console.error('[API admin/uid GET] Erreur:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - génère et stocke un admin_uid (UUID) pour l'utilisateur connecté s'il n'en a pas
export async function POST(request) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const [sessions] = await pool.query('SELECT user_id, expires FROM sessions WHERE session_token = ?', [sessionToken]);
    if (sessions.length === 0) {
      return NextResponse.json({ error: 'Session invalide' }, { status: 401 });
    }

    const session = sessions[0];
    if (new Date(session.expires) < new Date()) {
      await pool.query('DELETE FROM sessions WHERE session_token = ?', [sessionToken]);
      return NextResponse.json({ error: 'Session expirée' }, { status: 401 });
    }

    // Vérifier l'utilisateur
    const [users] = await pool.query('SELECT id, role, admin_uid FROM users WHERE id = ?', [session.user_id]);
    if (users.length === 0) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const user = users[0];
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé: nécessite rôle admin' }, { status: 403 });
    }

    if (user.admin_uid) {
      return NextResponse.json({ admin_uid: user.admin_uid }, { status: 200 });
    }

    // Génération de l'UUID
    const newUid = uuidv4();

    await pool.query('UPDATE users SET admin_uid = ? WHERE id = ?', [newUid, user.id]);

    return NextResponse.json({ admin_uid: newUid }, { status: 201 });
  } catch (err) {
    console.error('[API admin/uid POST] Erreur:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
