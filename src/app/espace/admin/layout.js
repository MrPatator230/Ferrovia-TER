import "../../globals.css";
import "wcs-core/dist/wcs/wcs.css";
import "wcs-core/design-tokens/dist/sncf-reseau.css";
import "wcs-core/design-tokens/dist/sncf-reseau-root-scoped.css";
import styles from "./admin.module.css";

import React from "react";
import WcsSetup from "../../../components/WcsClient";
import AdminNavClient from "../../../components/AdminNavClient";

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
            <div className={`${styles.adminNav} sncf-reseau root-scoped`}>
                <AdminNavClient />
            </div>
            <main className={styles.adminMain}>
                {children}
            </main>
        </body>
        </html>
    );
}
