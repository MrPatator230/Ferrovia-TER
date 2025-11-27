"use client";
import styles from './SubscriptionCard.module.css';

export default function SubscriptionCard() {
  return (
    <wcs-card className={`card ${styles.subscriptionCard}`}>
      <div className={styles.content}>
        <h3 className={styles.title}>S'abonner</h3>
        <p className={styles.description}>
          Pour vos trajets quotidiens, faites des économies avec l'abonnement Pass Mobigo et profitez d'un tarif adapté à votre usage.
        </p>
      </div>

      <div className={styles.footer}>
        <button className={styles.ctaButton}>En savoir plus</button>
      </div>
    </wcs-card>
  );
}
