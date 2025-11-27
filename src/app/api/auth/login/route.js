import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validation des champs
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      );
    }

    // Rechercher l'utilisateur
    const [users] = await pool.query(
      'SELECT id, email, password, nom, prenom, role FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    const user = users[0];

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Créer une session (simplifié, vous pouvez utiliser JWT ou NextAuth)
    const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours

    await pool.query(
      'INSERT INTO sessions (user_id, session_token, expires) VALUES (?, ?, ?)',
      [user.id, sessionToken, expires]
    );

    // Déterminer la redirection selon le rôle
    const redirectUrl = user.role === 'admin' ? '/espace/admin/dashboard' : '/espace/dashboard';

    // Préparer la réponse JSON avec cookies définis
    const response = NextResponse.json(
      {
        message: 'Connexion réussie',
        user: {
          id: user.id,
          email: user.email,
          nom: user.nom,
          prenom: user.prenom,
          role: user.role
        },
        redirect: redirectUrl
      },
      { status: 200 }
    );

    // Définir le cookie de session
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 jours
    });

    // Définir un cookie non-http pour le rôle afin que le front puisse rediriger si besoin
    response.cookies.set('user_role', user.role, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60
    });

    return response;

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la connexion' },
      { status: 500 }
    );
  }
}
