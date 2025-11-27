"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import InfoBanner from '../../components/InfoBanner';
import Header from '../../components/Header';
import NavigationBar from '../../components/NavigationBar';
import styles from './connexion.module.css';

export default function Connexion() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors de la connexion');
        setLoading(false);
        return;
      }

      // Rediriger automatiquement vers l'espace approprié selon le rôle
      if (data.redirect) {
        router.push(data.redirect);
      } else {
        router.push('/');
      }
      router.refresh();

    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur de connexion au serveur');
      setLoading(false);
    }
  };

  return (
    <main role="main">
      <header role="banner">
        <InfoBanner />
        <Header />
        <NavigationBar />
      </header>

      <div className={styles.container}>
        <div className={styles.formWrapper}>
          <div className={styles.formCard}>
            <h1 className={styles.title}>Connexion</h1>
            <p className={styles.subtitle}>Connectez-vous à votre compte TER</p>

            {error && (
              <div className={styles.errorAlert} role="alert">
                <i className="icons-circle-delete" aria-hidden="true"></i>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.label}>
                  Adresse email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className={styles.input}
                  placeholder="exemple@email.com"
                  autoComplete="email"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="password" className={styles.label}>
                  Mot de passe *
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className={styles.input}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              <div className={styles.forgotPassword}>
                <a href="#" className={styles.link}>
                  Mot de passe oublié ?
                </a>
              </div>

              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className={styles.spinner}></span>
                    Connexion en cours...
                  </>
                ) : (
                  'Se connecter'
                )}
              </button>

              <div className={styles.divider}>
                <span>ou</span>
              </div>

              <button
                type="button"
                onClick={() => router.push('/inscription')}
                className={styles.secondaryButton}
              >
                Créer un compte
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
