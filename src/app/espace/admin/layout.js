import "../../globals.css";
import "wcs-core/dist/wcs/wcs.css";
import "wcs-core/design-tokens/dist/sncf-reseau.css";
import styles from "./admin.module.css";

import React from "react";
import WcsSetup from "../../../components/WcsClient";

    export default function AdminLayout({ children }) {
        // Détection du thème côté serveur (valeur par défaut)

        return (
            <html lang="fr" >
            <head>
                <meta charSet="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta name="color-scheme" content="light" />
                <meta name="theme-color" content="#0b7d48" />
                <title>TER Bourgogne-Franche-Comté</title>
                <meta name="description" content="Recherchez et réservez vos trajets en TER Bourgogne-Franche-Comté" />
                <WcsSetup />
            </head>
            <body className={styles.adminContainer}>
                <div className={`${styles.adminNav} sncf-reseau`}>
                    <wcs-nav aria-label="Main menu">
                        <wcs-nav-item className="active">
                            <a href="/Dashboard">
                                <wcs-mat-icon icon="home"/>
                                <span>Tableau de Bord</span>
                            </a>
                        </wcs-nav-item>


                    </wcs-nav>
                </div>
                <main className={styles.adminMain}>
                    {children}
                </main>
            </body>
            </html>
        );
    }



