"use client";

export default function InfoBanner() {
  return (
    <div style={{
      backgroundColor: '#ffd200',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    }}>
      <wcs-mat-icon icon="celebration" size="m"></wcs-mat-icon>
      <span style={{ fontSize: '14px', fontWeight: '500' }}>
        Lumières de Noël de Montbéliard : la vente de billets est ouverte !
      </span>
      <span style={{ fontSize: '14px' }}>
        À partir de 6€ aller-retour c'est ici &gt;
      </span>
    </div>
  );
}

