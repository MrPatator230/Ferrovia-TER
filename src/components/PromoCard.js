"use client";
import styles from './PromoCard.module.css';

export default function PromoCard() {
  return (
    <div className={styles.promoCard}>
      {/* Image promo with overlay */}
      <div
        className={styles.imageContainer}
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?q=80&w=1400&auto=format&fit=crop')"
        }}
        aria-hidden="true"
      >
        <div className={styles.imageOverlay} />
        <div className={styles.imageTitle}>
          <div className={styles.imageTitleMain}>
            Pass Mobigo
          </div>
          <div className={styles.imageTitleSub}>
            Flex Quotidien
          </div>
        </div>
        <div className={styles.imageConditions}>*sous conditions</div>
      </div>

      {/* Content area */}
      <div className={styles.content}>
        <div className={styles.textContent}>
          <div className={styles.contentTitle}>
            Pass Mobigo Flex Quotidien : jusqu'à -80% sur votre trajet favori
          </div>
          <div className={styles.contentDescription}>
            Profitez d'un abonnement sans engagement pour économiser sur vos trajets quotidiens.
          </div>
        </div>

        <div className={styles.buttonContainer}>
          <button className={styles.ctaButton}>
            Obtenir un devis
          </button>
        </div>
      </div>
    </div>
  );
}

