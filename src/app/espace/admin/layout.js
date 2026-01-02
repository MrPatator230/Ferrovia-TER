import "wcs-core/design-tokens/dist/sncf-reseau.css";
import "wcs-core/design-tokens/dist/sncf-reseau-root-scoped.css";
import styles from "./admin.module.css";

import React from "react";
import AdminNavClient from "../../../components/AdminNavClient";

export default function AdminLayout({ children }) {
    return (
        <div className={styles.adminContainer}>
            <div className={`${styles.adminNav} sncf-reseau root-scoped`}>
                <AdminNavClient />
            </div>
            <main className={styles.adminMain}>
                {children}
            </main>
        </div>
    );
}
