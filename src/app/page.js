"use client";
import React from "react";
import InfoBanner from "../components/InfoBanner";
import Header from "../components/Header";
import NavigationBar from "../components/NavigationBar";
import SearchForm from "../components/SearchForm";
import TrafficInfo from "../components/TrafficInfo";
import SubscriptionCard from "../components/SubscriptionCard";
import PromoCard from "../components/PromoCard";
import NextDepartures from "../components/NextDepartures";
import PerturbationBanners from "../components/PerturbationBanners";

export default function Home() {
  return (
    <main role="main" aria-labelledby="page-title">
      {/* Bandeau d'information (WCS) */}
      <header role="banner">
        <InfoBanner />
        <Header />
        <NavigationBar />
      </header>

      {/* --- MOBILE: liste empilée des widgets --- */}
      <section aria-label="Widgets mobile" className="mobile-only mobile-section">
        <div className="mobile-container">
          {/* Rechercher un train */}
          <div className="card" role="region" aria-label="Recherche d'itinéraire (mobile)">
            <SearchForm />
          </div>

          {/* Info trafic */}
          <div>
            <TrafficInfo />
          </div>

          {/* Perturbations */}
          <div>
            <PerturbationBanners />
          </div>

          {/* S'abonner */}
          <div>
            <SubscriptionCard />
          </div>

          {/* Prochains départs */}
          <div>
            <NextDepartures />
          </div>

          {/* Actus (À la une) */}
          <section aria-label="À la une" style={{ marginTop: 0 }}>
            <h3 style={{ fontSize: '1rem', margin: '0 0 8px 0' }}>Actus</h3>
            <div className="articles-grid">
              {[
                {
                  title: 'Marché de Noel de Montbéliard : en TRAIN Mobigo à partir de 6€ aller-retour',
                  img: 'https://images.unsplash.com/photo-1549880338-65ddcdfd017b?q=80&w=800&auto=format&fit=crop',
                  cta: 'En savoir plus'
                },
                {
                  title: 'Newsletter TRAIN Mobigo : des actus, des bons plans, des idées de sortie...',
                  img: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=800&auto=format&fit=crop',
                  cta: 'Inscrivez-vous!'
                },
                {
                  title: "Une question au sujet de votre voyage en TRAIN Mobigo? Contactez-nous!",
                  img: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800&auto=format&fit=crop',
                  cta: 'En savoir plus'
                }
              ].map((card, i) => (
                <article key={i} style={{ background: '#fff', borderRadius: 8, overflow: 'hidden', border: '1px solid #e6e6e6', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ width: '100%', height: 120, backgroundImage: `url(${card.img})`, backgroundSize: 'cover', backgroundPosition: 'center' }} aria-hidden="true" />
                  <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p style={{ margin: 0, color: '#222', fontSize: 14 }}>{card.title}</p>
                    <div>
                      <button style={{ background: '#0b7d48', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>{card.cta}</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>

      {/* --- DESKTOP: sections existantes (masquées sur mobile) --- */}
      <section id="hero" aria-labelledby="page-title" className="hero desktop-only">
        <div className="hero-inner">
          <h1 id="page-title" className="hero-heading">
            Bienvenue sur le site TER Bourgogne-Franche-Comté
          </h1>

          {/* Grid: search card on the left (white), two stacked widgets on the right (separate cards) */}
          <div className="hero-grid">
            {/* Left: search card (white) */}
            <div className="hero-left">
              <div className="card" role="region" aria-label="Recherche d'itinéraire">
                <SearchForm />
              </div>
            </div>

            {/* Right: stacked widgets, each its own white card (outside the search card) */}
            <div className="hero-right" id="hero-right-widgets">
              <div className="card" style={{ padding: 0, borderRadius: 8 }}>
                <TrafficInfo />
              </div>

              <div className="card" style={{ padding: 0, borderRadius: 8 }}>
                <SubscriptionCard />
              </div>

              <div className="card" style={{ padding: 0, borderRadius: 8 }}>
                <PerturbationBanners />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Informations et services" className="desktop-only" style={{ padding: "28px 16px" }}>
        <div className="two-column" style={{ maxWidth: 1200, margin: "0 auto" }}>
          {/* Colonne principale : prochains départs */}
          <div>
            <h2 style={{ fontSize: 18, margin: "0 0 12px 0" }}>Prochains départs</h2>
            <div className="card" style={{ padding: 12 }}>
              <NextDepartures />
            </div>

            {/* petites cards supprimées */}
             <section aria-label="À la une" style={{ marginTop: 18 }}>
               <h3 style={{ fontSize: 18, margin: '0 0 12px 0' }}>À la une</h3>
               <div className="articles-grid">
                {[
                  {
                    title: 'Marché de Noel de Montbéliard : en TRAIN Mobigo à partir de 6€ aller-retour',
                    img: 'https://images.unsplash.com/photo-1549880338-65ddcdfd017b?q=80&w=800&auto=format&fit=crop',
                    cta: 'En savoir plus'
                  },
                  {
                    title: 'Newsletter TRAIN Mobigo : des actus, des bons plans, des idées de sortie...',
                    img: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=800&auto=format&fit=crop',
                    cta: 'Inscrivez-vous!'
                  },
                  {
                    title: "Une question au sujet de votre voyage en TRAIN Mobigo? Contactez-nous!",
                    img: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800&auto=format&fit=crop',
                    cta: 'En savoir plus'
                  }
                ].map((card, i) => (
                  <article key={i} style={{ background: '#fff', borderRadius: 8, overflow: 'hidden', border: '1px solid #e6e6e6', display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ width: '100%', height: 120, backgroundImage: `url(${card.img})`, backgroundSize: 'cover', backgroundPosition: 'center' }} aria-hidden="true" />
                    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                      <p style={{ margin: 0, color: '#222', fontSize: 14, textAlign: 'center' }}>{card.title}</p>
                      <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                        <button style={{ background: '#0b7d48', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>{card.cta}</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
           </div>

          {/* Colonne secondaire : promo à droite des prochains départs */}
          <aside aria-label="Info trafic et abonnement">
            <div style={{ marginBottom: 16 }}>
              <PromoCard />
            </div>
          </aside>
        </div>
      </section>

      {/* Footer simplifié */}
      <footer className="site-footer">
        <div className="footer-content">
          <div className="footer-copyright">© 2025 TER Bourgogne-Franche-Comté</div>
          <nav aria-label="Liens du pied de page" className="footer-nav">
            <button disabled className="footer-link">
              Mentions légales
            </button>
          </nav>
        </div>
      </footer>
    </main>
  );
}
