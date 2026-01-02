import { NextResponse } from 'next/server';
import pool from '@/lib/db';

function parseCookieHeaderForToken(cookieHeader, name = 'session_token') {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';').map(p => p.trim());
  for (const p of parts) {
    if (p.startsWith(name + '=')) return p.substring(name.length + 1);
  }
  return null;
}

export async function GET(request) {
  try {
    // Debug: afficher si le header Cookie est présent
    const cookieHeader = request.headers.get('cookie') || '';
    console.debug('[API /api/auth/me] cookie header present:', !!cookieHeader);

    // Première tentative: NextRequest.cookies (parsed)
    let sessionToken = request.cookies.get('session_token')?.value;

    // Fallback: raw Cookie header parsing (some callers may forward the header but NextRequest.cookies may be empty)
    if (!sessionToken && cookieHeader) {
      sessionToken = parseCookieHeaderForToken(cookieHeader, 'session_token');
      if (sessionToken) console.debug('[API /api/auth/me] session_token extracted from raw Cookie header');
    }

    // Fallback: Authorization Bearer header
    if (!sessionToken) {
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        sessionToken = authHeader.split(' ')[1];
        console.debug('[API /api/auth/me] session_token extracted from Authorization header');
      }
    }

    // Fallback: custom header
    if (!sessionToken) {
      const alt = request.headers.get('x-session-token') || request.headers.get('x-session');
      if (alt) {
        sessionToken = alt;
        console.debug('[API /api/auth/me] session_token extracted from x-session-token header');
      }
    }

    if (!sessionToken) {
      console.debug('[API /api/auth/me] session_token absent');
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Vérifier la session
    const [sessions] = await pool.query(
      'SELECT user_id, expires FROM sessions WHERE session_token = ?',
      [sessionToken]
    );

    if (sessions.length === 0) {
      console.debug('[API /api/auth/me] session introuvable pour token:', sessionToken ? '[masked]' : null);
      return NextResponse.json(
        { error: 'Session invalide' },
        { status: 401 }
      );
    }

    const session = sessions[0];

    // Vérifier si la session a expiré
    if (new Date(session.expires) < new Date()) {
      await pool.query('DELETE FROM sessions WHERE session_token = ?', [sessionToken]);
      console.debug('[API /api/auth/me] session expirée pour token:', sessionToken ? '[masked]' : null);
      return NextResponse.json(
        { error: 'Session expirée' },
        { status: 401 }
      );
    }

    // Récupérer les informations utilisateur
    const [users] = await pool.query(
      'SELECT id, email, nom, prenom, telephone, date_naissance, ville, code_postal, role FROM users WHERE id = ?',
      [session.user_id]
    );

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Utilisateur introuvable' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { user: users[0] },
      { status: 200 }
    );

  } catch (error) {
    console.error('Erreur lors de la vérification de session:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
