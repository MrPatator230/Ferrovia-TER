"use client";
import Link from 'next/link';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Header() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [error, setError] = useState('');

    function validateNumber(v) {
        if (!v) return false;
        return /^[A-Za-z0-9-]{1,12}$/.test(String(v).trim());
    }

    function onSubmit(e) {
        if (e && e.preventDefault) e.preventDefault();
        const v = String(query || '').trim();
        if (!v) {
            setError('Entrez un numéro de train');
            return;
        }
        if (!validateNumber(v)) {
            setError('Numéro invalide');
            return;
        }
        setError('');
        router.push(`/se-deplacer/horaires/${encodeURIComponent(v)}`);
    }

    return (
        <wcs-header>
            <Link href="/" slot="logo" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <img alt="SNCF" src="/Logo site.png" style={{ cursor: 'pointer' }} />
            </Link>

            <div slot="center">
                <form onSubmit={onSubmit} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                    <wcs-form-field style={{ flex: '0.9' }}>
                        <input
                            is="wcs-input"
                            placeholder="Rechercher un numéro de train (ex: 894568)"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            aria-label="Numéro de train"
                            style={{ width: '100%' }}
                        />
                        <wcs-button
                            aria-label="Rechercher"
                            ripple="false"
                            shape="square"
                            slot="suffix"
                            onClick={onSubmit}
                        >
                            <wcs-mat-icon icon="search" />
                        </wcs-button>
                    </wcs-form-field>
                    <div style={{ minWidth: 0 }}>
                        <button type="submit" style={{ display: 'none' }} aria-hidden />
                    </div>
                </form>
                {error ? (<div style={{ color: '#b00020', marginTop: 6 }}>{error}</div>) : null}
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