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
              <wcs-com-nav-submenu
                  label="Sous menu"
                  panel-description="Nullam id dolor id nibh ultricies vehicula ut id elit. Cras mattis consectetur purus sit amet fermentum. Morbi leo risus, porta ac consectetur ac, vestibulum at eros."
                  panel-title="Sous Menu">
                  <wcs-com-nav-item>
                      <a href="hobbies">Loisirs & Tourisme</a>
                  </wcs-com-nav-item>
                  <wcs-com-nav-item>
                      <a href="lines">Toutes les lignes</a>
                  </wcs-com-nav-item>
                  <wcs-com-nav-item>
                      <a href="mobiles">Services mobiles</a>
                  </wcs-com-nav-item>
                  <wcs-com-nav-item>
                      <a href="daily">Au quotidien</a>
                  </wcs-com-nav-item>
                  <wcs-com-nav-item>
                      <a href="network">Le réseau</a>
                  </wcs-com-nav-item>
              </wcs-com-nav-submenu>
              <wcs-com-nav-submenu
                  label="Autre sous menu"
                  panel-description="Un autre sous menu avec des catégories. Cras mattis consectetur purus sit amet fermentum. Morbi leo risus, porta ac consectetur ac, vestibulum at eros."
                  panel-title="Autre Sous Menu">
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
              <wcs-com-nav-item>
                  <a href="https://sncf.com" target="_blank">
                      Ressource externe
                  </a>
              </wcs-com-nav-item>
              <div
                  slot="actions"
                  style={{
                      alignItems: "center",
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
