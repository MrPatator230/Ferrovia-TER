import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;

    if (sessionToken) {
      // Supprimer la session de la base de données
      await pool.query('DELETE FROM sessions WHERE session_token = ?', [sessionToken]);
    }

    const response = NextResponse.json(
      { message: 'Déconnexion réussie' },
      { status: 200 }
    );

    // Supprimer le cookie
    response.cookies.delete('session_token');

    return response;

  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la déconnexion' },
      { status: 500 }
    );
  }
}

