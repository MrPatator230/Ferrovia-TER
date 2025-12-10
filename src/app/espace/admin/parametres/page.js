"use client";
import React, { useState, useEffect, useRef } from 'react';
import styles from './parametres.module.css';

// NOTE: cette version utilise directement les Web Components WCS présents dans le projet
// (ex: <wcs-button>, <wcs-card>, <wcs-mat-icon>, etc.).
// Hypothèses :
// - la librairie `wcs-core` est chargée par le layout (voir src/components/WcsClient.js),
//   donc les custom elements sont disponibles côté client.
// - noms de composants WCS utilisés ici : wcs-card, wcs-textfield, wcs-file, wcs-button, wcs-mat-icon, wcs-color-picker, wcs-modal
//   Si un de ces tags n'existe pas dans votre version de wcs-core, remplacez par le tag correct.

function Tabs({ tabs, active, onChange }) {
    return (
        <div className={styles.tabs} role="tablist">
            {tabs.map((t) => (
                <wcs-button key={t} mode={active === t ? 'filled' : 'clear'} onClick={() => onChange(t)} aria-selected={active === t} role="tab">
                    {t}
                </wcs-button>
            ))}
        </div>
    );
}

function GeneralTab({ data, onChange }) {
  const nameRef = useRef(null);
  const addressRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!data) return;
    if (nameRef.current) nameRef.current.value = data.name || '';
    if (addressRef.current) addressRef.current.value = data.address || '';
  }, [data]);

  useEffect(() => {
    const n = nameRef.current;
    const a = addressRef.current;
    function handleName() { onChange && onChange({ ...data, name: n.value }); }
    function handleAddress() { onChange && onChange({ ...data, address: a.value }); }
    if (n) n.addEventListener && n.addEventListener('input', handleName);
    if (a) a.addEventListener && a.addEventListener('input', handleAddress);
    return () => {
      if (n) n.removeEventListener && n.removeEventListener('input', handleName);
      if (a) a.removeEventListener && a.removeEventListener('input', handleAddress);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    const f = fileRef.current;
    function handleFile(e) {
      const files = e && e.target && e.target.files;
      if (!files || files.length === 0) return;
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => {
        onChange && onChange({ ...data, logo_url: reader.result });
      };
      reader.readAsDataURL(file);
    }
    if (f) f.addEventListener && f.addEventListener('change', handleFile);
    return () => { if (f) f.removeEventListener && f.removeEventListener('change', handleFile); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
      <wcs-tab header="Premier onglet" item-key="firstTab">
      <h3 slot="title">Général</h3>

      <div style={{ padding: 8 }}>
        <label>Nom de l'entreprise</label>
        <wcs-input type={"text"} ref={nameRef} placeholder="Nom"></wcs-input>

        <label>Adresse</label>
        <wcs-input type={"text"} ref={addressRef} placeholder="Adresse"></wcs-input>

        <label>Logo</label>
        <wcs-input type={"file"} ref={fileRef} accept="image/*"></wcs-input>

        {data && data.logo_url && (
          <div className={styles.preview} style={{ marginTop: 8 }}>
            <img src={data.logo_url} alt="Logo" style={{ maxWidth: 160 }} />
          </div>
        )}
      </div>
    </wcs-tab>
  );
}

function ModulesTab() {
  return (
    <wcs-card class={styles.tabContent}>
      <h3 slot="title">Modules</h3>
      <div style={{ padding: 8 }}>
        <p>Liste des modules (implémentation ultérieure) — utiliser des <wcs-button mode="clear">actions</wcs-button> pour actions.</p>
      </div>
    </wcs-card>
  );
}

function TarifsTab() {
  return (
    <wcs-card class={styles.tabContent}>
      <h3 slot="title">Tarifs</h3>
      <div style={{ padding: 8 }}>
        <p>Gestion des tarifs (billets & abonnements) — à implémenter</p>
      </div>
    </wcs-card>
  );
}

function TypesTrainsTab({ onCreate, items = [] }) {
  const nameRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    const n = nameRef.current;
    if (!n) return;
    function handleInput() {}
    if (n) n.addEventListener && n.addEventListener('input', handleInput);
    return () => { if (n) n.removeEventListener && n.removeEventListener('input', handleInput); };
  }, []);

  function handleCreate() {
    const n = nameRef.current && nameRef.current.value;
    // read file if present
    const files = fileRef.current && fileRef.current.files;
    if (!n) return alert('Nom requis');
    if (files && files.length > 0) {
      const fr = new FileReader();
      fr.onload = () => onCreate && onCreate({ name: n, image: fr.result });
      fr.readAsDataURL(files[0]);
    } else {
      onCreate && onCreate({ name: n });
    }
    if (nameRef.current) nameRef.current.value = '';
    if (fileRef.current) fileRef.current.value = null;
  }

  return (
    <wcs-card class={styles.tabContent}>
      <h3 slot="title">Types de trains</h3>
      <div style={{ padding: 8 }}>
        <label>Nom du type de train</label>
        <wcs-textfield ref={nameRef} placeholder="Ex: TER 2N" />

        <label>Image</label>
        <wcs-file ref={fileRef} accept="image/*" />

        <div style={{ marginTop: 12 }}>
          <wcs-button onClick={handleCreate}>Créer</wcs-button>
        </div>

        <div style={{ marginTop: 12 }}>
          {items.length ? items.map((it, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
              <div style={{ flex: 1 }}><strong>{it.name}</strong></div>
              {it.image && <img src={it.image} alt={it.name} style={{ width: 80 }} />}
            </div>
          )) : <p>Aucun type</p>}
        </div>
      </div>
    </wcs-card>
  );
}

function CouleursTab({ data, onChange }) {
  const primaryRef = useRef(null);
  const headerRef = useRef(null);

  useEffect(() => {
    if (!data) return;
    if (primaryRef.current) primaryRef.current.value = data.primary || '#0b7d48';
    if (headerRef.current) headerRef.current.value = data.header || '#0b7d48';
  }, [data]);

  useEffect(() => {
    const p = primaryRef.current;
    const h = headerRef.current;
    function onP() { onChange && onChange({ ...data, primary: p.value }); }
    function onH() { onChange && onChange({ ...data, header: h.value }); }
    if (p) p.addEventListener && p.addEventListener('input', onP);
    if (h) h.addEventListener && h.addEventListener('input', onH);
    return () => {
      if (p) p.removeEventListener && p.removeEventListener('input', onP);
      if (h) h.removeEventListener && h.removeEventListener('input', onH);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <wcs-card class={styles.tabContent}>
      <h3 slot="title">Couleurs</h3>
      <div style={{ padding: 8 }}>
        <label>Couleur principale</label>
        <wcs-color-picker ref={primaryRef} value={data?.primary || '#0b7d48'}></wcs-color-picker>

        <label>Couleur header</label>
        <wcs-color-picker ref={headerRef} value={data?.header || '#0b7d48'}></wcs-color-picker>
      </div>
    </wcs-card>
  );
}

export default function ParametresPage() {
  const tabs = ['Général', 'Modules', 'Tarifs', 'Types de trains', 'Couleurs'];
  const [active, setActive] = useState(tabs[0]);
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/parametres')
      .then(r => r.json())
      .then(j => setConfig(j || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleChange(partial) {
    setConfig(prev => ({ ...prev, ...partial }));
  }

  function handleCreateTypeTrain(obj) {
    const existing = config.types_trains || [];
    const updated = { ...config, types_trains: [...existing, obj] };
    setConfig(updated);
    fetch('/api/admin/parametres', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
  }

  function handleSave() {
    fetch('/api/admin/parametres', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) })
      .then(() => {
        // show simple confirmation
        const el = document.createElement('wcs-snackbar');
        el.textContent = 'Paramètres sauvegardés';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3000);
      });
  }

  return (
    <div className={styles.container}>
      <h1>Paramètres</h1>

      {loading ? <wcs-progress indeterminate></wcs-progress> : null}

      <Tabs tabs={tabs} active={active} onChange={setActive} />

      <div className={styles.panel}>
        {active === 'Général' && <GeneralTab data={config.general || {}} onChange={(d) => handleChange({ general: d })} />}
        {active === 'Modules' && <ModulesTab />}
        {active === 'Tarifs' && <TarifsTab />}
        {active === 'Types de trains' && <TypesTrainsTab items={config.types_trains || []} onCreate={handleCreateTypeTrain} />}
        {active === 'Couleurs' && <CouleursTab data={config.couleurs || {}} onChange={(d) => handleChange({ couleurs: d })} />}
      </div>

      <div style={{ marginTop: 16 }}>
        <wcs-button onClick={handleSave} mode="filled">Sauvegarder</wcs-button>
      </div>
    </div>
  );
}
