import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;

    if (!sessionToken) {
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
      return NextResponse.json(
        { error: 'Session invalide' },
        { status: 401 }
      );
    }

    const session = sessions[0];

    // Vérifier si la session a expiré
    if (new Date(session.expires) < new Date()) {
      await pool.query('DELETE FROM sessions WHERE session_token = ?', [sessionToken]);
      return NextResponse.json(
        { error: 'Session expirée' },
        { status: 401 }
      );
    }

    // Récupérer les informations utilisateur
    const [users] = await pool.query(
      'SELECT id, email, nom, prenom, telephone, date_naissance, ville, code_postal FROM users WHERE id = ?',
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

