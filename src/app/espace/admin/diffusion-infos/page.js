"use client";

import { useState, useRef, useEffect } from 'react';
import styles from './diffusion.module.css';
import dynamic from 'next/dynamic';
// importer Quill client dynamiquement
const QuillEditorClient = dynamic(() => import('../../../../components/QuillEditorClient'), { ssr: false });

export default function DiffusionInfos() {
  // États pour les infos trafic
  const [infosTraffic, setInfosTraffic] = useState([]);

  // États pour les actus
  const [actus, setActus] = useState([]);

  // États pour les événements
  const [evenements, setEvenements] = useState([]);

  // États pour les modales
  const [editingItem, setEditingItem] = useState(null);

  // ref pour la modal info trafic (Web Component) — on contrôle son attribut `show`
  const infoModalRef = useRef(null);

  // Refs pour les formulaires
  const infoFormRef = useRef(null);
  const actuFormRef = useRef(null);
  const eventFormRef = useRef(null);
  // Refs pour l'éditeur riche de la description (modale info trafic)
  const hiddenDescriptionRef = useRef(null);
  const hiddenTitreRef = useRef(null);
  const [descriptionValue, setDescriptionValue] = useState('');
  const [titreValue, setTitreValue] = useState('');
  const [mounted, setMounted] = useState(false);

  // États pour la modale actualités
  const [actuDescriptionValue, setActuDescriptionValue] = useState('');
  const [piecesJointes, setPiecesJointes] = useState([]);
  const actuModalRef = useRef(null);
  const hiddenActuDescriptionRef = useRef(null);

  // États pour la modale événements
  const [eventDescriptionValue, setEventDescriptionValue] = useState('');
  const eventModalRef = useRef(null);
  const hiddenEventDescriptionRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  // charger les infos trafic depuis l'API au montage
  useEffect(() => {
    async function fetchInfos() {
      try {
        console.log('[InfosTraffic] Fetching data from API...');
        const res = await fetch('/api/admin/infos-trafic');
        console.log('[InfosTraffic] API response status:', res.status);

        if (!res.ok) {
          console.error('Failed to load infos trafic', res.status);
          const errorText = await res.text();
          console.error('Error response:', errorText);
          return;
        }

        const data = await res.json();
        console.log('[InfosTraffic] Raw data from API:', data);

        if (Array.isArray(data)) {
          const normalized = data.map(normalizeInfo);
          console.log('[InfosTraffic] Normalized data:', normalized);
          setInfosTraffic(normalized);
        } else {
          console.error('[InfosTraffic] Data is not an array:', data);
        }
      } catch (e) {
        console.error('Error fetching infos trafic', e);
      }
    }
    fetchInfos();
  }, []);

  // charger les actualités depuis l'API au montage
  useEffect(() => {
    async function fetchActus() {
      try {
        console.log('[Actualites] Fetching data from API...');
        const res = await fetch('/api/admin/actualites');
        console.log('[Actualites] API response status:', res.status);

        if (!res.ok) {
          console.error('Failed to load actualites', res.status);
          const errorText = await res.text();
          console.error('Error response:', errorText);
          return;
        }

        const data = await res.json();
        console.log('[Actualites] Raw data from API:', data);

        if (Array.isArray(data)) {
          console.log('[Actualites] Loaded actualites:', data);
          setActus(data);
        } else {
          console.error('[Actualites] Data is not an array:', data);
        }
      } catch (e) {
        console.error('Error fetching actualites', e);
      }
    }
    fetchActus();
  }, []);

  // charger les événements depuis l'API au montage
  useEffect(() => {
    async function fetchEvents() {
      try {
        console.log('[Evenements] Fetching data from API...');
        const res = await fetch('/api/admin/evenements');
        console.log('[Evenements] API response status:', res.status);

        if (!res.ok) {
          console.error('Failed to load evenements', res.status);
          const errorText = await res.text();
          console.error('Error response:', errorText);
          return;
        }

        const data = await res.json();
        console.log('[Evenements] Raw data from API:', data);

        if (Array.isArray(data)) {
          console.log('[Evenements] Loaded evenements:', data);
          setEvenements(data);
        } else {
          console.error('[Evenements] Data is not an array:', data);
        }
      } catch (e) {
        console.error('Error fetching evenements', e);
      }
    }
    fetchEvents();
  }, []);

  // Normaliser un enregistrement provenant de la BDD en shape utilisée côté client
  function formatDateForClient(raw) {
    if (!raw && raw !== 0) return '';
    // Si c'est un objet Date
    if (raw instanceof Date) return raw.toISOString().slice(0, 10);
    // Si c'est une chaîne
    if (typeof raw === 'string') {
      // couper le time si présent
      const idx = raw.indexOf('T');
      if (idx !== -1) return raw.slice(0, idx);
      return raw;
    }
    return String(raw);
  }

  // Formater une date (ISO YYYY-MM-DD ou Date) en chaîne lisible pour l'UI (ex. '4 déc. 2025')
  function formatDateForUI(raw) {
    const iso = formatDateForClient(raw);
    if (!iso) return '—';
    // construire un objet Date sûr (ajouter timezone neutre)
    const d = new Date(iso + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  }

  function normalizeInfo(row) {
    if (!row) return row;
    // Avec dateStrings: true, les dates sont déjà des chaînes YYYY-MM-DD ou null
    const dDebut = row.date_debut || null;
    const dFin = row.date_fin || null;
    return {
      id: row.id,
      titre: row.titre,
      description: row.description,
      type: row.type,
      dateDebut: dDebut,
      dateFin: dFin,
      displayDateDebut: dDebut,
      displayDateFin: dFin,
      // inclure d'autres champs bruts si besoin
      raw: row
    };
  }



  // Helper pour appliquer une valeur à un élément WCS/custom element de façon robuste
  function applyToWcsElement(el, { value, checked } = {}) {
    if (!el) return;
    try {
      if (typeof value !== 'undefined') {
        try { el.value = value; } catch(e) {}
        try { el.setAttribute && el.setAttribute('value', String(value)); } catch(e) {}
      }
      if (typeof checked !== 'undefined') {
        try { el.checked = Boolean(checked); } catch(e) {}
        try { if (Boolean(checked)) el.setAttribute && el.setAttribute('checked', ''); else el.removeAttribute && el.removeAttribute('checked'); } catch(e) {}
      }
      try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch(e) {}
      try { el.dispatchEvent(new CustomEvent('wcsChange', { bubbles: true })); } catch(e) {}
    } catch (err) { /* ignore */ }
  }

  // Ouvrir la modale d'info trafic
  const openInfoModal = (info = null) => {
    setEditingItem(info);
    // initialiser la valeur de description pour l'éditeur Quill
    setDescriptionValue(info?.description || '');
    // initialiser la valeur du titre pour le wcs-input contrôlé
    setTitreValue(info?.titre || '');
    // afficher la modal WCS en ajoutant l'attribut show
    if (infoModalRef.current) infoModalRef.current.setAttribute('show', '');

    // Synchroniser immédiatement le DOM des webcomponents du formulaire (titre, type, dates)
    // utiliser setTimeout 0 pour attendre que le modal soit rendu dans le DOM
    setTimeout(() => {
      const form = infoFormRef.current;
      if (!form) return;
      try {
        // Synchroniser les web components et inputs natifs
        const titreEl = form.querySelector('[name="titre"]');
        const typeEl = form.querySelector('[name="type"]');
        const dateDebutEl = form.querySelector('[name="dateDebut"]');
        const dateFinEl = form.querySelector('[name="dateFin"]');

        // Pour les web components (titre et type)
        applyToWcsElement(titreEl, { value: info?.titre || '' });
        applyToWcsElement(typeEl, { value: info?.type || 'information' });

        // Pour les inputs natifs (dates) - assignation directe
        if (dateDebutEl && dateDebutEl.tagName === 'INPUT') {
          dateDebutEl.value = info?.dateDebut || '';
        }
        if (dateFinEl && dateFinEl.tagName === 'INPUT') {
          dateFinEl.value = info?.dateFin || '';
        }

        // hidden fields
        if (hiddenDescriptionRef.current) hiddenDescriptionRef.current.value = info?.description || '';
        if (hiddenTitreRef.current) hiddenTitreRef.current.value = info?.titre || '';
      } catch (e) { console.error('Sync modal fields failed', e); }
    }, 0);
  };

  const closeInfoModal = () => {
    // masquer la modal WCS en enlevant l'attribut show
    if (infoModalRef.current) infoModalRef.current.removeAttribute('show');
    setEditingItem(null);
    setDescriptionValue('');
    setTitreValue('');
  };

  // Synchroniser l'éditeur riche lorsque la modale s'ouvre / editingItem change
  // Note: on initialise descriptionValue depuis openInfoModal ; garder hiddenDescriptionRef sync
  useEffect(() => {
    if (hiddenDescriptionRef.current) hiddenDescriptionRef.current.value = descriptionValue;
  }, [descriptionValue]);

  // Gestion des infos trafic
  const saveInfoTraffic = async (e) => {
    e.preventDefault();
    // s'assurer que la description Quill est injectée dans un champ caché
    if (hiddenDescriptionRef.current) hiddenDescriptionRef.current.value = descriptionValue;
    // s'assurer que le titre est présent dans un champ caché pour les webcomponents
    if (hiddenTitreRef.current) hiddenTitreRef.current.value = titreValue || '';
    const form = e.target;
    // Certains composants WCS sont des webcomponents — FormData peut ne pas toujours lire leurs valeurs.
    // On récupère d'abord via querySelector (accès direct .value), puis on utilise FormData en fallback.
    const formData = new FormData(form);
    const getField = (name) => {
      // D'abord essayer FormData (le plus simple et fiable)
      const formDataValue = formData.get(name);
      if (formDataValue && formDataValue !== '') {
        return formDataValue;
      }

      // Ensuite essayer de trouver l'élément directement
      const el = form.querySelector(`[name="${name}"]`);
      if (el && el.value !== undefined && el.value !== null && String(el.value).trim() !== '') {
        return el.value;
      }

      // Pour les web components, essayer l'accès shadow DOM
      if (el && el.shadowRoot) {
        try {
          const inner = el.shadowRoot.querySelector('input,textarea,select');
          if (inner && inner.value !== undefined && inner.value !== null && String(inner.value).trim() !== '') {
            return inner.value;
          }
        } catch (e) {
          console.warn(`Erreur lors de l'accès au shadowRoot pour ${name}:`, e);
        }
      }

      return '';
    };

    // Debug: vérifier les valeurs des dates récupérées
    const dateDebutValue = getField('dateDebut');
    const dateFinValue = getField('dateFin');
    console.log('[DEBUG saveInfoTraffic] dateDebut récupérée:', dateDebutValue, 'type:', typeof dateDebutValue);
    console.log('[DEBUG saveInfoTraffic] dateFin récupérée:', dateFinValue, 'type:', typeof dateFinValue);

    const payload = {
      titre: (titreValue || getField('titre') || '').toString(),
      description: (getField('description') || descriptionValue || '').toString(),
      type: (getField('type') || 'information').toString(),
      dateDebut: dateDebutValue || null,
      dateFin: dateFinValue || null
    };

    console.log('[DEBUG saveInfoTraffic] Payload final:', payload);

    // DEBUG: afficher les différentes sources possibles du titre
    try {
      const titreEl = (form && form.querySelector && form.querySelector('[name="titre"]')) || document.querySelector('[name="titre"]');
      const inner = titreEl && (titreEl.shadowRoot ? titreEl.shadowRoot.querySelector('input,textarea') : titreEl.querySelector && titreEl.querySelector('input,textarea'));
      console.debug('[DEBUG InfosTraffic] titreValue:', titreValue, 'getField(titre):', getField('titre'), 'titreEl:', titreEl, 'titreEl.value:', titreEl && titreEl.value, 'inner.value:', inner && inner.value);
    } catch (e) { console.debug('[DEBUG InfosTraffic] debug titre failed', e); }

    // Validation locale minimale
    if (!payload.titre || payload.titre.trim().length === 0) {
      alert('Le titre est requis.');
      return;
    }

    try {
      console.debug('[InfosTraffic] Envoi payload:', payload);
      let res;
      if (editingItem && editingItem.id) {
        // modifier
        res = await fetch('/api/admin/infos-trafic', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingItem.id, ...payload })
        });
      } else {
        // création
        res = await fetch('/api/admin/infos-trafic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const text = await res.text();
        let parsed = text;
        try { parsed = JSON.parse(text); } catch (_) {}
        console.error('[InfosTraffic] API returned error', res.status, parsed, payload);
        alert('Erreur API ' + res.status + ': ' + (parsed?.error || text));
        return;
      }

      const createdOrUpdated = await res.json();
      // Normaliser les dates/shape renvoyées par l'API avant d'insérer dans le state
      const normalized = normalizeInfo(createdOrUpdated);
      if (editingItem && editingItem.id) {
        setInfosTraffic(prev => prev.map(i => i.id === normalized.id ? normalized : i));
      } else {
        setInfosTraffic(prev => [normalized, ...prev]);
      }
      closeInfoModal();
    } catch (err) {
      console.error('Impossible d\'enregistrer en base :', err);
      alert('Une erreur est survenue lors de la sauvegarde.');
    }
  };

  const deleteInfoTraffic = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette info trafic ?')) return;
    try {
      const res = await fetch(`/api/admin/infos-trafic?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const text = await res.text();
        let parsed = text;
        try { parsed = JSON.parse(text); } catch (_) {}
        console.error('Erreur suppression info trafic', res.status, parsed);
        alert('Erreur suppression: ' + (parsed?.error || text));
        return;
      }
      setInfosTraffic(prev => prev.filter(i => i.id !== id));
    } catch (e) {
      console.error('Impossible de supprimer en base', e);
      alert('Erreur lors de la suppression');
    }
  };

  // Gestion des actus
  const openActuModal = (actu = null) => {
    setEditingItem(actu);
    setActuDescriptionValue(actu?.description || '');
    setPiecesJointes(actu?.pieces_jointes || []);

    // afficher la modal WCS en ajoutant l'attribut show
    if (actuModalRef.current) actuModalRef.current.setAttribute('show', '');

    // Synchroniser les champs après le rendu
    setTimeout(() => {
      const form = actuFormRef.current;
      if (!form) return;
      try {
        const titreEl = form.querySelector('[name="titre"]');
        const resumeEl = form.querySelector('[name="resume"]');
        const imageCouvertureEl = form.querySelector('[name="imageCouverture"]');
        const datePublicationEl = form.querySelector('[name="datePublication"]');

        // Pour les inputs natifs
        if (titreEl && titreEl.tagName === 'INPUT') {
          titreEl.value = actu?.titre || '';
        }
        if (resumeEl && resumeEl.tagName === 'INPUT') {
          resumeEl.value = actu?.resume || '';
        }
        if (imageCouvertureEl && imageCouvertureEl.tagName === 'INPUT') {
          imageCouvertureEl.value = actu?.image_couverture || '';
        }
        if (datePublicationEl && datePublicationEl.tagName === 'INPUT') {
          datePublicationEl.value = actu?.date_publication || '';
        }

        // hidden fields
        if (hiddenActuDescriptionRef.current) hiddenActuDescriptionRef.current.value = actu?.description || '';
      } catch (e) { console.error('Sync actu modal fields failed', e); }
    }, 0);
  };

  const closeActuModal = () => {
    if (actuModalRef.current) actuModalRef.current.removeAttribute('show');
    setEditingItem(null);
    setActuDescriptionValue('');
    setPiecesJointes([]);
  };

  // Synchroniser l'éditeur riche pour les actualités
  useEffect(() => {
    if (hiddenActuDescriptionRef.current) hiddenActuDescriptionRef.current.value = actuDescriptionValue;
  }, [actuDescriptionValue]);

  const saveActu = async (e) => {
    e.preventDefault();

    // s'assurer que la description Quill est injectée dans un champ caché
    if (hiddenActuDescriptionRef.current) hiddenActuDescriptionRef.current.value = actuDescriptionValue;

    const form = e.target;
    const formData = new FormData(form);

    const getField = (name) => {
      const formDataValue = formData.get(name);
      if (formDataValue && formDataValue !== '') {
        return formDataValue;
      }

      const el = form.querySelector(`[name="${name}"]`);
      if (el && el.value !== undefined && el.value !== null && String(el.value).trim() !== '') {
        return el.value;
      }

      return '';
    };

    const payload = {
      titre: getField('titre') || '',
      description: getField('description') || actuDescriptionValue || '',
      resume: getField('resume') || null,
      imageCouverture: getField('imageCouverture') || null,
      piecesJointes: piecesJointes || [],
      datePublication: getField('datePublication') || new Date().toISOString().slice(0, 10)
    };

    console.log('[DEBUG saveActu] Payload final:', payload);

    // Validation locale minimale
    if (!payload.titre || payload.titre.trim().length === 0) {
      alert('Le titre est requis.');
      return;
    }

    try {
      let res;
      if (editingItem && editingItem.id) {
        // modifier
        res = await fetch('/api/admin/actualites', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingItem.id, ...payload })
        });
      } else {
        // création
        res = await fetch('/api/admin/actualites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const text = await res.text();
        let parsed = text;
        try { parsed = JSON.parse(text); } catch (_) {}
        console.error('[Actualites] API returned error', res.status, parsed, payload);
        alert('Erreur API ' + res.status + ': ' + (parsed?.error || text));
        return;
      }

      const createdOrUpdated = await res.json();
      if (editingItem && editingItem.id) {
        setActus(prev => prev.map(a => a.id === createdOrUpdated.id ? createdOrUpdated : a));
      } else {
        setActus(prev => [createdOrUpdated, ...prev]);
      }
      closeActuModal();
    } catch (err) {
      console.error('Impossible d\'enregistrer l\'actualité en base :', err);
      alert('Une erreur est survenue lors de la sauvegarde.');
    }
  };

  const deleteActu = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette actualité ?')) return;
    try {
      const res = await fetch(`/api/admin/actualites?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const text = await res.text();
        let parsed = text;
        try { parsed = JSON.parse(text); } catch (_) {}
        console.error('Erreur suppression actualité', res.status, parsed);
        alert('Erreur suppression: ' + (parsed?.error || text));
        return;
      }
      setActus(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      console.error('Impossible de supprimer l\'actualité en base', e);
      alert('Erreur lors de la suppression');
    }
  };

  // Gestion des pièces jointes
  const ajouterPieceJointe = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.txt,.jpg,.jpeg,.png';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        // Pour l'instant, on stocke juste le nom du fichier
        // Dans une vraie implémentation, il faudrait uploader le fichier
        const nouveauFichier = {
          id: Date.now(),
          nom: file.name,
          taille: file.size,
          type: file.type,
          // url: 'path/to/uploaded/file' // À implémenter avec un service d'upload
        };
        setPiecesJointes(prev => [...prev, nouveauFichier]);
      }
    };
    input.click();
  };

  const supprimerPieceJointe = (id) => {
    setPiecesJointes(prev => prev.filter(pj => pj.id !== id));
  };

  // Gestion des événements
  const openEventModal = (event = null) => {
    setEditingItem(event);
    setEventDescriptionValue(event?.description || '');

    // afficher la modal WCS en ajoutant l'attribut show
    if (eventModalRef.current) eventModalRef.current.setAttribute('show', '');

    // Synchroniser les champs après le rendu
    setTimeout(() => {
      const form = eventFormRef.current;
      if (!form) return;
      try {
        const nomEvenementEl = form.querySelector('[name="nomEvenement"]');
        const nomBandeauEl = form.querySelector('[name="nomBandeau"]');
        const pageDedieeEl = form.querySelector('[name="pageDediee"]');

        // Pour les inputs natifs
        if (nomEvenementEl && nomEvenementEl.tagName === 'INPUT') {
          nomEvenementEl.value = event?.nom_evenement || '';
        }
        if (nomBandeauEl && nomBandeauEl.tagName === 'INPUT') {
          nomBandeauEl.value = event?.nom_bandeau || '';
        }
        if (pageDedieeEl && pageDedieeEl.tagName === 'TEXTAREA') {
          pageDedieeEl.value = event?.page_dediee || '';
        }

        // hidden fields
        if (hiddenEventDescriptionRef.current) hiddenEventDescriptionRef.current.value = event?.description || '';
      } catch (e) { console.error('Sync event modal fields failed', e); }
    }, 0);
  };

  const closeEventModal = () => {
    if (eventModalRef.current) eventModalRef.current.removeAttribute('show');
    setEditingItem(null);
    setEventDescriptionValue('');
  };

  // Synchroniser l'éditeur riche pour les événements
  useEffect(() => {
    if (hiddenEventDescriptionRef.current) hiddenEventDescriptionRef.current.value = eventDescriptionValue;
  }, [eventDescriptionValue]);

  const saveEvent = async (e) => {
    e.preventDefault();

    // s'assurer que la description Quill est injectée dans un champ caché
    if (hiddenEventDescriptionRef.current) hiddenEventDescriptionRef.current.value = eventDescriptionValue;

    const form = e.target;
    const formData = new FormData(form);

    const getField = (name) => {
      const formDataValue = formData.get(name);
      if (formDataValue && formDataValue !== '') {
        return formDataValue;
      }

      const el = form.querySelector(`[name="${name}"]`);
      if (el && el.value !== undefined && el.value !== null && String(el.value).trim() !== '') {
        return el.value;
      }

      return '';
    };

    const payload = {
      nomEvenement: getField('nomEvenement') || '',
      description: getField('description') || eventDescriptionValue || '',
      nomBandeau: getField('nomBandeau') || null,
      pageDediee: getField('pageDediee') || null
    };

    console.log('[DEBUG saveEvent] Payload final:', payload);

    // Validation locale minimale
    if (!payload.nomEvenement || payload.nomEvenement.trim().length === 0) {
      alert('Le nom de l\'événement est requis.');
      return;
    }

    try {
      let res;
      if (editingItem && editingItem.id) {
        // modifier
        res = await fetch('/api/admin/evenements', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingItem.id, ...payload })
        });
      } else {
        // création
        res = await fetch('/api/admin/evenements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const text = await res.text();
        let parsed = text;
        try { parsed = JSON.parse(text); } catch (_) {}
        console.error('[Evenements] API returned error', res.status, parsed, payload);
        alert('Erreur API ' + res.status + ': ' + (parsed?.error || text));
        return;
      }

      const createdOrUpdated = await res.json();
      if (editingItem && editingItem.id) {
        setEvenements(prev => prev.map(e => e.id === createdOrUpdated.id ? createdOrUpdated : e));
      } else {
        setEvenements(prev => [createdOrUpdated, ...prev]);
      }
      closeEventModal();
    } catch (err) {
      console.error('Impossible d\'enregistrer l\'événement en base :', err);
      alert('Une erreur est survenue lors de la sauvegarde.');
    }
  };

  const deleteEvent = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) return;
    try {
      const res = await fetch(`/api/admin/evenements?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const text = await res.text();
        let parsed = text;
        try { parsed = JSON.parse(text); } catch (_) {}
        console.error('Erreur suppression événement', res.status, parsed);
        alert('Erreur suppression: ' + (parsed?.error || text));
        return;
      }
      setEvenements(prev => prev.filter(e => e.id !== id));
    } catch (e) {
      console.error('Impossible de supprimer l\'événement en base', e);
      alert('Erreur lors de la suppression');
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <h1>Diffusion d'informations</h1>
        <p className={styles.subtitle}>Gérez les informations trafic, actualités et événements</p>
      </div>



      <wcs-tabs aria-label="Tabs Diffusion Infos" align="start">
        {/* TAB INFOS TRAFIC */}
        <wcs-tab header="Infos Trafic" item-key="infos-trafic">
          <div className={styles.tabPanel}>
            <div className={styles.tabHeader}>
              <h2>Gestion des informations trafic</h2>
              <wcs-button id="create-info-trigger" onClick={() => openInfoModal()}>
                <wcs-mat-icon icon="add" /> Nouvelle info trafic
              </wcs-button>
            </div>

            <div className={styles.cardGrid}>
              {infosTraffic.map(info => {
                // Utiliser directement les dates normalisées (format YYYY-MM-DD ou null)
                const dateDebut = info.dateDebut || '—';
                const dateFin = info.dateFin || '—';

                return (
                  <wcs-card key={info.id} className={styles.infoCard}>
                    <div className={styles.cardContent}>
                      <div className={styles.cardBadge}>
                        <wcs-badge color={info.type === 'alerte' ? 'error' : 'warning'}>
                          {info.type}
                        </wcs-badge>
                      </div>
                      <h3 className={styles.cardTitle}>{info.titre}</h3>
                      <div className={styles.cardDescription} dangerouslySetInnerHTML={{ __html: info.description }} />
                      <div className={styles.cardMeta}>
                        <span><wcs-mat-icon icon="event" size="s" /> Du {dateDebut} au {dateFin}</span>
                      </div>
                      <div className={styles.cardActions}>
                        <wcs-button mode="clear" shape="small" onClick={() => openInfoModal(info)}>
                          <wcs-mat-icon icon="edit" /> Modifier
                        </wcs-button>
                        <wcs-button mode="clear" shape="small" onClick={() => deleteInfoTraffic(info.id)}>
                          <wcs-mat-icon icon="delete" /> Supprimer
                        </wcs-button>
                      </div>
                    </div>
                  </wcs-card>
                );
              })}
              {infosTraffic.length === 0 && (
                <div className={styles.emptyState}>
                  <wcs-mat-icon icon="info" size="xl" />
                  <p>Aucune information trafic</p>
                </div>
              )}
            </div>
          </div>
        </wcs-tab>

        {/* TAB ACTUS */}
        <wcs-tab header="Actus" item-key="actus">
          <div className={styles.tabPanel}>
            <div className={styles.tabHeader}>
              <h2>Gestion des actualités</h2>
              <wcs-button onClick={() => openActuModal()}>
                <wcs-mat-icon icon="add" /> Nouvelle actualité
              </wcs-button>
            </div>

            <div className={styles.cardGrid}>
              {actus.map(actu => {
                const datePublication = actu.date_publication ? formatDateForUI(actu.date_publication) : '—';
                return (
                  <wcs-card key={actu.id} className={styles.infoCard}>
                    <div className={styles.cardContent}>
                      {actu.image_couverture && (
                        <div className={styles.cardImage}>
                          <img src={actu.image_couverture} alt={actu.titre} style={{width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px'}} />
                        </div>
                      )}
                      <h3 className={styles.cardTitle}>{actu.titre}</h3>
                      {actu.resume && (
                        <p className={styles.cardResume} style={{fontStyle: 'italic', color: '#666', fontSize: '0.9em'}}>{actu.resume}</p>
                      )}
                      <div className={styles.cardDescription} dangerouslySetInnerHTML={{ __html: actu.description }} />
                      <div className={styles.cardMeta}>
                        <span><wcs-mat-icon icon="event" size="s" /> Publié le {datePublication}</span>
                        {actu.pieces_jointes && actu.pieces_jointes.length > 0 && (
                          <span><wcs-mat-icon icon="attach_file" size="s" /> {actu.pieces_jointes.length} fichier(s)</span>
                        )}
                      </div>
                      <div className={styles.cardActions}>
                        <wcs-button mode="clear" shape="small" onClick={() => openActuModal(actu)}>
                          <wcs-mat-icon icon="edit" /> Modifier
                        </wcs-button>
                        <wcs-button mode="clear" shape="small" onClick={() => deleteActu(actu.id)}>
                          <wcs-mat-icon icon="delete" /> Supprimer
                        </wcs-button>
                      </div>
                    </div>
                  </wcs-card>
                );
              })}
              {actus.length === 0 && (
                <div className={styles.emptyState}>
                  <wcs-mat-icon icon="article" size="xl" />
                  <p>Aucune actualité</p>
                </div>
              )}
            </div>
          </div>
        </wcs-tab>

        {/* TAB ÉVÉNEMENTS */}
        <wcs-tab header="Événements" item-key="evenements">
          <div className={styles.tabPanel}>
            <div className={styles.tabHeader}>
              <h2>Gestion des événements</h2>
              <wcs-button onClick={() => openEventModal()}>
                <wcs-mat-icon icon="add" /> Nouvel événement
              </wcs-button>
            </div>

            <div className={styles.cardGrid}>
              {evenements.map(event => (
                <wcs-card key={event.id} className={styles.infoCard}>
                  <div className={styles.cardContent}>
                    <h3 className={styles.cardTitle}>{event.nom_evenement}</h3>
                    <div className={styles.cardDescription} dangerouslySetInnerHTML={{ __html: event.description }} />
                    <div className={styles.cardMeta}>
                      {event.nom_bandeau && (
                        <span><wcs-mat-icon icon="campaign" size="s" /> Bandeau: {event.nom_bandeau}</span>
                      )}
                      {event.page_dediee && (
                        <span><wcs-mat-icon icon="link" size="s" /> Page dédiée disponible</span>
                      )}
                      <span><wcs-mat-icon icon="schedule" size="s" /> Créé le {formatDateForUI(event.date_creation?.split('T')[0])}</span>
                    </div>
                    <div className={styles.cardActions}>
                      <wcs-button mode="clear" shape="small" onClick={() => openEventModal(event)}>
                        <wcs-mat-icon icon="edit" /> Modifier
                      </wcs-button>
                      <wcs-button mode="clear" shape="small" onClick={() => deleteEvent(event.id)}>
                        <wcs-mat-icon icon="delete" /> Supprimer
                      </wcs-button>
                    </div>
                  </div>
                </wcs-card>
              ))}
              {evenements.length === 0 && (
                <div className={styles.emptyState}>
                  <wcs-mat-icon icon="celebration" size="xl" />
                  <p>Aucun événement</p>
                </div>
              )}
            </div>
          </div>
        </wcs-tab>
      </wcs-tabs>

      {/* MODAL INFO TRAFIC */}
      <wcs-modal ref={infoModalRef} modal-trigger-controls-id="create-info-trigger" show-close-button size="m" onWcsDialogClosed={closeInfoModal}>
        <div slot="header">{editingItem ? 'Modifier' : 'Créer'} une info trafic</div>
        <div style={{ padding: 12 }}>
          <form ref={infoFormRef} onSubmit={saveInfoTraffic} className={styles.modalForm}>
            <wcs-form-field>
              <wcs-label>Type d'info-Trafic</wcs-label>
              <wcs-select name="type" defaultValue={editingItem?.type || 'information'}>
                <wcs-select-option value="information">Information</wcs-select-option>
                <wcs-select-option value="travaux">Travaux</wcs-select-option>
                <wcs-select-option value="alerte">Alerte</wcs-select-option>
                <wcs-select-option value="administration">Administration</wcs-select-option>
              </wcs-select>
            </wcs-form-field>

            <wcs-form-field>
              <wcs-label>Titre de l'info Trafic</wcs-label>
              {/* input HTML natif pour garantir compatibilité FormData */}
              <input
                name="titre"
                type="text"
                defaultValue={titreValue}
                placeholder="Titre de l'info"
                required
                onChange={(e) => setTitreValue(e.target.value)}
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              />
            </wcs-form-field>

            <wcs-form-field>
              <wcs-label>Description de l'info trafic</wcs-label>
              {/* Afficher Quill uniquement après montage côté client pour éviter mismatch SSR */}
              {mounted ? (
                <QuillEditorClient value={descriptionValue} onChange={(val) => setDescriptionValue(val)} />
              ) : (
                <wcs-textarea name="description" rows={6} defaultValue={editingItem?.description || ''} placeholder="Description détaillée" />
              )}
              <input type="hidden" name="description" ref={hiddenDescriptionRef} defaultValue={editingItem?.description || ''} />
              {/* Hidden titre for reliable Form submission when wcs-input isn't readable by FormData */}
              <input type="hidden" name="titre" ref={hiddenTitreRef} defaultValue={editingItem?.titre || ''} />
            </wcs-form-field>

            <div className={styles.formRow}>
              <wcs-form-field>
                <wcs-label>Date de début</wcs-label>
                <input
                  name="dateDebut"
                  type="date"
                  defaultValue={editingItem?.dateDebut || ''}
                  required
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
              </wcs-form-field>

              <wcs-form-field>
                <wcs-label>Date de fin</wcs-label>
                <input
                  name="dateFin"
                  type="date"
                  defaultValue={editingItem?.dateFin || ''}
                  required
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
              </wcs-form-field>
            </div>

            <div className={styles.modalActions}>
              <wcs-button mode="clear" onClick={closeInfoModal} type="button">Annuler</wcs-button>
              <wcs-button type="submit">Enregistrer</wcs-button>
            </div>
          </form>
        </div>
      </wcs-modal>

      {/* MODAL ACTUS */}
      <wcs-modal ref={actuModalRef} modal-trigger-controls-id="actu-modal-trigger-fallback" show-close-button size="l" onWcsDialogClosed={closeActuModal}>
        <div slot="header">{editingItem ? 'Modifier' : 'Créer'} une actualité</div>
        <div style={{ padding: 12 }}>
          <form ref={actuFormRef} onSubmit={saveActu} className={styles.modalForm}>
            <wcs-form-field>
              <wcs-label>Titre</wcs-label>
              <input
                name="titre"
                type="text"
                placeholder="Titre de l'actualité"
                required
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              />
            </wcs-form-field>

            <wcs-form-field>
              <wcs-label>Description</wcs-label>
              {/* Afficher Quill uniquement après montage côté client pour éviter mismatch SSR */}
              {mounted ? (
                <QuillEditorClient value={actuDescriptionValue} onChange={(val) => setActuDescriptionValue(val)} />
              ) : (
                <textarea name="description" rows={6} placeholder="Contenu détaillé de l'actualité" style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
              )}
              <input type="hidden" name="description" ref={hiddenActuDescriptionRef} />
            </wcs-form-field>

            <wcs-form-field>
              <wcs-label>Résumé (optionnel)</wcs-label>
              <input
                name="resume"
                type="text"
                placeholder="Résumé court de l'actualité"
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              />
            </wcs-form-field>

            <wcs-form-field>
              <wcs-label>Image de couverture (optionnel)</wcs-label>
              <input
                name="imageCouverture"
                type="url"
                placeholder="URL de l'image de couverture"
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              />
            </wcs-form-field>

            <wcs-form-field>
              <wcs-label>Pièces jointes (optionnel)</wcs-label>
              <div className={styles.piecesJointes}>
                {piecesJointes.length > 0 && (
                  <div className={styles.piecesJointesList}>
                    {piecesJointes.map(pj => (
                      <div key={pj.id} className={styles.pieceJointe}>
                        <wcs-mat-icon icon="attach_file" size="s" />
                        <span>{pj.nom}</span>
                        <span className={styles.fileSize}>({Math.round(pj.taille / 1024)} KB)</span>
                        <wcs-button mode="clear" shape="small" onClick={() => supprimerPieceJointe(pj.id)}>
                          <wcs-mat-icon icon="close" size="s" />
                        </wcs-button>
                      </div>
                    ))}
                  </div>
                )}
                <wcs-button mode="clear" onClick={ajouterPieceJointe} type="button">
                  <wcs-mat-icon icon="add" /> Ajouter une pièce jointe
                </wcs-button>
              </div>
            </wcs-form-field>

            <wcs-form-field>
              <wcs-label>Date de publication</wcs-label>
              <input
                name="datePublication"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              />
            </wcs-form-field>

            <div className={styles.modalActions}>
              <wcs-button mode="clear" onClick={closeActuModal} type="button">Annuler</wcs-button>
              <wcs-button type="submit">Enregistrer</wcs-button>
            </div>
          </form>
        </div>
      </wcs-modal>

      {/* MODAL ÉVÉNEMENTS */}
      <wcs-modal ref={eventModalRef} modal-trigger-controls-id="event-modal-trigger-fallback" show-close-button size="l" onWcsDialogClosed={closeEventModal}>
        <div slot="header">{editingItem ? 'Modifier' : 'Créer'} un événement</div>
        <div style={{ padding: 12 }}>
          <form ref={eventFormRef} onSubmit={saveEvent} className={styles.modalForm}>
            <wcs-form-field>
              <wcs-label>Nom de l'événement</wcs-label>
              <input
                name="nomEvenement"
                type="text"
                placeholder="Nom de l'événement"
                required
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              />
            </wcs-form-field>

            <wcs-form-field>
              <wcs-label>Description</wcs-label>
              {/* Afficher Quill uniquement après montage côté client pour éviter mismatch SSR */}
              {mounted ? (
                <QuillEditorClient value={eventDescriptionValue} onChange={(val) => setEventDescriptionValue(val)} />
              ) : (
                <textarea name="description" rows={6} placeholder="Description détaillée de l'événement" style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
              )}
              <input type="hidden" name="description" ref={hiddenEventDescriptionRef} />
            </wcs-form-field>

            <wcs-form-field>
              <wcs-label>Nom sur le bandeau (optionnel)</wcs-label>
              <input
                name="nomBandeau"
                type="text"
                placeholder="Nom qui apparaîtra sur le bandeau"
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              />
            </wcs-form-field>

            <wcs-form-field>
              <wcs-label>Page dédiée (optionnel)</wcs-label>
              <textarea
                name="pageDediee"
                rows={4}
                placeholder="Contenu HTML de la page dédiée ou URL"
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </wcs-form-field>

            <div className={styles.modalActions}>
              <wcs-button mode="clear" onClick={closeEventModal} type="button">Annuler</wcs-button>
              <wcs-button type="submit">Enregistrer</wcs-button>
            </div>
          </form>
        </div>
      </wcs-modal>

      {/* Hidden fallback triggers for actu and event modals to satisfy wcs-modal */}
      <button id="actu-modal-trigger-fallback" style={{ display: 'none' }} aria-hidden="true" />
      <button id="event-modal-trigger-fallback" style={{ display: 'none' }} aria-hidden="true" />
    </div>
  );
}