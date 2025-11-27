"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import InfoBanner from '../../components/InfoBanner';
import Header from '../../components/Header';
import NavigationBar from '../../components/NavigationBar';
import styles from './inscription.module.css';

export default function Inscription() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nom: '',
    prenom: '',
    telephone: '',
    date_naissance: '',
    adresse: '',
    ville: '',
    code_postal: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
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

    // Vérifier que les mots de passe correspondent
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    // Vérifier la longueur du mot de passe
    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      setLoading(false);
      return;
    }

    try {
      const { confirmPassword, ...dataToSend } = formData;

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors de l\'inscription');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/se-connecter');
      }, 2000);

    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur de connexion au serveur');
      setLoading(false);
    }
  };

  if (success) {
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
              <div className={styles.successMessage}>
                <i className="icons-checked-circle" style={{ fontSize: '3rem', color: '#0b7d48' }}></i>
                <h2>Compte créé avec succès !</h2>
                <p>Vous allez être redirigé vers la page de connexion...</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

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
            <h1 className={styles.title}>Créer un compte</h1>
            <p className={styles.subtitle}>Rejoignez TER Bourgogne-Franche-Comté</p>

            {error && (
              <div className={styles.errorAlert} role="alert">
                <i className="icons-circle-delete" aria-hidden="true"></i>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formSection}>
                <h3 className={styles.sectionTitle}>Informations de connexion</h3>

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

                <div className={styles.formRow}>
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
                      placeholder="Min. 6 caractères"
                      autoComplete="new-password"
                      minLength={6}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="confirmPassword" className={styles.label}>
                      Confirmer le mot de passe *
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      className={styles.input}
                      placeholder="Confirmez"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>

              <div className={styles.formSection}>
                <h3 className={styles.sectionTitle}>Informations personnelles</h3>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="nom" className={styles.label}>
                      Nom *
                    </label>
                    <input
                      type="text"
                      id="nom"
                      name="nom"
                      value={formData.nom}
                      onChange={handleChange}
                      required
                      className={styles.input}
                      placeholder="Votre nom"
                      autoComplete="family-name"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="prenom" className={styles.label}>
                      Prénom *
                    </label>
                    <input
                      type="text"
                      id="prenom"
                      name="prenom"
                      value={formData.prenom}
                      onChange={handleChange}
                      required
                      className={styles.input}
                      placeholder="Votre prénom"
                      autoComplete="given-name"
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="telephone" className={styles.label}>
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      id="telephone"
                      name="telephone"
                      value={formData.telephone}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="06 12 34 56 78"
                      autoComplete="tel"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="date_naissance" className={styles.label}>
                      Date de naissance
                    </label>
                    <input
                      type="date"
                      id="date_naissance"
                      name="date_naissance"
                      value={formData.date_naissance}
                      onChange={handleChange}
                      className={styles.input}
                      autoComplete="bday"
                    />
                  </div>
                </div>
              </div>

              <div className={styles.formSection}>
                <h3 className={styles.sectionTitle}>Adresse</h3>

                <div className={styles.formGroup}>
                  <label htmlFor="adresse" className={styles.label}>
                    Adresse complète
                  </label>
                  <input
                    type="text"
                    id="adresse"
                    name="adresse"
                    value={formData.adresse}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Numéro et nom de rue"
                    autoComplete="street-address"
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="code_postal" className={styles.label}>
                      Code postal
                    </label>
                    <input
                      type="text"
                      id="code_postal"
                      name="code_postal"
                      value={formData.code_postal}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="25000"
                      autoComplete="postal-code"
                      maxLength={5}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="ville" className={styles.label}>
                      Ville
                    </label>
                    <input
                      type="text"
                      id="ville"
                      name="ville"
                      value={formData.ville}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="Besançon"
                      autoComplete="address-level2"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className={styles.spinner}></span>
                    Création en cours...
                  </>
                ) : (
                  'Créer mon compte'
                )}
              </button>

              <div className={styles.loginLink}>
                Vous avez déjà un compte ?{' '}
                <a href="/se-connecter" className={styles.link}>
                  Se connecter
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

