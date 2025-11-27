import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, nom, prenom, telephone, date_naissance, adresse, ville, code_postal } = body;

    // Validation des champs obligatoires
    if (!email || !password || !nom || !prenom) {
      return NextResponse.json(
        { error: 'Les champs email, mot de passe, nom et prénom sont obligatoires' },
        { status: 400 }
      );
    }

    // Validation du format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Format d\'email invalide' },
        { status: 400 }
      );
    }

    // Validation du mot de passe (minimum 6 caractères)
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères' },
        { status: 400 }
      );
    }

    // Vérifier si l'utilisateur existe déjà
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'Un compte existe déjà avec cet email' },
        { status: 409 }
      );
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insérer le nouvel utilisateur
    const [result] = await pool.query(
      'INSERT INTO users (email, password, nom, prenom, telephone, date_naissance, adresse, ville, code_postal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [email, hashedPassword, nom, prenom, telephone || null, date_naissance || null, adresse || null, ville || null, code_postal || null]
    );

    return NextResponse.json(
      {
        message: 'Compte créé avec succès',
        userId: result.insertId
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'inscription' },
      { status: 500 }
    );
  }
}

