"use client";
import React from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function AdminNavClient() {
  const pathname = usePathname() || '';
  const router = useRouter();

  function isActive(href) {
    if (!href) return false;
    if (href === '/espace/admin/dashboard') {
      return pathname === '/espace/admin' || pathname === '/espace/admin/dashboard' || pathname.startsWith('/espace/admin/dashboard');
    }
    return pathname === href || pathname.startsWith(href + '/') || pathname.startsWith(href + '?');
  }

  const handleNavigate = (e, href) => {
    e && e.preventDefault && e.preventDefault();
    // navigation client-side
    router.push(href);
  };

  const handleLogout = async (e) => {
    e && e.preventDefault && e.preventDefault();
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Erreur lors de la déconnexion', err);
    } finally {
      router.push('/se-connecter');
      router.refresh();
    }
  };

  return (
      <wcs-nav aria-label="Main menu">
          <wcs-nav-item>
              <a href="/espace/admin/dashboard" onClick={(e) => handleNavigate(e, '/espace/admin/dashboard')} className={isActive('/espace/admin/dashboard') ? 'active' : ''}>
                  <wcs-mat-icon icon="home"></wcs-mat-icon>
                  <span>Tableau de Bord</span>
              </a>
          </wcs-nav-item>
          <wcs-nav-item>
              <a href="/espace/admin/materiels" onClick={(e) => handleNavigate(e, '/espace/admin/materiels')} className={isActive('/espace/admin/materiels') ? 'active' : ''}>
                  <wcs-mat-icon icon="train"></wcs-mat-icon>
                  <span>Matériels Roulants</span>
              </a>
          </wcs-nav-item>
          <wcs-nav-item>
              <a href="/espace/admin/gares" onClick={(e) => handleNavigate(e, '/espace/admin/gares')} className={isActive('/espace/admin/gares') ? 'active' : ''}>
                  <wcs-mat-icon icon="train" role="img" aria-label="My trains"></wcs-mat-icon>
                  <span>Trains</span>
              </a>
          </wcs-nav-item>

          <wcs-nav-item>
                <a href="/espace/admin/horaires" onClick={(e) => handleNavigate(e, '/espace/admin/horaires')} className={isActive('/espace/admin/horaires') ? 'active' : ''}>
                    <wcs-mat-icon icon="schedule"></wcs-mat-icon>
                    <span>Horaires (Sillons)</span>
                </a>
            </wcs-nav-item>
          <wcs-nav-item>
              <a href="/espace/admin/fiches-horaires" onClick={(e) => handleNavigate(e, '/espace/admin/fiches-horaires')} className={isActive('/espace/admin/fiches-horaires') ? 'active' : ''}>
                  <wcs-mat-icon icon="description"></wcs-mat-icon>
                  <span>Fiches Horaires</span>
              </a>
          </wcs-nav-item>
          <wcs-nav-item>
              <a href="/espace/admin/lignes" onClick={(e) => handleNavigate(e, '/espace/admin/lignes')} className={isActive('/espace/admin/lignes') ? 'active' : ''}>
                  <wcs-mat-icon icon="directions_transit"></wcs-mat-icon>
                  <span>Lignes</span>
              </a>
          </wcs-nav-item>

          <wcs-nav-item>
              <a href="/espace/admin/diffusion-infos" onClick={(e) => handleNavigate(e, '/espace/admin/diffusion-infos')} className={isActive('/espace/admin/diffusion-infos') ? 'active' : ''}>
                  <wcs-mat-icon icon="campaign"></wcs-mat-icon>
                  <span>Diffusion d'infos</span>
              </a>
          </wcs-nav-item>

          <wcs-nav-item>
              <a href="/espace/admin/parametres" onClick={(e) => handleNavigate(e, '/espace/admin/parametres')} className={isActive('/espace/admin/parametres') ? 'active' : ''}>
                  <wcs-mat-icon icon="settings"></wcs-mat-icon>
                  <span>Paramètres</span>
              </a>
          </wcs-nav-item>

          {/* Nouvelle entrée: Attributions des quais */}
          <wcs-nav-item>
              <a href="/espace/admin/attributions-quais" onClick={(e) => handleNavigate(e, '/espace/admin/attributions-quais')} className={isActive('/espace/admin/attributions-quais') ? 'active' : ''}>
                  <wcs-mat-icon icon="inventory"></wcs-mat-icon>
                  <span>Attributions des quais</span>
              </a>
          </wcs-nav-item>

          {/* Item de déconnexion */}
          <wcs-nav-item style={{ marginTop: 'auto' }}>
              <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <wcs-mat-icon icon="logout"></wcs-mat-icon>
                  <span>Déconnexion</span>
              </button>
          </wcs-nav-item>

      </wcs-nav>
  );
}
