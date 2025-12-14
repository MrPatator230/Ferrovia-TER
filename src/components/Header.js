"use client";
import Link from 'next/link';

export default function Header() {
    return (
        <wcs-header>
            <Link href="/" slot="logo" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <img alt="SNCF" src="/Logo site.png" style={{ cursor: 'pointer' }} />
            </Link>

            <div slot="center">
                <wcs-form-field
                    style={{
                        flex: "0.8",
                    }}>
                    <wcs-input placeholder="Rechercher" />
                    <wcs-button
                        aria-label="Rechercher"
                        ripple="false"
                        shape="square"
                        slot="suffix">
                        <wcs-mat-icon icon="search" />
                    </wcs-button>
                </wcs-form-field>
            </div>
            <div slot="actions">
                <wcs-button mode="clear">
                    <wcs-mat-icon icon="person_outline" />
                    <span>Connexion</span>
                </wcs-button>
            </div>
        </wcs-header>
    );
}