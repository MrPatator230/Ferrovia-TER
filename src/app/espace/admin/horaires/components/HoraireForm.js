"use client";
import React, { useEffect, useRef, useState } from 'react';

export default function HoraireForm({ editHoraire, onSuccess, onCancel }){
  const formRef = useRef(null);
  const departRef = useRef(null);
  const arriveeRef = useRef(null);
  const numeroRef = useRef(null);
  const typeRef = useRef(null);
  const materielRef = useRef(null);
  const ligneRef = useRef(null);
  // helper to update WCS element and dispatch change events so the component re-renders
  function applyToWcsElement(el, { value, checked } = {}) {
    if (!el) return;
    try {
      if (typeof value !== 'undefined') {
        // try setting property and attribute for compatibility
        try { el.value = value; } catch(e) {}
        try { el.setAttribute && el.setAttribute('value', String(value)); } catch(e) {}
      }
      if (typeof checked !== 'undefined') {
        try { el.checked = Boolean(checked); } catch(e) {}
        try { if (Boolean(checked)) el.setAttribute && el.setAttribute('checked', ''); else el.removeAttribute && el.removeAttribute('checked'); } catch(e) {}
      }
      // dispatch events that WCS listens to
      try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch(e) {}
      try { el.dispatchEvent(new CustomEvent('wcsChange', { bubbles: true })); } catch(e) {}
    } catch (err) { /* ignore errors */ }
  }

  // helper: convert stored time 'HH:MM:SS' or 'HH:MM' or datetime-local to a time input value (HH:MM)
  function toTimeInputValue(timeStr) {
    if (!timeStr) return '';
    try {
      // si c'est un datetime-local 'YYYY-MM-DDTHH:MM' ou 'YYYY-MM-DDTHH:MM:SS'
      if (timeStr.includes('T')) {
        const t = timeStr.split('T')[1];
        const parts = t.split(':');
        if (parts.length >= 2) return `${parts[0]}:${parts[1]}`; // keep HH:MM only
        return '';
      }
      // si c'est déjà 'HH:MM' ou 'HH:MM:SS'
      const m = timeStr.match(/^(\d{2}:\d{2})(?::(\d{2}))?$/);
      if (!m) return '';
      return m[1]; // return HH:MM
    } catch (e) { return ''; }
  }

  const [departStationId, setDepartStationId] = useState(editHoraire?.depart_station_id || '');
  const [arriveeStationId, setArriveeStationId] = useState(editHoraire?.arrivee_station_id || '');
  const [departTime, setDepartTime] = useState(toTimeInputValue(editHoraire?.depart_time || ''));
  const [arriveeTime, setArriveeTime] = useState(toTimeInputValue(editHoraire?.arrivee_time || ''));
  const [numeroTrain, setNumeroTrain] = useState(editHoraire?.numero_train || '');
  const [typeTrain, setTypeTrain] = useState(editHoraire?.type_train || '');
  const [stops, setStops] = useState(editHoraire?.stops || []);
  const [stationsOptions, setStationsOptions] = useState([]);
  const [loadingStations, setLoadingStations] = useState(false);
  const [error, setError] = useState(null);
  // Ligne
  const [ligneId, setLigneId] = useState(editHoraire?.ligne_id || '');
  const [lignesOptions, setLignesOptions] = useState([]);
  const [loadingLignes, setLoadingLignes] = useState(false);

  // Service annuel
  const [serviceAnnuelId, setServiceAnnuelId] = useState(editHoraire?.service_annuel_id || '');
  const [servicesAnnuelsOptions, setServicesAnnuelsOptions] = useState([]);
  const [loadingServicesAnnuels, setLoadingServicesAnnuels] = useState(false);
  const serviceAnnuelRef = useRef(null);

  // Tabs: utiliser des clés stables (slugs) pour item-key des WCS tabs
  const tabs = [
    { key: 'general', label: 'Général' },
    { key: 'gares-desservies', label: 'Gares Desservies' },
    { key: 'jours-dessertes', label: 'Jours de dessertes' },
    { key: 'materiel-roulant', label: 'Matériel roulant' },
    { key: 'substitution', label: 'Substitution' }
  ];
  const [activeTab, setActiveTab] = useState('general');
  const tabsRef = useRef(null);
  // Synchroniser activeTab <-> WCS tabs
  useWcsTabsSync(tabsRef, activeTab, setActiveTab);

  // Jours de dessertes
  const [jours, setJours] = useState(() => editHoraire?.jours_circulation || { lun: true, mar: true, mer: true, jeu: true, ven: true, sam: true, dim: true });
  const [circulentJoursFeries, setCirculentJoursFeries] = useState(editHoraire?.circulent_jours_feries || false);
  const [circulentDimanches, setCirculentDimanches] = useState(editHoraire?.circulent_dimanches || false);
  const [joursPersonnalises, setJoursPersonnalises] = useState(editHoraire?.jours_personnalises ? editHoraire.jours_personnalises.join('\n') : '');

  // Matériel roulant
  const [materielId, setMaterielId] = useState(editHoraire?.materiel_id || '');
  const [materielsOptions, setMaterielsOptions] = useState([]);
  const [loadingMateriels, setLoadingMateriels] = useState(false);

  // Garantir que lignesOptions et materielsOptions sont toujours des tableaux
  const safeLignesOptions = Array.isArray(lignesOptions) ? lignesOptions : [];
   // Garantir que materielsOptions est toujours un tableau
   const safeMaterielsOptions = Array.isArray(materielsOptions) ? materielsOptions : [];

  // Substitution
  const [isSubstitution, setIsSubstitution] = useState(Boolean(editHoraire?.is_substitution));

  useEffect(()=>{ fetchStations(); }, []);
  useEffect(()=>{ fetchMateriels(); }, []);
  useEffect(()=>{ fetchLignes(); }, []);
  useEffect(()=>{ fetchServicesAnnuels(); }, []);

  // Si la prop editHoraire change (ou devient null), resynchroniser l'état local
  useEffect(() => {
    if (!editHoraire) return;
    try {
      setDepartStationId(editHoraire.depart_station_id || '');
      setArriveeStationId(editHoraire.arrivee_station_id || '');
      setDepartTime(toTimeInputValue(editHoraire.depart_time || ''));
      setArriveeTime(toTimeInputValue(editHoraire.arrivee_time || ''));
      setNumeroTrain(editHoraire.numero_train || '');
      setTypeTrain(editHoraire.type_train || '');
      setStops(Array.isArray(editHoraire.stops) ? editHoraire.stops : (editHoraire.stops || []));
      setJours(editHoraire.jours_circulation || jours);
      setCirculentJoursFeries(Boolean(editHoraire.circulent_jours_feries));
      setCirculentDimanches(Boolean(editHoraire.circulent_dimanches));
      setJoursPersonnalises(Array.isArray(editHoraire.jours_personnalises) ? editHoraire.jours_personnalises.join('\n') : (editHoraire.jours_personnalises || ''));
      setMaterielId(editHoraire.materiel_id || '');
      setLigneId(editHoraire.ligne_id || '');
      setServiceAnnuelId(editHoraire.service_annuel_id || '');
      setIsSubstitution(Boolean(editHoraire.is_substitution));
    } catch (e) { console.error('Sync editHoraire -> state failed', e); }
  }, [editHoraire]);

  // Sync React state -> WCS DOM on mount and when specific states change
  useEffect(() => {
    if (departRef.current) applyToWcsElement(departRef.current, { value: departStationId || '' });
    if (arriveeRef.current) applyToWcsElement(arriveeRef.current, { value: arriveeStationId || '' });
    if (numeroRef.current) applyToWcsElement(numeroRef.current, { value: numeroTrain || '' });
    if (typeRef.current) applyToWcsElement(typeRef.current, { value: typeTrain || '' });
    if (ligneRef.current) applyToWcsElement(ligneRef.current, { value: ligneId || '' });
    if (serviceAnnuelRef.current) applyToWcsElement(serviceAnnuelRef.current, { value: serviceAnnuelId || '' });

    // sync time inputs if present
    const formTop = formRef.current;
    if (formTop) {
      const dt = formTop.querySelector('wcs-input[data-field="depart-time"]') || formTop.querySelector('input[data-field="depart-time"]');
      const at = formTop.querySelector('wcs-input[data-field="arrivee-time"]') || formTop.querySelector('input[data-field="arrivee-time"]');
      if (dt) applyToWcsElement(dt, { value: departTime || '' });
      if (at) applyToWcsElement(at, { value: arriveeTime || '' });
    }

    // sync stops DOM rows
    const form = formRef.current;
    if (form) {
      const stopNodes = form.querySelectorAll('[data-stop-row]');
      stopNodes.forEach((node, idx) => {
        const st = stops[idx] || {};
        const sel = node.querySelector('wcs-select[data-field="stop-station"]') || node.querySelector('select[data-field="stop-station"]');
        const inArr = node.querySelector('wcs-input[data-field="stop-arrivee"]') || node.querySelector('input[data-field="stop-arrivee"]');
        const inDep = node.querySelector('wcs-input[data-field="stop-depart"]') || node.querySelector('input[data-field="stop-depart"]');
        try { if (sel) applyToWcsElement(sel, { value: st.station_id || '' }); } catch(e){}
        try { if (inArr) applyToWcsElement(inArr, { value: st.arrivee_time ? toTimeInputValue(st.arrivee_time) : '' }); } catch(e){}
        try { if (inDep) applyToWcsElement(inDep, { value: st.depart_time ? toTimeInputValue(st.depart_time) : '' }); } catch(e){}
      });

      // sync jours checkboxes
      ['lun','mar','mer','jeu','ven','sam','dim'].forEach(d => {
        const cb = form.querySelector(`wcs-checkbox[data-day="${d}"]`) || form.querySelector(`input[data-day="${d}"]`);
        if (cb) try { applyToWcsElement(cb, { checked: Boolean(jours[d]) }); } catch(e) {}
      });

      const jf = form.querySelector('wcs-checkbox[data-field="jours-feries"]') || form.querySelector('input[data-field="jours-feries"]');
      if (jf) try { applyToWcsElement(jf, { checked: Boolean(circulentJoursFeries) }); } catch(e) {}
      const jd = form.querySelector('wcs-checkbox[data-field="dimanches"]') || form.querySelector('input[data-field="dimanches"]');
      if (jd) try { applyToWcsElement(jd, { checked: Boolean(circulentDimanches) }); } catch(e) {}

      // sync matériel roulant select
      const materielSelect = form.querySelector('wcs-select[data-field="materiel"]') || form.querySelector('select[data-field="materiel"]');
      if (materielSelect) try { applyToWcsElement(materielSelect, { value: materielId || '' }); } catch(e) {}

      // sync ligne select
      const ligneSelect = form.querySelector('wcs-select[data-field="ligne"]') || form.querySelector('select[data-field="ligne"]');
      if (ligneSelect) try { applyToWcsElement(ligneSelect, { value: ligneId || '' }); } catch(e) {}

      // sync service annuel select
      const saSelect = form.querySelector('wcs-select[data-field="service-annuel"]') || form.querySelector('select[data-field="service-annuel"]');
      if (saSelect) try { applyToWcsElement(saSelect, { value: serviceAnnuelId || '' }); } catch(e) {}

      // sync is_substitution checkbox
      const subCheckbox = form.querySelector('wcs-checkbox[data-field="is-substitution"]') || form.querySelector('input[data-field="is-substitution"]');
      if (subCheckbox) try { applyToWcsElement(subCheckbox, { checked: Boolean(isSubstitution) }); } catch(e) {}
    }
  }, [departStationId, arriveeStationId, numeroTrain, typeTrain, stops, jours, circulentJoursFeries, circulentDimanches, materielId, ligneId, serviceAnnuelId, isSubstitution]);

  // Synchronisation WCS -> React
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const onWcsChange = (e) => {
      const target = e.target;
      if (!target) return;

      // départ / arrivée select
      if (target.matches && target.matches('wcs-select[data-field="depart-station"]')) {
        setDepartStationId(target.value || '');
      }
      if (target.matches && target.matches('wcs-select[data-field="arrivee-station"]')) {
        setArriveeStationId(target.value || '');
      }

      // ligne select
      if (target.matches && target.matches('wcs-select[data-field="ligne"]')) {
        setLigneId(target.value || '');
      }

      // service annuel select
      if (target.matches && target.matches('wcs-select[data-field="service-annuel"]')) {
        setServiceAnnuelId(target.value || '');
      }

      // inputs time/numero/type
      if (target.matches && target.matches('wcs-input[data-field="depart-time"]')) {
        setDepartTime(target.value || '');
      }
      if (target.matches && target.matches('wcs-input[data-field="arrivee-time"]')) {
        setArriveeTime(target.value || '');
      }
      if (target.matches && target.matches('wcs-input[data-field="numero-train"]')) {
        setNumeroTrain(target.value || '');
      }
      if (target.matches && target.matches('wcs-input[data-field="type-train"]')) {
        setTypeTrain(target.value || '');
      }

      // stops: elements with data-index
      if (target.matches && target.matches('wcs-select[data-field="stop-station"]')) {
        const idx = parseInt(target.getAttribute('data-index') || '-1', 10);
        if (idx >= 0) updateStop(idx, 'station_id', target.value);
      }
      if (target.matches && target.matches('wcs-input[data-field="stop-arrivee"]')) {
        const idx = parseInt(target.getAttribute('data-index') || '-1', 10);
        if (idx >= 0) updateStop(idx, 'arrivee_time', target.value);
      }
      if (target.matches && target.matches('wcs-input[data-field="stop-depart"]')) {
        const idx = parseInt(target.getAttribute('data-index') || '-1', 10);
        if (idx >= 0) updateStop(idx, 'depart_time', target.value);
      }

      // jours checkbox
      if (target.matches && target.matches('wcs-checkbox[data-day]')) {
        const day = target.getAttribute('data-day');
        setJours(j => ({ ...j, [day]: target.checked }));
      }

      // jours fériés / dimanches
      if (target.matches && target.matches('wcs-checkbox[data-field="jours-feries"]')) {
        setCirculentJoursFeries(Boolean(target.checked));
      }
      if (target.matches && target.matches('wcs-checkbox[data-field="dimanches"]')) {
        setCirculentDimanches(Boolean(target.checked));
      }

      // material select
      if (target.matches && target.matches('wcs-select[data-field="materiel"]')) {
        setMaterielId(target.value || '');
      }

      // substitution
      if (target.matches && target.matches('wcs-checkbox[data-field="is-substitution"]')) {
        setIsSubstitution(Boolean(target.checked));
      }

    };

    form.addEventListener('wcsChange', onWcsChange);
    form.addEventListener('change', onWcsChange);

    return () => {
      form.removeEventListener('wcsChange', onWcsChange);
      form.removeEventListener('change', onWcsChange);
    };
  }, [formRef.current, stops]);

  async function fetchStations(){
    setLoadingStations(true);
    try{
      const res = await fetch('/api/admin/stations');
      if (!res.ok) { setStationsOptions([]); return; }
      const data = await res.json();
      setStationsOptions(data || []);
    }catch(e){ console.error(e); setStationsOptions([]); }
    finally{ setLoadingStations(false); }
  }

  async function fetchMateriels(){
    setLoadingMateriels(true);
    try{
      const res = await fetch('/api/admin/materiels');
      if (!res.ok) { setMaterielsOptions([]); return; }
      const data = await res.json();
      setMaterielsOptions(data || []);
    }catch(e){ console.error(e); setMaterielsOptions([]); }
    finally{ setLoadingMateriels(false); }
  }

  async function fetchLignes(){
    setLoadingLignes(true);
    try{
      const res = await fetch('/api/admin/lignes');
      if (!res.ok) { setLignesOptions([]); return; }
      const data = await res.json();
      setLignesOptions(data || []);
    }catch(e){ console.error(e); setLignesOptions([]); }
    finally{ setLoadingLignes(false); }
  }

  async function fetchServicesAnnuels(){
    setLoadingServicesAnnuels(true);
    try{
      const res = await fetch('/api/admin/services-annuels');
      if (!res.ok) { setServicesAnnuelsOptions([]); return; }
      const data = await res.json();
      setServicesAnnuelsOptions(data || []);
    }catch(e){ console.error(e); setServicesAnnuelsOptions([]); }
    finally{ setLoadingServicesAnnuels(false); }
  }

  function addStop(){
    setStops(s => [...s, { station_id: '', arrivee_time: '', depart_time: '' }]);
  }
  function updateStop(i, key, value){
    setStops(s => s.map((st, idx) => idx===i ? { ...st, [key]: value } : st));
  }
  function removeStop(i){ setStops(s => s.filter((_,idx)=>idx!==i)); }

  // helper: extraire HH:MM depuis une valeur time ou datetime-local (on ne garde pas les secondes)
  function extractTime(value) {
    if (!value) return null;
    try {
      if (typeof value !== 'string') return null;
      // si c'est datetime-local 'YYYY-MM-DDTHH:MM' ou 'YYYY-MM-DDTHH:MM:SS'
      if (value.includes('T')) {
        let t = value.split('T')[1];
        t = t.replace(/Z$/, '');
        if (t.includes('+')) t = t.split('+')[0];
        if (t.includes('-')) t = t.split('-')[0];
        // garder uniquement HH:MM
        const parts = t.split(':');
        if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
        return null;
      }

      // cas input type=time : 'HH:MM' ou 'HH:MM:SS' -> garder HH:MM
      if (/^\d{2}:\d{2}$/.test(value)) return value;
      if (/^\d{2}:\d{2}:\d{2}$/.test(value)) return value.slice(0,5);

      // fallback : parse as Date and return local HH:MM
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
      }

      return null;
    } catch (e) { console.error('extractTime error', e); return null; }
  }

  async function handleSubmit(e){
    e && e.preventDefault && e.preventDefault();
    setError(null);

    // Lire les valeurs depuis le DOM des webcomponents si nécessaires
    const form = formRef.current;
    try {
      if (form) {
        const ds = form.querySelector('wcs-select[data-field="depart-station"]');
        const as = form.querySelector('wcs-select[data-field="arrivee-station"]');
        const dt = form.querySelector('wcs-input[data-field="depart-time"]');
        const at = form.querySelector('wcs-input[data-field="arrivee-time"]');
        const num = form.querySelector('wcs-input[data-field="numero-train"]');
        const typ = form.querySelector('wcs-input[data-field="type-train"]');
        const lg = form.querySelector('wcs-select[data-field="ligne"]');
        const sa = form.querySelector('wcs-select[data-field="service-annuel"]');
        if (ds && ds.value) setDepartStationId(ds.value);
        if (as && as.value) setArriveeStationId(as.value);
        if (dt && dt.value) setDepartTime(dt.value);
        if (at && at.value) setArriveeTime(at.value);
        if (num && num.value) setNumeroTrain(num.value);
        if (typ && typ.value) setTypeTrain(typ.value);
        if (lg && lg.value) setLigneId(lg.value);
        if (sa && sa.value) setServiceAnnuelId(sa.value);

         // stops: synchroniser depuis DOM si présents
         const stopNodes = form.querySelectorAll('[data-stop-row]');
         if (stopNodes && stopNodes.length>0) {
           const sarr = Array.from(stopNodes).map(node => {
             const station = node.querySelector('wcs-select[data-field="stop-station"]')?.value || node.querySelector('select[data-field="stop-station"]')?.value || '';
             const arrivee = node.querySelector('wcs-input[data-field="stop-arrivee"]')?.value || node.querySelector('input[data-field="stop-arrivee"]')?.value || '';
             const depart = node.querySelector('wcs-input[data-field="stop-depart"]')?.value || node.querySelector('input[data-field="stop-depart"]')?.value || '';
             return { station_id: station, arrivee_time: arrivee, depart_time: depart };
           });
           setStops(sarr);
         }
      }
    } catch (err) { console.error('Erreur lecture DOM WCS', err); }

    // Validation client (toujours côté React state après sync)
    // NOTE: setState is asynchrone, utiliser des variables locales capturées depuis le DOM / état actuel
    // pour construire le payload afin d'éviter d'envoyer des valeurs obsolètes.
    const formValues = {};
    try {
      if (form) {
        formValues.departStationId = form.querySelector('wcs-select[data-field="depart-station"]')?.value || departStationId || '';
        formValues.arriveeStationId = form.querySelector('wcs-select[data-field="arrivee-station"]')?.value || arriveeStationId || '';
        formValues.departTime = form.querySelector('wcs-input[data-field="depart-time"]')?.value || departTime || '';
        formValues.arriveeTime = form.querySelector('wcs-input[data-field="arrivee-time"]')?.value || arriveeTime || '';
        formValues.ligneId = form.querySelector('wcs-select[data-field="ligne"]')?.value || ligneId || '';
        formValues.serviceAnnuelId = form.querySelector('wcs-select[data-field="service-annuel"]')?.value || serviceAnnuelId || '';
        formValues.numeroTrain = form.querySelector('wcs-input[data-field="numero-train"]')?.value || numeroTrain || '';
        formValues.typeTrain = form.querySelector('wcs-input[data-field="type-train"]')?.value || typeTrain || '';

        // stops local
        const stopNodes = form.querySelectorAll('[data-stop-row]');
        if (stopNodes && stopNodes.length>0) {
          formValues.stops = Array.from(stopNodes).map(node => {
            const station = node.querySelector('wcs-select[data-field="stop-station"]')?.value || node.querySelector('select[data-field="stop-station"]')?.value || '';
            const arrivee = node.querySelector('wcs-input[data-field="stop-arrivee"]')?.value || node.querySelector('input[data-field="stop-arrivee"]')?.value || '';
            const depart = node.querySelector('wcs-input[data-field="stop-depart"]')?.value || node.querySelector('input[data-field="stop-depart"]')?.value || '';
            return { station_id: station, arrivee_time: arrivee, depart_time: depart };
          });
        } else {
          // fallback to current React state
          formValues.stops = stops.slice();
        }
      } else {
        // no form -> use state
        formValues.departStationId = departStationId;
        formValues.arriveeStationId = arriveeStationId;
        formValues.departTime = departTime;
        formValues.arriveeTime = arriveeTime;
        formValues.numeroTrain = numeroTrain;
        formValues.typeTrain = typeTrain;
        formValues.stops = stops.slice();
      }
    } catch (err) {
      console.error('Erreur lors de la lecture des valeurs du formulaire pour l\'envoi', err);
      formValues.departStationId = departStationId;
      formValues.arriveeStationId = arriveeStationId;
      formValues.departTime = departTime;
      formValues.arriveeTime = arriveeTime;
      formValues.numeroTrain = numeroTrain;
      formValues.typeTrain = typeTrain;
      formValues.stops = stops.slice();
    }

    // Validation client sur les valeurs locales
    const missingClient = [];
    if (!formValues.departStationId) missingClient.push('depart_station_id');
    if (!formValues.arriveeStationId) missingClient.push('arrivee_station_id');
    if (!formValues.departTime) missingClient.push('depart_time');
    if (!formValues.arriveeTime) missingClient.push('arrivee_time');

    // stops: ne pas bloquer si aucun stop n'est saisi; valider seulement les stops renseignés
    const normalizedStops = (formValues.stops || []).map((st) => ({
      station_id: st.station_id,
      arrivee_time: st.arrivee_time,
      depart_time: st.depart_time,
    }));
    normalizedStops.forEach((st, idx) => {
      const hasAny = Boolean(st.station_id) || Boolean(st.arrivee_time) || Boolean(st.depart_time);
      if (!hasAny) return; // ignore ligne vide
      if (!st.station_id) missingClient.push(`stops[${idx}].station_id`);
      if (!st.arrivee_time) missingClient.push(`stops[${idx}].arrivee_time`);
      if (!st.depart_time) missingClient.push(`stops[${idx}].depart_time`);
    });

    if (missingClient.length > 0) {
      setError('Champs manquants: ' + missingClient.join(', '));
      return;
    }

    const payload = {
      depart_station_id: parseInt(String(formValues.departStationId), 10) || null,
      arrivee_station_id: parseInt(String(formValues.arriveeStationId), 10) || null,
      depart_time: formValues.departTime ? extractTime(formValues.departTime) : null,
      arrivee_time: formValues.arriveeTime ? extractTime(formValues.arriveeTime) : null,
      numero_train: formValues.numeroTrain || null,
      type_train: formValues.typeTrain || null,
      stops: normalizedStops
        .map(s => ({ station_id: s.station_id ? parseInt(String(s.station_id), 10) || null : null, depart_time: s.depart_time ? extractTime(s.depart_time) : null, arrivee_time: s.arrivee_time ? extractTime(s.arrivee_time) : null }))
        .filter(s => s.station_id || s.depart_time || s.arrivee_time),
      jours_circulation: jours,
      circulent_jours_feries: circulentJoursFeries,
      circulent_dimanches: circulentDimanches,
      jours_personnalises: joursPersonnalises ? joursPersonnalises.split('\n').map(d=>d.trim()).filter(Boolean) : [],
      materiel_id: materielId ? parseInt(String(materielId),10) : null,
      ligne_id: formValues.ligneId ? parseInt(String(formValues.ligneId),10) : null,
      service_annuel_id: formValues.serviceAnnuelId ? parseInt(String(formValues.serviceAnnuelId),10) : null,
      sa: formValues.serviceAnnuelId ? parseInt(String(formValues.serviceAnnuelId),10) : null,
      is_substitution: isSubstitution ? 1 : 0
    };

    try{
      const method = editHoraire ? 'PUT' : 'POST';
      const url = editHoraire ? `/api/admin/horaires/${editHoraire.id}` : '/api/admin/horaires';
      console.log('Sending payload to ' + url, payload);
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const txt = await res.text();
        console.error('Erreur sauvegarde horaire:', txt);
        setError('Erreur lors de la sauvegarde: ' + (txt || 'serveur'));
        return;
      }
      const data = await res.json();
      // appliquer la réponse serveur dans l'état local pour que la modale affiche les valeurs persistées
      try {
        if (data) {
          setDepartStationId(data.depart_station_id || '');
          setArriveeStationId(data.arrivee_station_id || '');
          setDepartTime(toTimeInputValue(data.depart_time || ''));
          setArriveeTime(toTimeInputValue(data.arrivee_time || ''));
          setNumeroTrain(data.numero_train || '');
          setTypeTrain(data.type_train || '');
          setStops(Array.isArray(data.stops) ? data.stops : []);
          setJours(data.jours_circulation || jours);
          setCirculentJoursFeries(Boolean(data.circulent_jours_feries));
          setCirculentDimanches(Boolean(data.circulent_dimanches));
          setJoursPersonnalises(Array.isArray(data.jours_personnalises) ? data.jours_personnalises.join('\n') : (data.jours_personnalises || ''));
          setMaterielId(data.materiel_id || '');
          setLigneId(data.ligne_id || '');
          setServiceAnnuelId(data.service_annuel_id || '');
          setIsSubstitution(Boolean(data.is_substitution));
        }
      } catch (e) { console.error('Apply server response to state failed', e); }

      // Retarder la mise à jour DOM pour laisser React monter les WCS, puis appeler onSuccess
      setTimeout(() => {
         try {
           const form = formRef.current;
          console.log('[HoraireForm] applying server response to DOM, data:', data);
           if (form && data) {
            // principales valeurs
            const ds = form.querySelector('wcs-select[data-field="depart-station"]') || form.querySelector('select[data-field="depart-station"]');
            const as = form.querySelector('wcs-select[data-field="arrivee-station"]') || form.querySelector('select[data-field="arrivee-station"]');
            const dt = form.querySelector('wcs-input[data-field="depart-time"]') || form.querySelector('input[data-field="depart-time"]');
            const at = form.querySelector('wcs-input[data-field="arrivee-time"]') || form.querySelector('input[data-field="arrivee-time"]');
            const num = form.querySelector('wcs-input[data-field="numero-train"]') || form.querySelector('input[data-field="numero-train"]');
            const typ = form.querySelector('wcs-input[data-field="type-train"]') || form.querySelector('input[data-field="type-train"]');
            applyToWcsElement(ds, { value: data.depart_station_id || '' });
            applyToWcsElement(as, { value: data.arrivee_station_id || '' });
            applyToWcsElement(dt, { value: data.depart_time ? toTimeInputValue(data.depart_time) : '' });
            applyToWcsElement(at, { value: data.arrivee_time ? toTimeInputValue(data.arrivee_time) : '' });
            applyToWcsElement(num, { value: data.numero_train || '' });
            applyToWcsElement(typ, { value: data.type_train || '' });
            // ligne
            const lg = form.querySelector('wcs-select[data-field="ligne"]') || form.querySelector('select[data-field="ligne"]');
            if (lg) applyToWcsElement(lg, { value: data.ligne_id || '' });
            // service annuel
            const sa = form.querySelector('wcs-select[data-field="service-annuel"]') || form.querySelector('select[data-field="service-annuel"]');
            if (sa) applyToWcsElement(sa, { value: data.service_annuel_id || '' });
             // stops
             const stopNodes = form.querySelectorAll('[data-stop-row]');
             if (Array.isArray(data.stops) && stopNodes.length) {
               Array.from(stopNodes).forEach((node, idx) => {
                 const s = data.stops[idx] || {};
                 const sel = node.querySelector('wcs-select[data-field="stop-station"]') || node.querySelector('select[data-field="stop-station"]');
                 const inArr = node.querySelector('wcs-input[data-field="stop-arrivee"]') || node.querySelector('input[data-field="stop-arrivee"]');
                 const inDep = node.querySelector('wcs-input[data-field="stop-depart"]') || node.querySelector('input[data-field="stop-depart"]');
                 if (sel) applyToWcsElement(sel, { value: s.station_id || '' });
                 if (inArr) applyToWcsElement(inArr, { value: s.arrivee_time ? toTimeInputValue(s.arrivee_time) : '' });
                 if (inDep) applyToWcsElement(inDep, { value: s.depart_time ? toTimeInputValue(s.depart_time) : '' });
               });
             }
             // jours
             ['lun','mar','mer','jeu','ven','sam','dim'].forEach(d => {
               const cb = form.querySelector(`wcs-checkbox[data-day="${d}"]`) || form.querySelector(`input[data-day="${d}"]`);
               if (cb) applyToWcsElement(cb, { checked: Boolean((data.jours_circulation || {})[d]) });
             });
             const jf = form.querySelector('wcs-checkbox[data-field="jours-feries"]') || form.querySelector('input[data-field="jours-feries"]');
             if (jf) applyToWcsElement(jf, { checked: Boolean(data.circulent_jours_feries) });
             const jd = form.querySelector('wcs-checkbox[data-field="dimanches"]') || form.querySelector('input[data-field="dimanches"]');
             if (jd) applyToWcsElement(jd, { checked: Boolean(data.circulent_dimanches) });
           }
         } catch (e) { /* ignore DOM update errors */ }

        // Diagnostics supplémentaires : lire et logger les valeurs appliquées
        try {
          const form = formRef.current;
          if (form) {
            const ds = form.querySelector('wcs-select[data-field="depart-station"]') || form.querySelector('select[data-field="depart-station"]');
            const as = form.querySelector('wcs-select[data-field="arrivee-station"]') || form.querySelector('select[data-field="arrivee-station"]');
            const dt = form.querySelector('wcs-input[data-field="depart-time"]') || form.querySelector('input[data-field="depart-time"]');
            const at = form.querySelector('wcs-input[data-field="arrivee-time"]') || form.querySelector('input[data-field="arrivee-time"]');
            const lg = form.querySelector('wcs-select[data-field="ligne"]') || form.querySelector('select[data-field="ligne"]');
            const sa = form.querySelector('wcs-select[data-field="service-annuel"]') || form.querySelector('select[data-field="service-annuel"]');
            console.log('[HoraireForm][diagnostic] DOM values after apply:', {
              depart_select_exists: !!ds, depart_value: ds ? ds.value : null,
              arrivee_select_exists: !!as, arrivee_value: as ? as.value : null,
              depart_time_exists: !!dt, depart_time: dt ? dt.value : null,
              arrivee_time_exists: !!at, arrivee_time: at ? at.value : null,
              ligne_exists: !!lg, ligne_value: lg ? lg.value : null,
              service_annuel_exists: !!sa, service_annuel_value: sa ? sa.value : null,
             });
           }
         } catch (diagErr) { console.warn('Diag read error', diagErr); }

        // prévenir le parent : garder la modale ouverte si on était en mode édition
        console.log('[HoraireForm] notifying parent onSuccess (keepOpen=', Boolean(editHoraire), ')');
        onSuccess && onSuccess(data, { keepOpen: Boolean(editHoraire) });
      }, 300);
    }catch(e){
      console.error(e);
      setError('Erreur réseau lors de la sauvegarde');
    }
  }

  return (
    <form id="horaire-form" ref={formRef} onSubmit={handleSubmit}>
      {error && <div style={{ padding: 8, background: '#f8d7da', color: '#721c24', marginBottom: 12 }}>{error}</div>}

      {/* Tabs navigation using WCS SNCF tabs */}
      <div style={{ marginBottom: 12 }}>
        <wcs-tabs aria-label="Onglets horaire" align="start" ref={tabsRef}>
          {tabs.map(t => (
            <wcs-tab key={t.key} header={t.label} item-key={t.key}></wcs-tab>
          ))}
        </wcs-tabs>
      </div>

      {/* Tab content (rendered based on activeTab which is synced with WCS tabs) */}
      {activeTab === 'general' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label>Gare de départ</label>
            {loadingStations ? <div>Chargement des gares...</div> : (
              <wcs-select data-field="depart-station" ref={departRef} value={departStationId} required>
                <wcs-select-option value="">-- Choisir --</wcs-select-option>
                {stationsOptions.map(s => <wcs-select-option key={s.id} value={s.id}>{s.nom}</wcs-select-option>)}
              </wcs-select>
            )}
          </div>
          <div>
            <label>Gare d'arrivée</label>
            {loadingStations ? <div>Chargement des gares...</div> : (
              <wcs-select data-field="arrivee-station" ref={arriveeRef} value={arriveeStationId} required>
                <wcs-select-option value="">-- Choisir --</wcs-select-option>
                {stationsOptions.map(s => <wcs-select-option key={s.id} value={s.id}>{s.nom}</wcs-select-option>)}
              </wcs-select>
            )}
          </div>

          <div>
            <label>Heure départ</label>
            <wcs-input data-field="depart-time" type="time" step="60" value={departTime} required />
          </div>
          <div>
            <label>Heure arrivée</label>
            <wcs-input data-field="arrivee-time" type="time" step="60" value={arriveeTime} required />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label>Numéro train</label>
            <wcs-input data-field="numero-train" ref={numeroRef} value={numeroTrain} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label>Type de train</label>
            <wcs-input data-field="type-train" ref={typeRef} value={typeTrain} placeholder="Ex: TER, TGV, Intercités" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label>Ligne</label>
            {loadingLignes ? <div>Chargement des lignes...</div> : (
              <wcs-select data-field="ligne" ref={ligneRef} value={ligneId}>
                <wcs-select-option value="">-- Aucun --</wcs-select-option>
                {safeLignesOptions.map(l => <wcs-select-option key={l.id} value={l.id}>{l.nom || l.label || l.id}</wcs-select-option>)}
              </wcs-select>
            )}
            <div style={{ marginTop: 8 }}>
              <label>ou entrer un identifiant ligne</label>
              <wcs-input type="text" value={ligneId} onChange={e=>setLigneId(e.target.value)} />
            </div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label>Service Annuel</label>
            {loadingServicesAnnuels ? <div>Chargement des services annuels...</div> : (
              <wcs-select data-field="service-annuel" ref={serviceAnnuelRef} value={serviceAnnuelId}>
                <wcs-select-option value="">-- Aucun --</wcs-select-option>
                {Array.isArray(servicesAnnuelsOptions) && servicesAnnuelsOptions.map(sa => (
                  <wcs-select-option key={sa.id} value={sa.id}>
                    {sa.nom || `${sa.date_debut || ''} → ${sa.date_fin || ''}`}
                  </wcs-select-option>
                ))}
              </wcs-select>
            )}
            <div style={{ marginTop: 8 }}>
              <label>ou entrer un identifiant de service annuel</label>
              <wcs-input type="text" value={serviceAnnuelId} onChange={e=>setServiceAnnuelId(e.target.value)} />
            </div>
            <div style={{ marginTop: 6, color: 'var(--wcs-text-medium)', fontSize: 12 }}>
              Le service annuel détermine l'intervalle de dates pendant lequel cet horaire circule (en complément des jours de desserte).
            </div>
          </div>
        </div>
      )}

      {activeTab === 'gares-desservies' && (
        <div>
          <div style={{ marginBottom: 8 }}>
            <wcs-button type="button" onClick={addStop}>Ajouter une gare desservie</wcs-button>
          </div>
          {stops.length === 0 && <div>Aucune gare desservie ajoutée</div>}
          {stops.map((st, i) => (
            <div key={i} data-stop-row style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <div>
                <label>Gare</label>
                <wcs-select data-field="stop-station" data-index={i} value={st.station_id} required>
                  <wcs-select-option value="">-- Choisir --</wcs-select-option>
                  {stationsOptions.map(s => <wcs-select-option key={s.id} value={s.id}>{s.nom}</wcs-select-option>)}
                </wcs-select>
              </div>
              <div>
                <label>Heure arrivée</label>
                <wcs-input data-field="stop-arrivee" data-index={i} type="time" step="60" value={st.arrivee_time ? toTimeInputValue(st.arrivee_time) : ''} />
              </div>
              <div>
                <label>Heure départ</label>
                <wcs-input data-field="stop-depart" data-index={i} type="time" step="60" value={st.depart_time ? toTimeInputValue(st.depart_time) : ''} />
              </div>
              <div>
                <wcs-button type="button" onClick={()=>removeStop(i)}>Suppr</wcs-button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'jours-dessertes' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {['lun','mar','mer','jeu','ven','sam','dim'].map(k => (
              <wcs-checkbox key={k} data-day={k} checked={jours[k]}>
                {k.toUpperCase()}
              </wcs-checkbox>
            ))}
          </div>
          <div style={{ marginBottom: 8 }}>
            <wcs-checkbox data-field="jours-feries" checked={circulentJoursFeries}>Circulent les jours fériés</wcs-checkbox>
          </div>
          <div style={{ marginBottom: 8 }}>
            <wcs-checkbox data-field="dimanches" checked={circulentDimanches}>Circulent les dimanches</wcs-checkbox>
          </div>
          <div style={{ marginBottom: 8 }}>
            <button type="button" onClick={() => { /* toggle show */ setJoursPersonnalises(jp => jp || ''); }}>Personnaliser</button>
          </div>
          <div>
            <label>Jours personnalisés (une date par ligne, format YYYY-MM-DD)</label>
            <wcs-input type="textarea" rows={4} value={joursPersonnalises} onChange={e=>setJoursPersonnalises(e.target.value)} style={{ width: '100%' }} />
          </div>
        </div>
      )}

      {activeTab === 'materiel-roulant' && (
        <div>
          <div>
            <label>Matériel roulant (choisir)</label>
            {loadingMateriels ? <div>Chargement...</div> : (
              <wcs-select data-field="materiel" ref={materielRef} value={materielId}>
                <wcs-select-option value="">-- Aucun --</wcs-select-option>
                {safeMaterielsOptions.map(m => <wcs-select-option key={m.id} value={m.id}>{m.nom || m.label || m.id}</wcs-select-option>)}
              </wcs-select>
            )}
            <div style={{ marginTop: 8 }}>
              <label>ou entrer un identifiant matériel</label>
              <wcs-input type="text" value={materielId} onChange={e=>setMaterielId(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'substitution' && (
        <div>
          <wcs-checkbox data-field="is-substitution" checked={isSubstitution}>Sillon prévu pour substitution (autocar)</wcs-checkbox>
        </div>
      )}


    </form>
  );
}

// Synchronisation entre React state <-> WCS tabs
// On place ces hooks en bas du module afin d'éviter de dupliquer le code lors de l'édition au dessus.
// (Le module importe React et les hooks en haut du fichier.)
function useWcsTabsSync(tabsRef, activeTab, setActiveTab) {
  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    // initialiser selected-key
    try { el.selectedKey = activeTab; } catch(e) {}
    try { el.setAttribute && el.setAttribute('selected-key', activeTab); } catch(e) {}
  }, [activeTab, tabsRef]);

  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    const handler = (ev) => {
      // évènement émis par le composant WCS : detail.selectedKey
      const newKey = ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.selectedKey || ev?.detail?.tabName || ev?.detail?.selectedKey;
      if (newKey) setActiveTab(String(newKey));
    };
    el.addEventListener && el.addEventListener('tabChange', handler);
    return () => el.removeEventListener && el.removeEventListener('tabChange', handler);
  }, [tabsRef, setActiveTab]);
}

// Hook call (placed after declaration to keep file edits minimal)
// We call it through a small effect inside the component (top-level call not allowed), so we'll wire it inside the component via useEffect below.
