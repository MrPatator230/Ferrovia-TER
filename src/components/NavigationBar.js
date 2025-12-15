"use client";
import UserMenu from './UserMenu';

export default function NavigationBar() {
  const tabs = [
    { label: 'Se déplacer' },
    { label: 'Abonnements', active: true },
    { label: 'Tarifs et cartes de réduction' },
    { label: 'Services et contacts' },
    { label: 'Découvrir la région' },
    { label: 'Bon plan' }
  ];
  return (
      <div>
          <wcs-com-nav aria-label="Menu principal">
              <wcs-com-nav-submenu label="Se Déplacer" panel-description="" panel-title="Se Déplacer">
                  <wcs-com-nav-item>
                      <a href="/se-deplacer/horaires">Rechercher un horaire (train, car...)</a>
                  </wcs-com-nav-item>
                  <wcs-com-nav-item>
                      <a href="/se-deplacer/prochains-departs">Prochains Départs</a>
                  </wcs-com-nav-item>
                  <wcs-com-nav-item>
                      <a href="/se-deplacer/gares">Gares</a>
                  </wcs-com-nav-item>
                  <wcs-com-nav-item>
                      <a href="/se-deplacer/fiches-horaires">Fiches Horaires</a>
                  </wcs-com-nav-item>
                  <wcs-com-nav-category label="Info Trafic" description="" href="/se-deplacer/info-trafic">
                      <wcs-com-nav-item>
                          <a href="services">Info travaux toutes lignes</a>
                      </wcs-com-nav-item>
                      <wcs-com-nav-item>
                          <a href="daily">Info affluence</a>
                      </wcs-com-nav-item>
                  </wcs-com-nav-category>
                  <wcs-com-nav-item>
                      <a href="https://ferrocarto.mr-patator.fr">Carte du Réseau</a>
                  </wcs-com-nav-item>

              </wcs-com-nav-submenu>
              <wcs-com-nav-submenu label="Abonnements" panel-description="" panel-title="Abonnements">
                  <wcs-com-nav-item>
                      <a href="network">Le réseau</a>
                  </wcs-com-nav-item>
                  <wcs-com-nav-category label="Une catégorie">
                      <wcs-com-nav-item>
                          <a href="services">Services mobiles text plus long</a>
                      </wcs-com-nav-item>
                      <wcs-com-nav-item>
                          <a href="daily">Au quotidien</a>
                      </wcs-com-nav-item>
                      <wcs-com-nav-item>
                          <a href="network">Le réseau</a>
                      </wcs-com-nav-item>
                  </wcs-com-nav-category>
                  <wcs-com-nav-category label="Une catégorie">
                      <wcs-com-nav-item>
                          <a href="1">1</a>
                      </wcs-com-nav-item>
                      <wcs-com-nav-item>
                          <a href="2">2</a>
                      </wcs-com-nav-item>
                  </wcs-com-nav-category>
              </wcs-com-nav-submenu>
              <wcs-com-nav-submenu label="Tarifs & Cartes de Réduction" panel-description="" panel-title="Se Déplacer">
                  <wcs-com-nav-item>
                      <a href="/se-deplacer/horaires">Rechercher un horaire (train, car...)</a>
                  </wcs-com-nav-item>
                  <wcs-com-nav-item>
                      <a href="/se-deplacer/prochains-departs">Prochains Départs</a>
                  </wcs-com-nav-item>
                  <wcs-com-nav-item>
                      <a href="/se-deplacer/gares">Gares</a>
                  </wcs-com-nav-item>
                  <wcs-com-nav-item>
                      <a href="/se-deplacer/fiches-horaires">Fiches Horaires</a>
                  </wcs-com-nav-item>
                  <wcs-com-nav-item>
                      <a href="/se-deplacer/info-trafic">Info Trafic</a>
                  </wcs-com-nav-item>
                  <wcs-com-nav-item>
                      <a href="https://ferrocarto.mr-patator.fr">Carte du Réseau</a>
                  </wcs-com-nav-item>

              </wcs-com-nav-submenu>
              <wcs-com-nav-submenu label="Services & Contacts" panel-description="" panel-title="Se Déplacer">
                  <wcs-com-nav-item>
                      <a href="/se-deplacer/horaires">Rechercher un horaire (train, car...)</a>
                  </wcs-com-nav-item>
                  <wcs-com-nav-item>
                      <a href="/se-deplacer/prochains-departs">Prochains Départs</a>
                  </wcs-com-nav-item>
                  <wcs-com-nav-item>
                      <a href="/se-deplacer/gares">Gares</a>
                  </wcs-com-nav-item>
                  <wcs-com-nav-item>
                      <a href="/se-deplacer/fiches-horaires">Fiches Horaires</a>
                  </wcs-com-nav-item>
                  <wcs-com-nav-item>
                      <a href="/se-deplacer/info-trafic">Info Trafic</a>
                  </wcs-com-nav-item>
                  <wcs-com-nav-item>
                      <a href="https://ferrocarto.mr-patator.fr">Carte du Réseau</a>
                  </wcs-com-nav-item>

              </wcs-com-nav-submenu>
              <wcs-com-nav-submenu label="Bons Plans" panel-description="" panel-title="Se Déplacer">
                  <wcs-com-nav-item>
                      <a href="/se-deplacer/horaires">Rechercher un horaire (train, car...)</a>
                  </wcs-com-nav-item>
                  <wcs-com-nav-item>
                      <a href="/se-deplacer/prochains-departs">Prochains Départs</a>
                  </wcs-com-nav-item>
                  <wcs-com-nav-item>
                      <a href="/se-deplacer/gares">Gares</a>
                  </wcs-com-nav-item>
                  <wcs-com-nav-item>
                      <a href="/se-deplacer/fiches-horaires">Fiches Horaires</a>
                  </wcs-com-nav-item>
                  <wcs-com-nav-item>
                      <a href="/se-deplacer/info-trafic">Info Trafic</a>
                  </wcs-com-nav-item>
                  <wcs-com-nav-item>
                      <a href="https://ferrocarto.mr-patator.fr">Carte du Réseau</a>
                  </wcs-com-nav-item>

              </wcs-com-nav-submenu>

              <div
                  slot="actions"
                  style={{
                      alignItems: "last",
                      display: "flex",
                      position: "relative",
                      zIndex: 1000,
                  }}>
                  <wcs-button mode="clear" shape="round">
                      <wcs-mat-icon icon="search" />
                  </wcs-button>
                  <UserMenu />
              </div>
          </wcs-com-nav>

      </div>
  );
}
