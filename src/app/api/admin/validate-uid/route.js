import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const uid = url.searchParams.get('uid');

    if (!uid) {
      return NextResponse.json({ error: 'UID requis' }, { status: 400 });
    }

    // Vérifier en base si un utilisateur admin possède cet admin_uid
    const [users] = await pool.query('SELECT id, role FROM users WHERE admin_uid = ?', [uid]);
    if (users.length === 0) {
      return NextResponse.json({ valid: false }, { status: 404 });
    }

    const user = users[0];
    if (user.role !== 'admin') {
      return NextResponse.json({ valid: false }, { status: 403 });
    }

    // Créer une session identique à la connexion par identifiants
    const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours

    await pool.query('INSERT INTO sessions (user_id, session_token, expires) VALUES (?, ?, ?)', [user.id, sessionToken, expires]);

    // Préparer une redirection vers le dashboard admin et définir les cookies
    const dest = new URL('/espace/admin/dashboard', request.url);
    const response = NextResponse.redirect(dest);

    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // en secondes
    });

    response.cookies.set('user_role', 'admin', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60
    });

    return response;
  } catch (err) {
    console.error('[API validate-uid] Erreur:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
