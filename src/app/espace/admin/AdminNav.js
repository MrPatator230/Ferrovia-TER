export default function AdminNav(){
  return (
      <aside>
          <div>
              <wcs-nav aria-label="Main menu">
                  <wcs-nav-item>
                      <a href="/favorite">
                          <wcs-mat-icon icon="star"/>
                          <span>Favorite</span>
                      </a>
                  </wcs-nav-item>
                  <wcs-nav-item className="active">
                      <a aria-current="page" href="/description">
                          <wcs-mat-icon icon="description"/>
                          <span>Description</span>
                      </a>
                  </wcs-nav-item>
                  <wcs-nav-item slot="bottom">
                      <button id="support-button" onClick="openModal()">
                          <wcs-mat-icon icon="support"></wcs-mat-icon>
                          <span>test</span>
                      </button>
                  </wcs-nav-item>
                  <wcs-nav-item slot="bottom">
                      <button id="support-button" onClick="openModal()">
                          <wcs-mat-icon icon="support"></wcs-mat-icon>
                          <span>Support</span>
                      </button>
                  </wcs-nav-item>
              </wcs-nav>

          </div>
               </aside>
  )
}
