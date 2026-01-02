"use client";
import React, { useState, useEffect } from 'react';
import styles from '../gares.module.css';

export default function StationForm({ editStation, onClose, onSuccess }) {
  // `editStation` fourni via props (utilisé dans useEffect)
  const submitBtnRef = React.useRef(null);
  const formRef = React.useRef(null);
  const nomRef = React.useRef(null);
  const typeRef = React.useRef(null);
  const quaiNomRef = React.useRef(null);
  const quaiDistanceRef = React.useRef(null);

  const [nom, setNom] = useState('');
  const [typeGare, setTypeGare] = useState('ville');
  const [services, setServices] = useState([]);
  const [quais, setQuais] = useState([]);
  const [transportsCommun, setTransportsCommun] = useState([]);
  const [code, setCode] = useState('');
  const [correspondanceField, setCorrespondanceField] = useState(''); // chaîne CSV/textarea
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // champs temporaires
  const [quaiNom, setQuaiNom] = useState('');
  const [quaiDistance, setQuaiDistance] = useState('');
  const [transportType, setTransportType] = useState('bus');
  const [transportCouleur, setTransportCouleur] = useState('#0b7d48');

  const servicesDisponibles = ['TER', 'TGV', 'Intercités', 'Fret'];
  const transportsDisponibles = [
    { type: 'bus', label: 'Bus' },
    { type: 'tram', label: 'Tramway' },
    { type: 'metro', label: 'Métro' },
    { type: 'train', label: 'Train' },
    { type: 'tramtrain', label: 'Tram-train' }
  ];

  useEffect(() => {
    console.log('[StationForm] mounted or editStation changed', { editStation });
    if (editStation) {
      setNom(editStation.nom || '');
      setTypeGare(editStation.type_gare || 'ville');
      setCode(editStation.code || '');
      // correspondance peut venir en tableau ou string
      if (Array.isArray(editStation.correspondance)) {
        setCorrespondanceField(editStation.correspondance.join(', '));
      } else if (typeof editStation.correspondance === 'string') {
        setCorrespondanceField(editStation.correspondance);
      } else {
        setCorrespondanceField('');
      }
      setServices(editStation.service || []);
      setQuais(editStation.quais || []);
      setTransportsCommun(editStation.transports_commun || []);
      console.log('[StationForm] init transportsCommun from editStation:', editStation.transports_commun);
      setQuaiNom('');
      setQuaiDistance('');
      setTransportType('bus');
      setTransportCouleur('#0b7d48');
      setMessage(null);

      // Synchroniser les webcomponents DOM si présents
      setTimeout(() => {
        if (nomRef.current) nomRef.current.value = editStation.nom || '';
        if (typeRef.current) typeRef.current.value = editStation.type_gare || 'ville';
        // code field - si un wcs-input existe, le mettre à jour
        const codeNode = formRef.current.querySelector('wcs-input[data-field="code"]');
        if (codeNode) codeNode.value = editStation.code || '';
        // checkbox services
        if (formRef.current) {
          servicesDisponibles.forEach(svc => {
            const node = formRef.current.querySelector(`wcs-checkbox[data-service=\"${svc}\"]`);
            if (node) node.checked = (editStation.service || []).includes(svc);
          });
        }
      }, 0);
    } else {
      resetForm();
    }
  }, [editStation]);

  // Attache un seul listener sur le formulaire pour capter les événements des webcomponents
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const onWcsChange = (e) => {
      const target = e.target;
      // Nom
      if (target && target.matches && target.matches('wcs-input[data-field="nom"]')) {
        setNom(target.value || '');
      }
      // Code
      if (target && target.matches && target.matches('wcs-input[data-field="code"]')) {
        setCode((target.value || '').toUpperCase());
      }
      // Type
      if (target && target.matches && target.matches('wcs-select[data-field="type"]')) {
        setTypeGare(target.value || 'ville');
      }
      // Quai nom / distance champs temporaires
      if (target && target.matches && target.matches('wcs-input[data-field="quai-nom"]')) {
        setQuaiNom(target.value || '');
      }
      if (target && target.matches && target.matches('wcs-input[data-field="quai-distance"]')) {
        setQuaiDistance(target.value || '');
      }
      // Transport type / couleur
      if (target && target.matches && target.matches('wcs-select[data-field="transport-type"]')) {
        setTransportType(target.value || 'bus');
      }
      if (target && target.matches && target.matches('wcs-input[data-field="transport-couleur"]')) {
        setTransportCouleur(target.value || '#0b7d48');
      }

      // Services (checkboxes) - on lit l'état de toutes les checkboxes
      if (target && (target.matches('wcs-checkbox') || target.matches('wcs-checkbox[data-service]'))) {
        const nodes = form.querySelectorAll('wcs-checkbox[data-service]');
        const selected = Array.from(nodes).filter(n => n.checked).map(n => n.getAttribute('data-service'));
        setServices(selected);
      }
    };

    // Certains webcomponents peuvent émettre 'wcsChange' ou 'change' — on gère les deux
    form.addEventListener('wcsChange', onWcsChange);
    form.addEventListener('change', onWcsChange);

    return () => {
      form.removeEventListener('wcsChange', onWcsChange);
      form.removeEventListener('change', onWcsChange);
    };
  }, [formRef.current]);

  function resetForm() {
    setNom('');
    setTypeGare('ville');
    setServices([]);
    setQuais([]);
    setTransportsCommun([]);
    setCode('');
    setCorrespondanceField('');
    setQuaiNom('');
    setQuaiDistance('');
    setTransportType('bus');
    setTransportCouleur('#0b7d48');
    setMessage(null);

    // Reset DOM inputs si présents
    setTimeout(() => {
      if (nomRef.current) nomRef.current.value = '';
      if (typeRef.current) typeRef.current.value = 'ville';
      if (quaiNomRef.current) quaiNomRef.current.value = '';
      if (quaiDistanceRef.current) quaiDistanceRef.current.value = '';
      const codeNode = formRef.current && formRef.current.querySelector('wcs-input[data-field="code"]');
      if (codeNode) codeNode.value = '';
      const corrNode = formRef.current && formRef.current.querySelector('textarea[data-field="correspondance"]');
      if (corrNode) corrNode.value = '';
      // transportType & transportCouleur sont des states contrôlés — mis à jour ci-dessus
      if (formRef.current) {
        const nodes = formRef.current.querySelectorAll('wcs-checkbox[data-service]');
        nodes.forEach(n => n.checked = false);
      }
    }, 0);
  }

  function handleServiceToggle(service) {
    // gardons une version locale mais la source de vérité est le DOM via le listener
    if (services.includes(service)) {
      setServices(services.filter(s => s !== service));
    } else {
      setServices([...services, service]);
    }
  }

  function handleAddQuai() {
    // Lire depuis le DOM si les states temporaires ne sont pas à jour
    const nomVal = quaiNomRef.current ? quaiNomRef.current.value : quaiNom;
    const distVal = quaiDistanceRef.current ? quaiDistanceRef.current.value : quaiDistance;

    if (!nomVal || !distVal) {
      setMessage('Veuillez remplir le nom et la distance du quai');
      return;
    }
    setQuais([...quais, { nom: nomVal, distance: Number(distVal) }]);
    // reset DOM inputs
    if (quaiNomRef.current) quaiNomRef.current.value = '';
    if (quaiDistanceRef.current) quaiDistanceRef.current.value = '';
    setQuaiNom('');
    setQuaiDistance('');
    setMessage(null);
  }

  function handleRemoveQuai(index) {
    setQuais(quais.filter((_, i) => i !== index));
  }

  function handleAddTransport() {
    // Utiliser les states contrôlés pour créer le transport
    const typeVal = transportType;
    const couleurVal = transportCouleur;
    const t = { type: typeVal, couleur: typeVal === 'train' ? null : couleurVal };
    setTransportsCommun(prev => [...prev, t]);
  }

  function handleRemoveTransport(index) {
    setTransportsCommun(prev => prev.filter((_, i) => i !== index));
  }

  // tracer les changements d'état pour debug
  useEffect(() => {
    console.log('[StationForm] transportsCommun state updated:', transportsCommun);
  }, [transportsCommun]);

  async function handleSubmit(e) {
    e && e.preventDefault && e.preventDefault();
    setMessage(null);

    // Lire valeurs depuis le DOM si l'état React est vide (robustesse)
    const form = formRef.current;
    const nomVal = (nom || (form && form.querySelector('wcs-input[data-field="nom"]')?.value)) || '';
    const typeVal = (typeGare || (form && form.querySelector('wcs-select[data-field="type"]')?.value)) || 'ville';
    const codeVal = (code || (form && form.querySelector('wcs-input[data-field="code"]')?.value) || '').toUpperCase();
    const corrValRaw = (correspondanceField || (form && form.querySelector('textarea[data-field="correspondance"]')?.value) || '');
    const corrVal = corrValRaw.split(',').map(s => s.trim()).filter(Boolean);
    const servicesNodes = form ? Array.from(form.querySelectorAll('wcs-checkbox[data-service]')) : [];
    const servicesVal = services.length > 0 ? services : servicesNodes.filter(n => n.checked).map(n => n.getAttribute('data-service'));

    console.log('[StationForm] handleSubmit invoked', { nom: nomVal, typeVal, servicesVal, quais, transportsCommun });

    if (!nomVal || !typeVal) {
      setMessage('Le nom et le type de gare sont requis');
      return;
    }
    // Validation du code: si fourni, doit être 3 lettres
    if (codeVal && !/^[A-Z]{3}$/.test(codeVal)) {
      setMessage('Le champ Code doit être composé de 3 lettres (A-Z)');
      setLoading(false);
      return;
    }
    if (!servicesVal || servicesVal.length === 0) {
      setMessage('Veuillez sélectionner au moins un service');
      return;
    }

    setLoading(true);
    // Utiliser prioritairement le `code` de la gare (original) comme identifiant
    // fallback : id numérique ou _id
    const originalIdentifier = editStation && (editStation.code || editStation.id || editStation._id);
    const isEditing = Boolean(originalIdentifier);

    try {
      // Normaliser les transports pour s'assurer d'envoyer un tableau d'objets { type, couleur }
      const normalizedTransports = Array.isArray(transportsCommun) ? transportsCommun.map(t => {
        if (!t) return null;
        if (typeof t === 'string') return { type: t, couleur: null };
        return { type: String(t.type || ''), couleur: (typeof t.couleur === 'undefined' ? null : t.couleur) };
      }).filter(Boolean) : [];

      const payload = {
        nom: nomVal,
        type_gare: typeVal,
        service: servicesVal,
        quais,
        transports_commun: normalizedTransports,
        code: codeVal || null,
        correspondance: corrVal
      };

      // DEBUG: log complet du payload JSON envoyé
      try {
        console.log('[StationForm] payload JSON:', JSON.stringify(payload));
      } catch (e) {
        console.log('[StationForm] payload (non-serializable):', payload);
      }

      const url = isEditing ? `/api/admin/stations/${originalIdentifier}` : '/api/admin/stations';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Lire la réponse comme texte d'abord (plus tolérant), puis tenter JSON
      const resText = await res.text();
      let resData = null;
      try { resData = resText ? JSON.parse(resText) : null; } catch (e) { resData = resText; }
      console.log('[StationForm] fetch response', { status: res.status, data: resData });

      if (!res.ok) {
        // si resData est un objet et contient .error, l'afficher
        const errMsg = (resData && typeof resData === 'object' && resData.error) ? resData.error : 'Erreur lors de l\'enregistrement';
        setMessage(errMsg);
      } else {
        setMessage(isEditing ? 'Gare modifiée avec succès' : 'Gare créée avec succès');
        resetForm();
        if (onSuccess) onSuccess(resData);
        setTimeout(() => { if (onClose) onClose(); }, 800);
      }
    } catch (err) {
      console.error(err);
      setMessage('Erreur lors de l\'enregistrement de la gare');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteStation() {
    // utiliser prioritairement le code pour la suppression également
    const idToDelete = editStation && (editStation.code || editStation.id || editStation._id);
    if (!editStation || !idToDelete) return;
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la gare "${editStation.nom}" ?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stations/${idToDelete}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage(err.error || 'Erreur lors de la suppression');
      } else {
        setMessage('Gare supprimée avec succès');
        if (onSuccess) onSuccess();
        setTimeout(() => { if (onClose) onClose(); }, 600);
      }
    } catch (err) {
      console.error('Erreur suppression gare:', err);
      setMessage('Erreur lors de la suppression de la gare');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }} style={{ padding: '1rem', boxSizing: 'border-box' }}>
      {/* debug visible element */}
      <div id="stationform-debug" style={{ padding: 8, background: '#eef6f1', color: '#0b7d48', borderRadius: 4, marginBottom: 12 }}>
        Formulaire gares : initialisé — si vous ne voyez que ce bloc, les composants WCS posent problème.
      </div>

      {message && (
        <wcs-message show type={message.includes('succès') ? 'success' : 'error'} style={{ marginBottom: '1rem' }}>
          {message}
        </wcs-message>
      )}

      {/* Nom */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Nom de la gare <span style={{ color: 'red' }}>*</span></label>
        <wcs-input data-field="nom" ref={nomRef} placeholder="Ex: Dijon-Ville" value={nom} />
      </div>

      {/* Type */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Type de gare <span style={{ color: 'red' }}>*</span></label>
        <wcs-select data-field="type" ref={typeRef} value={typeGare}>
          <wcs-select-option value="ville">Gare de ville (30 min avant départ)</wcs-select-option>
          <wcs-select-option value="interurbaine">Gare interurbaine (12h avant départ)</wcs-select-option>
        </wcs-select>
      </div>

      {/* Code */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Code (3 lettres)</label>
        <wcs-input data-field="code" placeholder="Ex: DGV" value={code} onInput={(e) => setCode((e.target.value || '').toUpperCase())} />
      </div>

      {/* Correspondance */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Correspondances (séparées par des virgules)</label>
        <textarea data-field="correspondance" placeholder="Ex: LIGNE1, LIGNE2" value={correspondanceField} onChange={(e) => setCorrespondanceField(e.target.value)} style={{ width: '100%', minHeight: 80 }} />
      </div>

      {/* Services */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Services <span style={{ color: 'red' }}>*</span></label>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {servicesDisponibles.map(s => (
            <wcs-checkbox key={s} data-service={s} checked={services.includes(s)}>
              {s}
            </wcs-checkbox>
          ))}
        </div>
      </div>

      {/* Quais */}
      <div className={styles.formSection}>
        <label className={styles.formLabel}>Quais</label>
        <div className={styles.dynamicList}>
          {quais.map((q, idx) => (
            <div key={idx} className={styles.listItem}>
              <wcs-input value={q.nom} disabled style={{ flex: 1 }} />
              <wcs-input value={`${q.distance} m`} disabled style={{ flex: 1 }} />
              <wcs-button mode="clear" shape="small" onClick={() => handleRemoveQuai(idx)} type="button">
                <wcs-mat-icon icon="delete" />
              </wcs-button>
            </div>
          ))}

          <div className={styles.listItem}>
            <wcs-input data-field="quai-nom" ref={quaiNomRef} placeholder="Nom du quai" value={quaiNom} style={{ flex: 1 }} />
            <wcs-input data-field="quai-distance" ref={quaiDistanceRef} type="number" placeholder="Distance (m)" value={quaiDistance} style={{ flex: 1 }} />
            <wcs-button mode="clear" shape="small" onClick={handleAddQuai} type="button"><wcs-mat-icon icon="add" /></wcs-button>
          </div>
        </div>
      </div>

      {/* Transports */}
      <div className={styles.formSection}>
        <label className={styles.formLabel}>Transports en commun</label>
        <div className={styles.dynamicList}>
          {transportsCommun.map((t, idx) => (
            <div key={idx} className={styles.listItem}>
              <wcs-badge style={{ backgroundColor: t.couleur || '#0b7d48', color: 'white', flex: 1 }}>
                {t.type === 'train' ? (<wcs-mat-icon icon="train" />) : null}
                {t.type}
              </wcs-badge>
              <wcs-button mode="clear" shape="small" onClick={() => handleRemoveTransport(idx)} type="button"><wcs-mat-icon icon="delete" /></wcs-button>
            </div>
          ))}

          <div className={styles.listItem}>
            {/* Utiliser des contrôles natifs pour fiabilité */}
            <select data-field="transport-type" value={transportType} onChange={(e) => setTransportType(e.target.value)} style={{ flex: 1 }}>
              {transportsDisponibles.map(t => (
                <option key={t.type} value={t.type}>{t.label}</option>
              ))}
            </select>
            {transportType !== 'train' && (
              <input data-field="transport-couleur" type="color" value={transportCouleur} onChange={(e) => setTransportCouleur(e.target.value)} style={{ width: '64px' }} />
            )}
            <button type="button" onClick={handleAddTransport} style={{ marginLeft: 8 }} aria-label="Ajouter transport">+</button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
        <wcs-button mode="clear" onClick={onClose} type="button" disabled={loading}>Annuler</wcs-button>
        {(editStation && (editStation.id || editStation._id)) && (
          <wcs-button mode="danger" type="button" onClick={handleDeleteStation} disabled={loading}>
            Supprimer
          </wcs-button>
        )}
        {/* On retire le listener natif pour éviter une soumission native du formulaire
        qui enverrait du form-encoded. On utilisera un bouton type="button" et
        onClick pour déclencher handleSubmit et envoyer du JSON via fetch. */}
        <wcs-button ref={submitBtnRef} type="button" disabled={loading} onClick={(e) => { e && e.preventDefault && e.preventDefault(); handleSubmit(e); }}>
          {loading ? 'Enregistrement...' : (editStation ? 'Modifier' : 'Créer')}
        </wcs-button>
      </div>
    </form>
  );
}
