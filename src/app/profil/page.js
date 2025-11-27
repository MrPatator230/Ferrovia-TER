"use client";
import React from 'react';
import InfoBanner from '../../components/InfoBanner';
import Header from '../../components/Header';
import NavigationBar from '../../components/NavigationBar';
import { withAuth } from '../../lib/useAuth';
import styles from './profil.module.css';

function ProfilPage({ user }) {
  return (
    <main role="main">
      <header role="banner">
        <InfoBanner />
        <Header />
        <NavigationBar />
      </header>

      <div className={styles.container}>
        <div className={styles.profileCard}>
          <div className={styles.header}>
            <div className={styles.avatar}>
              <i className="icons-circle-account-connected" style={{ fontSize: '3rem', color: '#0b7d48' }}></i>
            </div>
            <h1 className={styles.title}>Mon Profil</h1>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Informations personnelles</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.label}>Prénom</span>
                <span className={styles.value}>{user.prenom || 'Non renseigné'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Nom</span>
                <span className={styles.value}>{user.nom || 'Non renseigné'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Email</span>
                <span className={styles.value}>{user.email || 'Non renseigné'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Téléphone</span>
                <span className={styles.value}>{user.telephone || 'Non renseigné'}</span>
              </div>
              {user.date_naissance && (
                <div className={styles.infoItem}>
                  <span className={styles.label}>Date de naissance</span>
                  <span className={styles.value}>
                    {new Date(user.date_naissance).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {(user.adresse || user.ville || user.code_postal) && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Adresse</h2>
              <div className={styles.infoGrid}>
                {user.adresse && (
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Adresse</span>
                    <span className={styles.value}>{user.adresse}</span>
                  </div>
                )}
                {user.code_postal && (
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Code postal</span>
                    <span className={styles.value}>{user.code_postal}</span>
                  </div>
                )}
                {user.ville && (
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Ville</span>
                    <span className={styles.value}>{user.ville}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className={styles.actions}>
            <button className={styles.primaryButton}>
              <i className="icons-edit" style={{ marginRight: '0.5rem' }}></i>
              Modifier mes informations
            </button>
            <button className={styles.secondaryButton}>
              <i className="icons-lock" style={{ marginRight: '0.5rem' }}></i>
              Changer mon mot de passe
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

// Protéger la page avec le HOC withAuth
export default withAuth(ProfilPage);

