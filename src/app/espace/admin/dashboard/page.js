"use client";
import React, { useEffect, useState } from 'react';
import styles from './dashboard.module.css';

const REQUIRED_COMPONENTS = [
  'RealtimeTraffic',
  'IncidentsList',
  'SearchWidget',
  'Map',
  'QuickActions'
];

export default function AdminDashboard(){
  const [wcs, setWcs] = useState(null);
  const [missing, setMissing] = useState([]);
  const [error, setError] = useState(null);
  const [adminUid, setAdminUid] = useState(null);
  const [loadingUid, setLoadingUid] = useState(false);
  const [uidMessage, setUidMessage] = useState('');

  // Fonction utilitaire : copie dans le presse-papiers avec fallback
  const copyToClipboard = async (text) => {
    if (!text) return false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) {
      // ignore and fallback
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;
    // Charger la librairie WCS depuis node_modules/wcs-core
    import('wcs-core')
      .then(mod => {
        if (!mounted) return;
        setWcs(mod);
        const notFound = REQUIRED_COMPONENTS.filter(name => typeof mod[name] === 'undefined');
        setMissing(notFound);
      })
      .catch(err => {
        console.error('Impossible de charger wcs-core:', err);
        if (mounted) setError('La librairie `wcs-core` est introuvable. Installez-la et configurez la clé WCS.');
      });

    // Récupérer l'admin_uid au montage
    (async () => {
      try {
        setLoadingUid(true);
        const res = await fetch('/api/admin/uid');
        if (res.status === 200) {
          const data = await res.json();
          setAdminUid(data.user?.admin_uid || null);
        } else if (res.status === 401) {
          // non authentifié -> ne pas afficher
          setAdminUid(null);
        } else {
          console.warn('Impossible de récupérer admin_uid', res.status);
        }
      } catch (err) {
        console.error('Erreur fetch admin/uid:', err);
      } finally {
        setLoadingUid(false);
      }
    })();

    return () => { mounted = false };
  }, []);

  // Affichage d'état
  if (error) {
    return (
      <div className="dashboard-card">
        <h2>Dashboard Admin — WCS indisponible</h2>
        <p className="small-muted">{error}</p>
        <p className="small-muted">Composants attendus: {REQUIRED_COMPONENTS.join(', ')}</p>
        <p className="small-muted">Pour activer le dashboard complet, installez <code>wcs-core</code> et fournissez la configuration WCS (clé/API) selon la documentation.</p>
      </div>
    );
  }

  if (!wcs) {
    return (
      <div className="dashboard-card">
        <h2>Dashboard Admin</h2>
        <p className="small-muted">Chargement des composants WCS...</p>
      </div>
    );
  }

  if (missing.length > 0) {
    return (
      <div className="dashboard-card">
        <h2>Dashboard Admin — composants manquants</h2>
        <p className="small-muted">La librairie <code>wcs-core</code> est chargée mais les composants suivants sont absents :</p>
        <ul>
          {missing.map(m => <li key={m}><code>{m}</code></li>)}
        </ul>
        <p className="small-muted">Vérifiez la version de <code>wcs-core</code> ou contactez l'équipe SNCF pour activer ces widgets.</p>
      </div>
    );
  }

  // Rendu exclusivement avec les composants WCS
  const RealtimeTraffic = wcs.RealtimeTraffic;
  const IncidentsList = wcs.IncidentsList;
  const SearchWidget = wcs.SearchWidget;
  const MapWidget = wcs.Map;
  const QuickActions = wcs.QuickActions;

  return (
    <div className={styles.dashboardContainer}>
      <section className={styles.dashboardCard}>
        <h2>Identifiant d'intégration (UID)</h2>
        <p className="small-muted">Cet UID permet de lier cette instance avec l'application de gestion administrative.</p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
          <div className={styles.uidBox}>
            {loadingUid ? 'Chargement...' : (adminUid || 'Aucun UID généré')}
          </div>
          <div>
            <button
              type="button"
              onClick={async () => {
                if (!adminUid) {
                  // appeler POST pour générer
                  try {
                    setUidMessage('Génération en cours...');
                    const res = await fetch('/api/admin/uid', { method: 'POST' });
                    if (res.ok) {
                      const data = await res.json();
                      setAdminUid(data.admin_uid);
                      setUidMessage('UID généré');
                      // copier automatiquement
                      try { const ok = await copyToClipboard(data.admin_uid); if (ok) setUidMessage('UID généré et copié'); }
                      catch(e){ /* ignore */ }
                    } else {
                      const err = await res.json();
                      setUidMessage(err?.error || 'Erreur génération');
                    }
                  } catch (err) {
                    console.error(err);
                    setUidMessage('Erreur lors de la génération');
                  }
                } else {
                  try {
                    const ok = await copyToClipboard(adminUid);
                    setUidMessage(ok ? 'UID copié' : 'Impossible de copier');
                  } catch (err) {
                    console.error('Clipboard error', err);
                    setUidMessage('Impossible de copier');
                  }
                }
                setTimeout(() => setUidMessage(''), 3000);
              }}
              className={styles.btn}
            >
              {adminUid ? 'Copier l\'UID' : 'Générer et Copier l\'UID'}
            </button>
          </div>
        </div>
        {uidMessage && <p className="small-muted" style={{ marginTop: 8 }}>{uidMessage}</p>}
      </section>

      <section className={styles.dashboardCard}>
        <h2>État du trafic (WCS SNCF)</h2>
        <p className="small-muted">Dernière mise à jour: {new Date().toLocaleString()}</p>

        <div className={styles.statsGrid}>
          <div className={styles.statsCard}>
            <h3>Statut global</h3>
            {React.createElement(RealtimeTraffic, { style: { minHeight: 160 }, region: 'bfc' })}
          </div>

          <div className={styles.statsCard}>
            <h3>Actions rapides</h3>
            {React.createElement(QuickActions, { actions: ['publishAlert','createIncident','exportReport'] })}
          </div>
        </div>
      </section>

      <section className={styles.dashboardCard}>
        <h2>Incidents récents</h2>
        {React.createElement(IncidentsList, { limit: 25, region: 'bfc' })}
      </section>

      <section className={styles.dashboardCard}>
        <h2>Recherche WCS</h2>
        {React.createElement(SearchWidget, { placeholder: 'Rechercher une ligne, une gare...' })}
      </section>

      <section className={styles.dashboardCard}>
        <h2>Visualisation cartographique</h2>
        {React.createElement(MapWidget, { height: 520, initialView: { lat: 47.5, lng: 4.5, zoom: 8 } })}
      </section>
    </div>
  );
}
