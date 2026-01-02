"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import InfoBanner from '../../../../components/InfoBanner';
import Header from '../../../../components/Header';
import NavigationBar from '../../../../components/NavigationBar';
import styles from './page.module.css';

function slugify(name) {
  if (!name) return '';
  return encodeURIComponent(String(name).toLowerCase().trim()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, ''));
}

export default function StationHorairesPage() {
  const params = useParams();
  const slug = params?.station || '';

  const [station, setStation] = useState(null);
  const [stationName, setStationName] = useState('');
  const [horaires, setHoraires] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('depart'); // default to departures
  const [expandedId, setExpandedId] = useState(null);
  const [stationMap, setStationMap] = useState({});
  const [stationCodeMap, setStationCodeMap] = useState({});
  const [perturbations, setPerturbations] = useState([]);

  function toggleExpanded(id) {
    setExpandedId(prev => (prev === id ? null : id));
  }

  function handleKeyToggle(e, id) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleExpanded(id);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function loadStations() {
      try {
        const resStations = await fetch('/api/admin/stations', { cache: 'no-store' });
        if (!resStations.ok) {
          console.warn('loadStations: stations API returned', resStations.status);
          if (mounted) setError(`Erreur ${resStations.status}`);
          return;
        }
        const stationsData = await resStations.json();
        let found = null;
        if (Array.isArray(stationsData)) {
          found = stationsData.find(s => slugify(s.nom) === String(slug).toLowerCase());
        }
        if (!found) {
          const guessed = decodeURIComponent(slug || '').replace(/-/g, ' ').toLowerCase();
          if (Array.isArray(stationsData)) {
            found = stationsData.find(s => (s.nom || '').toLowerCase().trim() === guessed.trim());
          }
        }

        if (mounted) {
          if (Array.isArray(stationsData)) {
            const map = {};
            const codeMap = {};
            stationsData.forEach(s => { if (s && s.id != null) map[Number(s.id)] = s.nom || ''; if (s && s.code) codeMap[String(s.code).toUpperCase()] = s.nom || ''; });
            setStationMap(map);
            setStationCodeMap(codeMap);
          }
          if (found) {
            setStation(found);
            setStationName(found.nom || '');
          } else {
            setStation(null);
            setStationName(decodeURIComponent(slug || '').replace(/-/g, ' '));
          }
        }
      } catch (e) {
        console.error('Erreur chargement gares', e);
        if (mounted) setError(e && e.message ? e.message : 'Erreur');
      }
    }

    loadStations();

    return () => { mounted = false; };
  }, [slug]);

  // fetchHoraires: récupère la liste des horaires et met à jour l'état — appelé directement et en polling
  async function fetchHoraires() {
    try {
      setLoading(true);
      // If we have the station and its code, call the CODE API
      const stationCode = station && station.code ? String(station.code).toUpperCase() : null;
      let list = [];
      if (stationCode) {
        const res = await fetch(`/api/admin/horaires/by-code/${encodeURIComponent(stationCode)}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          list = Array.isArray(data) ? data : (data && Array.isArray(data.mapped) ? data.mapped : []);
        } else {
          // fallback to collection if code endpoint fails
          console.warn('Fetch by code failed, falling back to collection', res.status);
          const r2 = await fetch('/api/admin/horaires', { cache: 'no-store' });
          if (r2.ok) {
            const d2 = await r2.json();
            list = Array.isArray(d2) ? d2 : [];
          }
        }
      } else {
        // no code available yet -> fallback to fetching full collection
        const res = await fetch('/api/admin/horaires', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          list = Array.isArray(data) ? data : [];
        }
      }
      setHoraires(list);
      // charger les perturbations depuis la BDD pour pouvoir les appliquer localement
      try {
        const rp = await fetch('/api/admin/perturbations', { cache: 'no-store' });
        if (rp.ok) {
          const pd = await rp.json();
          setPerturbations(Array.isArray(pd) ? pd : []);
        } else {
          setPerturbations([]);
        }
      } catch (e) { console.warn('Impossible de charger perturbations', e); setPerturbations([]); }
      setError('');
    } catch (e) {
      console.error('Erreur chargement horaires', e);
      setError(e && e.message ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  // fetch perturbations séparément (utilisé au chargement initial)
  async function fetchPerturbations() {
    try {
      const rp = await fetch('/api/admin/perturbations', { cache: 'no-store' });
      if (rp.ok) {
        const pd = await rp.json();
        setPerturbations(Array.isArray(pd) ? pd : []);
      } else {
        setPerturbations([]);
      }
    } catch (e) {
      console.warn('Impossible de charger perturbations', e);
      setPerturbations([]);
    }
  }

  // polling des horaires toutes les 30s — au chargement, on force un fetch des perturbations puis des horaires
  useEffect(() => {
    let mounted = true;
    async function init() {
      await fetchPerturbations();
      await fetchHoraires();
      // si besoin on pourrait installer un interval pour rafraichir régulièrement
    }
    init();
    return () => { mounted = false; };
  }, [slug]);

  function filterHoraires() {
    if (!station && !stationName) return [];
    const stationId = station && station.id != null ? Number(station.id) : null;
    const stationCode = station && station.code ? String(station.code).toUpperCase() : null;

    // helper: détecte si l'horaire a un arrêt (avec stop) correspondant à la gare
    function findStopAtStation(h) {
      if (!Array.isArray(h.stops)) return null;
      for (const s of h.stops) {
        if (!s) continue;
        const scode = s.station_code ? String(s.station_code).toUpperCase() : null;
        const sid = s.station_id != null ? Number(s.station_id) : null;
        if (scode && stationCode && scode === stationCode) return s;
        if (sid != null && stationId != null && sid === stationId) return s;
      }
      return null;
    }

    // helper: indique si l'horaire a une arrivée à la gare
    function isArrivalAtStation(h) {
      if (stationCode && h.arrivee_station_code && String(h.arrivee_station_code).toUpperCase() === stationCode) return true;
      if (stationId != null && Number(h.arrivee_station_id) === stationId) return true;
      const stop = findStopAtStation(h);
      if (stop) {
        // considérer arrivée si une arrivee_time est fournie on the stop
        if (stop.arrivee_time) return true;
        // si le stop n'a que depart_time, on ne le considère pas comme arrivée
      }
      // fallback par nom
      const name = (stationName || '').toLowerCase().trim();
      if (h.arrivee_station_name) return h.arrivee_station_name.toString().toLowerCase().trim() === name;
      return false;
    }

    // helper: indique si l'horaire a un départ à la gare
    function isDepartureAtStation(h) {
      if (stationCode && h.depart_station_code && String(h.depart_station_code).toUpperCase() === stationCode) return true;
      if (stationId != null && Number(h.depart_station_id) === stationId) return true;
      const stop = findStopAtStation(h);
      if (stop) {
        // considérer départ si une depart_time est fournie on the stop
        if (stop.depart_time) return true;
        // si le stop n'a que arrivee_time, on ne le considère pas comme départ
      }
      // fallback par nom
      const name = (stationName || '').toLowerCase().trim();
      if (h.depart_station_name) return h.depart_station_name.toString().toLowerCase().trim() === name;
      return false;
    }

    // filtrer selon le mode choisi (départs ou arrivées)
    if (mode === 'depart') {
      return horaires.filter(h => isDepartureAtStation(h));
    }
    // défaut = 'arrivees'
    return horaires.filter(h => isArrivalAtStation(h));
  }

  // helper: obtenir l'heure d'un horaire pour la gare (cherche dans stops sinon utilise depart/arrivee time)
  function getTimeAtStation(h) {
    const stationId = station && station.id != null ? Number(station.id) : null;
    const stationCode = station && station.code ? String(station.code).toUpperCase() : null;

    // Si on est en mode 'arrivees', privilégier l'heure d'arrivée
    if (mode === 'arrivees') {
      if (stationCode && h.arrivee_station_code && String(h.arrivee_station_code).toUpperCase() === stationCode && h.arrivee_time) return h.arrivee_time;
      if (stationId != null && Number(h.arrivee_station_id) === stationId && h.arrivee_time) return h.arrivee_time;
    } else {
      // mode depart -> privilégier heure de départ
      if (stationCode && h.depart_station_code && String(h.depart_station_code).toUpperCase() === stationCode && h.depart_time) return h.depart_time;
      if (stationId != null && Number(h.depart_station_id) === stationId && h.depart_time) return h.depart_time;
    }

    // chercher dans stops pour trouver le stop correspondant
    if (Array.isArray(h.stops)) {
      for (const s of h.stops) {
        if (!s) continue;
        const scode = s.station_code ? String(s.station_code).toUpperCase() : null;
        const sid = s.station_id != null ? Number(s.station_id) : null;
        if ((scode && stationCode && scode === stationCode) || (sid != null && stationId != null && sid === stationId)) {
          // en mode arrivees -> prefer arrivee_time sur le stop
          if (mode === 'arrivees') {
            if (s.arrivee_time) return s.arrivee_time;
            if (s.depart_time) return s.depart_time; // fallback
          } else {
            // mode depart -> prefer depart_time sur le stop
            if (s.depart_time) return s.depart_time;
            if (s.arrivee_time) return s.arrivee_time; // fallback
          }
        }
      }
    }

    // fallback: si la gare est exactement le depart/arrivée global du trajet
    if (mode === 'arrivees') {
      if (h.arrivee_time) return h.arrivee_time;
      if (h.depart_time) return h.depart_time;
    } else {
      if (h.depart_time) return h.depart_time;
      if (h.arrivee_time) return h.arrivee_time;
    }

    return null;
  }

  // helper: obtenir le quai attribué pour l'horaire `h` pour la gare sélectionnée
  function getAssignedQuai(h) {
    try {
      const stationCode = station && station.code ? String(station.code).toUpperCase() : null;
      let attribution = {};
      if (h && h.attribution_quais) {
        if (typeof h.attribution_quais === 'object') attribution = h.attribution_quais;
        else {
          try { attribution = JSON.parse(h.attribution_quais); } catch (e) { attribution = {}; }
        }
      }

      if (stationCode && attribution && attribution[stationCode]) return String(attribution[stationCode]);

      // tenter via les stops : chercher un stop correspondant et vérifier s'il y a une clé par code
      if (Array.isArray(h.stops)) {
        for (const s of h.stops) {
          if (!s) continue;
          const scode = s.station_code ? String(s.station_code).toUpperCase() : (s.station && s.station.code ? String(s.station.code).toUpperCase() : null);
          if (scode && attribution && attribution[scode]) return String(attribution[scode]);
        }
      }

      return '';
    } catch (e) {
      return '';
    }
  }

  // helper: find stop entry for current station within an horaire
  function findStopAtStationGeneric(h) {
    if (!h) return null;
    const stationId = station && station.id != null ? Number(station.id) : null;
    const stationCode = station && station.code ? String(station.code).toUpperCase() : null;
    // check stops array
    if (Array.isArray(h.stops)) {
      for (const s of h.stops) {
        if (!s) continue;
        const scode = s.station_code ? String(s.station_code).toUpperCase() : (s.station && s.station.code ? String(s.station.code).toUpperCase() : null);
        const sid = s.station_id != null ? Number(s.station_id) : null;
        if (scode && stationCode && scode === stationCode) return s;
        if (sid != null && stationId != null && sid === stationId) return s;
      }
    }
    // check global depart/arrivee
    if (stationCode && h.depart_station_code && String(h.depart_station_code).toUpperCase() === stationCode) return { depart_time: h.depart_time };
    if (stationCode && h.arrivee_station_code && String(h.arrivee_station_code).toUpperCase() === stationCode) return { arrivee_time: h.arrivee_time };
    if (stationId != null && h.depart_station_id != null && Number(h.depart_station_id) === stationId) return { depart_time: h.depart_time };
    if (stationId != null && h.arrivee_station_id != null && Number(h.arrivee_station_id) === stationId) return { arrivee_time: h.arrivee_time };
    return null;
  }

  // helper: déterminer le retard appliqué à la gare pour un horaire
  function getDelayForStation(h) {
    try {
      // priorité: champ temps_retard_minutes global
      let globalDelay = null;
      if (h && (h.temps_retard_minutes || h.temps_retard)) {
        globalDelay = Number(h.temps_retard_minutes ?? h.temps_retard);
        if (!Number.isFinite(globalDelay)) globalDelay = null;
      }

      // inspect parcours_changes (peut être array ou JSON string)
      const pcRaw = h && h.parcours_changes ? h.parcours_changes : null;
      let pcArr = [];
      if (pcRaw) {
        if (Array.isArray(pcRaw)) pcArr = pcRaw;
        else if (typeof pcRaw === 'string') {
          try { pcArr = JSON.parse(pcRaw); } catch (e) { pcArr = []; }
        } else if (typeof pcRaw === 'object') pcArr = Object.values(pcRaw);
      }

      // find explicit change on this station
      const stationId = station && station.id != null ? Number(station.id) : null;
      const stationCode = station && station.code ? String(station.code).toUpperCase() : null;
      for (const c of pcArr) {
        if (!c) continue;
        const cSid = c.station_id != null ? Number(c.station_id) : null;
        const cCode = c.station_code ? String(c.station_code).toUpperCase() : null;
        // possible keys: nom, station_id, station_code
        const matches = (cSid != null && stationId != null && cSid === stationId) || (cCode && stationCode && cCode === stationCode) || (c.nom && stationName && String(c.nom).toLowerCase().trim() === String(stationName).toLowerCase().trim());
        if (matches) {
          const delay = Number(c.delayMinutes ?? c.delay_minutes ?? c.delay ?? globalDelay ?? 0) || 0;
          const action = c.action || (delay > 0 ? 'retard' : null);
          const propagated = Boolean(c.propagated);
          if (action === 'retard' || action === 'prolonge' || delay > 0) {
            return { delayMinutes: delay, action, propagated };
          }
        }
      }

      // if no explicit change on this station, but a global delay or a change elsewhere that is propagated, consider propagation
      if (globalDelay != null) return { delayMinutes: globalDelay, action: 'retard', propagated: false };
      // check for any propagated change earlier in parcours that may affect this station
      if (pcArr.length > 0) {
        const prow = findStopAtStationGeneric(h);
        if (prow) {
          // find index in stops array if possible
          const stops = Array.isArray(h.stops) ? h.stops : [];
          const idx = stops.findIndex(s => {
            if (!s) return false;
            const sid = s.station_id != null ? Number(s.station_id) : null;
            const scode = s.station_code ? String(s.station_code).toUpperCase() : null;
            if (sid != null && stationId != null && sid === stationId) return true;
            if (scode && stationCode && scode === stationCode) return true;
            return false;
          });
          // find any change with propagated true and index smaller than current
          for (const c of pcArr) {
            if (!c) continue;
            if (!c.propagated && !(c.action === 'retard' || c.action === 'prolonge')) continue;
            // try to get index of change
            let cIdx = -1;
            if (typeof c.index === 'number') cIdx = Number(c.index);
            else if (c.id && stops) cIdx = stops.findIndex(s => (s && ((s.station_id != null && String(s.station_id) === String(c.station_id)) || (s.station_code && String(s.station_code).toUpperCase() === String(c.station_code).toUpperCase()))));
            if (cIdx >=0 && idx >= 0 && idx > cIdx) {
              const delay = Number(c.delayMinutes ?? c.delay_minutes ?? c.delay ?? 0) || 0;
              if (delay > 0) return { delayMinutes: delay, action: c.action || 'retard', propagated: true };
            }
          }
        }
      }

      return null;
    } catch (e) { return null; }
  }

   // helper: obtenir le quai attribué pour un stop particulier `s` (utilisé dans l'accordéon)
   function getAssignedQuaiForStop(h, s) {
     try {
       let attribution = {};
       if (h && h.attribution_quais) {
         if (typeof h.attribution_quais === 'object') attribution = h.attribution_quais;
         else {
           try { attribution = JSON.parse(h.attribution_quais); } catch (e) { attribution = {}; }
         }
       }
       const scode = s && (s.station_code ? String(s.station_code).toUpperCase() : (s.station && s.station.code ? String(s.station.code).toUpperCase() : null));
       if (scode && attribution && attribution[scode]) return String(attribution[scode]);
       return '';
     } catch (e) { return ''; }
   }

    // helper: construire le libelle Mode
    function modeLabel(h) {
    const type = h.type_train ? String(h.type_train).trim() : '';
    const num = h.numero_train ? String(h.numero_train).trim() : '';
    if (type && num) return `Train ${type} ${num}`;
    if (num) return `Train ${num}`;
    if (type) return `Train ${type}`;
    return 'Train';
    }

    // helper: vérifie si une perturbation concerne un arrêt `s` dans l'horaire `h`
    function getChangeForStop(h, s) {
    try {
      if (!h) return null;
      const raw = h.parcours_changes || h._parcours_changes || null;
      if (!raw) return null;
      let arr = [];
      if (Array.isArray(raw)) arr = raw;
      else if (typeof raw === 'string') {
        try { arr = JSON.parse(raw); } catch (e) { arr = []; }
      } else if (typeof raw === 'object') arr = Array.isArray(raw) ? raw : Object.values(raw);
      if (!Array.isArray(arr) || arr.length === 0) return null;
      const sid = s && s.station_id != null ? Number(s.station_id) : null;
      const scode = s && s.station_code ? String(s.station_code).toUpperCase() : null;
      const sname = (s && (s.station_name || s.nom)) ? String(s.station_name || s.nom).toLowerCase().trim() : null;
      for (const c of arr) {
        if (!c) continue;
        const cSid = c.station_id != null ? Number(c.station_id) : null;
        const cCode = c.station_code ? String(c.station_code).toUpperCase() : null;
        const cName = c.nom ? String(c.nom).toLowerCase().trim() : null;
        if ((cSid != null && sid != null && cSid === sid) || (cCode && scode && cCode === scode) || (cName && sname && cName === sname)) {
          return c;
        }
      }
      return null;
    } catch (e) { return null; }
    }

    // helper: additionne des minutes à une heure 'HH:mm' et retourne 'HH:mm'
    function addMinutesToTimeString(timeStr, minutes) {
    if (!timeStr) return null;
    const parts = String(timeStr).split(':').map(p => Number(p));
    if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null;
    const dt = new Date();
    dt.setHours(parts[0], parts[1], 0, 0);
    dt.setMinutes(dt.getMinutes() + Number(minutes || 0));
    const hh = String(dt.getHours()).padStart(2, '0');
    const mm = String(dt.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
    }

    // helper: calcule le retard applicable pour un stop particulier (recherche changement explicite, retard global, ou propagation)
    function getDelayForStop(h, s, stopIndex = -1, stopsArray = null) {
      try {
        // 1) changement explicite sur le stop (dans parcours_changes)
        const explicit = getChangeForStop(h, s);
        if (explicit) {
          const d = Number(explicit.delayMinutes ?? explicit.delay_minutes ?? explicit.delay ?? explicit.temps_retard_minutes ?? explicit.temps_retard) || 0;
          return { delay: d, change: explicit, propagated: false };
        }

        // 2) retard global sur l'horaire
        if (h && (h.temps_retard_minutes || h.temps_retard)) {
          const d = Number(h.temps_retard_minutes ?? h.temps_retard) || 0;
          if (d > 0) return { delay: d, change: { action: 'retard' }, propagated: false };
        }

        // 3) propagation depuis un changement antérieur dans parcours_changes
        const raw = h && h.parcours_changes ? h.parcours_changes : null;
        let arr = [];
        if (raw) {
          if (Array.isArray(raw)) arr = raw;
          else if (typeof raw === 'string') {
            try { arr = JSON.parse(raw); } catch (e) { arr = []; }
          } else if (typeof raw === 'object') arr = Array.isArray(raw) ? raw : Object.values(raw);
        }
        if (!Array.isArray(arr) || arr.length === 0) return { delay: 0, change: null, propagated: false };

        const stops = Array.isArray(stopsArray) ? stopsArray : (Array.isArray(h.stops) ? h.stops : []);
        // find best preceding change (closest index < stopIndex) that implies a delay or prolongation
        let best = null;
        for (const c of arr) {
          if (!c) continue;
          const action = c.action || null;
          const cDelay = Number(c.delayMinutes ?? c.delay ?? c.delay_minutes ?? c.temps_retard_minutes ?? c.temps_retard) || 0;
          if (!(cDelay > 0 || action === 'retard' || action === 'prolonge')) continue;
          // determine index of c in stops
          let cIdx = -1;
          if (typeof c.index === 'number') cIdx = Number(c.index);
          else if (c.station_id != null || c.station_code || c.nom) {
            cIdx = stops.findIndex(ss => {
              if (!ss) return false;
              const sid = ss.station_id != null ? Number(ss.station_id) : null;
              const scode = ss.station_code ? String(ss.station_code).toUpperCase() : null;
              if (c.station_id != null && sid != null && Number(c.station_id) === sid) return true;
              if (c.station_code && scode && String(c.station_code).toUpperCase() === scode) return true;
              if (c.nom && ss.station_name && String(c.nom).toLowerCase().trim() === String(ss.station_name).toLowerCase().trim()) return true;
              return false;
            });
          }
          if (cIdx >= 0 && stopIndex >= 0 && stopIndex > cIdx) {
            if (!best || (best && best.cIdx < cIdx)) {
              best = { c, cIdx, cDelay };
            }
          }
        }
        if (best) {
          const d = Number(best.cDelay) || 0;
          if (d > 0) return { delay: d, change: best.c, propagated: true };
        }

        return { delay: 0, change: null, propagated: false };
      } catch (e) {
        return { delay: 0, change: null, propagated: false };
      }
    }

  // helper: vérifie si une heure 'HH:mm' n'est pas passée aujourd'hui
   function isTimeNotPassed(timeStr) {
     if (!timeStr) return true; // si pas d'heure on conserve
     const parts = String(timeStr).split(':').map(s => s.trim());
     if (parts.length < 2) return true;
     const hh = Number(parts[0]);
     const mm = Number(parts[1]);
     if (!Number.isFinite(hh) || !Number.isFinite(mm)) return true;
     const now = new Date();
     const compare = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
     return compare >= now;
   }

   // helper: vérifie si un horaire circule à une date donnée en se basant sur jours_circulation
   function runsOnDate(h, date) {
     try {
       const jc = h.jours_circulation;
       if (!jc || typeof jc !== 'object' || Object.keys(jc).length === 0) return true; // pas d'info => assume true
       const map = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
       const key = map[date.getDay()];
       return Boolean(jc[key]);
     } catch (e) {
       return true;
     }
   }

   function formatDaySeparatorLabel(offsetDays = 1) {
     const d = new Date();
     d.setDate(d.getDate() + offsetDays);
     const options = { weekday: 'long', day: 'numeric', month: 'long' };
     const label = d.toLocaleDateString('fr-FR', options);
     return label.charAt(0).toUpperCase() + label.slice(1);
   }

  // Build mapped lists for today and tomorrow, en appliquant les perturbations présentes en base
  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);

  // helper: vérifie si une perturbation s'applique à une date donnée
  function perturbationAppliesOnDate(pert, date) {
    try {
      if (!pert) return false;
      // si perturbation a jours_impact vide ou null -> appliquer globalement
      if (!pert.jours_impact || (Array.isArray(pert.jours_impact) && pert.jours_impact.length === 0)) return true;

      // helper: format YYYY-MM-DD en local
      const toLocalYMD = (d) => {
        if (!d) return null;
        try {
          if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
          const dt = new Date(d);
          if (Number.isNaN(dt.getTime())) return null;
          const y = dt.getFullYear();
          const m = String(dt.getMonth() + 1).padStart(2, '0');
          const day = String(dt.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        } catch (e) { return null; }
      };

      // normaliser jours_impact en tableau
      const raw = Array.isArray(pert.jours_impact) ? pert.jours_impact : (typeof pert.jours_impact === 'string' ? [pert.jours_impact] : []);
      const targetYMD = toLocalYMD(date);
      if (!targetYMD) return false;

      // map jours abrégés (fr) -> index JS (0 dim .. 6 sam)
      const dayMap = { 'dim':0, 'lun':1, 'mar':2, 'mer':3, 'jeu':4, 'ven':5, 'sam':6 };

      for (const item of raw) {
        if (item == null) continue;
        const s = String(item).trim();
        // si correspond à YYYY-MM-DD ou ISO utilisable
        const ymd = toLocalYMD(s);
        if (ymd && ymd === targetYMD) return true;
        // support noms de jours en minuscule (lun/mar... ou Lundi etc)
        const lower = s.toLowerCase();
        if (dayMap[lower]) {
          if (date.getDay() === dayMap[lower]) return true;
        } else if (Object.keys(dayMap).includes(lower.slice(0,3))) {
          // handle full names like 'lundi'
          if (date.getDay() === dayMap[lower.slice(0,3)]) return true;
        }
      }
      return false;
    } catch (e) { return false; }
  }

  // helper: test si une perturbation concerne un horaire
  function perturbationMatchesHoraire(pert, h) {
    try {
      if (!pert || !h) return false;
      if (pert.horaire_id && h.id && String(pert.horaire_id) === String(h.id)) return true;
      if (pert.numero_train && h.numero_train && String(pert.numero_train) === String(h.numero_train)) return true;
      return false;
    } catch (e) { return false; }
  }

  // applique les perturbations pertinentes à l'horaire pour une date donnée et renvoie une copie modifiée
  function applyPerturbationsForDateToHoraire(h, date) {
    if (!h) return h;
    const copy = { ...h };
    const applicable = (perturbations || []).filter(p => perturbationMatchesHoraire(p, h) && perturbationAppliesOnDate(p, date));
    if (!applicable || applicable.length === 0) return copy;
    // combiner : priorité au plus grand retard si plusieurs
    const delays = applicable.map(p => Number(p.temps_retard_minutes ?? p.temps_retard ?? 0) || 0);
    const maxDelay = delays.length > 0 ? Math.max(...delays) : null;
    if (maxDelay != null && maxDelay > 0) copy.temps_retard_minutes = maxDelay;
    // si on a parcours_changes fournis par la perturbation, on applique la première non vide
    for (const p of applicable) {
      if (p.parcours_changes) {
        try {
          copy.parcours_changes = Array.isArray(p.parcours_changes) ? p.parcours_changes : (typeof p.parcours_changes === 'string' ? JSON.parse(p.parcours_changes) : p.parcours_changes);
          break;
        } catch (e) { /* ignore parse error */ }
      }
    }
    // detect full schedule suppression: only consider it when a perturbation explicitly has type 'suppression'
    try {
      const supPert = applicable.find(p => p && p.type && String(p.type).toLowerCase() === 'suppression');
      if (supPert) {
        copy._isCancelled = true;
        const suppressionCause = supPert.cause || supPert.reason || null;
        if (suppressionCause) copy._cancellationCause = suppressionCause;
      }
    } catch (e) { /* noop */ }

    // attacher les perturbations appliquées pour debug/UI
    copy._perturbations_applied = applicable;
    return copy;
  }

  // helper: détecte si un horaire a une modification de parcours appliquée
  function hasParcoursModification(h) {
    try {
      if (!h) return false;
      const applied = h._perturbations_applied || [];
      if (Array.isArray(applied) && applied.some(p => p && String(p.type || '').toLowerCase() === 'modification_parcours')) return true;
      const raw = h.parcours_changes || h._parcours_changes || null;
      if (!raw) return false;
      let arr = [];
      if (Array.isArray(raw)) arr = raw;
      else if (typeof raw === 'string') {
        try { arr = JSON.parse(raw); } catch (e) { arr = []; }
      } else if (typeof raw === 'object') arr = Array.isArray(raw) ? raw : Object.values(raw);
      if (!Array.isArray(arr) || arr.length === 0) return false;
      // si au moins un changement n'est pas une suppression, on considère qu'il s'agit d'une modification de parcours
      return arr.some(c => c && !(c.action && String(c.action).toLowerCase().includes('supp')));
    } catch (e) { return false; }
  }

  // helper: retourne le nom de la nouvelle gare de terminus si dans parcours_changes le dernier élément
  // avec action === 'none' existe (priorité : station_id -> station_code -> nom)
  function getNewTerminusFromParcoursChanges(h) {
    try {
      if (!h) return null;
      const raw = h.parcours_changes || h._parcours_changes || null;
      if (!raw) return null;
      let arr = [];
      if (Array.isArray(raw)) arr = raw;
      else if (typeof raw === 'string') {
        try { arr = JSON.parse(raw); } catch (e) { arr = []; }
      } else if (typeof raw === 'object') arr = Array.isArray(raw) ? raw : Object.values(raw);
      if (!Array.isArray(arr) || arr.length === 0) return null;
      for (let i = arr.length - 1; i >= 0; i--) {
        const c = arr[i];
        if (!c) continue;
        const action = (c.action || '').toString().toLowerCase().trim();
        if (action === 'none') {
          const name = c.nom || c.station_name || null;
          return stationNameById(c.station_id, name, c.station_code);
        }
      }
      return null;
    } catch (e) { return null; }
  }

  // helper: retourne l'objet de changement correspondant au nouveau terminus (dernier élément action === 'none')
  function getNewTerminusChange(h) {
    try {
      if (!h) return null;
      const raw = h.parcours_changes || h._parcours_changes || null;
      if (!raw) return null;
      let arr = [];
      if (Array.isArray(raw)) arr = raw;
      else if (typeof raw === 'string') {
        try { arr = JSON.parse(raw); } catch (e) { arr = []; }
      } else if (typeof raw === 'object') arr = Array.isArray(raw) ? raw : Object.values(raw);
      if (!Array.isArray(arr) || arr.length === 0) return null;
      for (let i = arr.length - 1; i >= 0; i--) {
        const c = arr[i];
        if (!c) continue;
        const action = (c.action || '').toString().toLowerCase().trim();
        if (action === 'none') return c;
      }
      return null;
    } catch (e) { return null; }
  }

  // recalculer les listes en mémoire pour s'assurer que les perturbations sont prises en compte
  const allFiltered = useMemo(() => filterHoraires(), [horaires, station, stationName, mode]);

  const mappedToday = useMemo(() => {
    const d = new Date();
    return allFiltered.map(h => {
      const hh = applyPerturbationsForDateToHoraire(h, d);
      return {
        ...hh,
        timeAtStation: getTimeAtStation(hh),
        origin: hh.depart_station_name || '',
        terminus: hh.arrivee_station_name || '',
        modeLabel: modeLabel(hh),
        runsToday: runsOnDate(hh, d),
      };
    });
  }, [allFiltered, perturbations, station, stationName, mode]);

  const mappedTomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return allFiltered.map(h => {
      const hh = applyPerturbationsForDateToHoraire(h, d);
      return {
        ...hh,
        timeAtStation: getTimeAtStation(hh),
        origin: hh.depart_station_name || '',
        terminus: hh.arrivee_station_name || '',
        modeLabel: modeLabel(hh),
        runsTomorrow: runsOnDate(hh, d),
      };
    });
  }, [allFiltered, perturbations, station, stationName, mode]);

  // today: circule aujourd'hui ET heure non passée (ou pas d'heure)
  let todayList = mappedToday.filter(item => {
    if (!item.runsToday) return false;
    if (!item.timeAtStation) return true;
    return isTimeNotPassed(item.timeAtStation);
  }).sort((a, b) => (a.timeAtStation || '').localeCompare(b.timeAtStation || ''));

  // tomorrow: circule demain and not already in today list
  const todayIds = new Set(todayList.map(i => i.id));
  let tomorrowList = mappedTomorrow.filter(item => {
    if (!item.runsTomorrow) return false;
    if (todayIds.has(item.id)) return false;
    return true;
  }).sort((a, b) => (a.timeAtStation || '').localeCompare(b.timeAtStation || ''));

  function stationNameById(id, fallback, code) {
    const codeKey = code ? String(code).toUpperCase() : null;
    if (codeKey && stationCodeMap && stationCodeMap[codeKey]) return stationCodeMap[codeKey];
    const sid = id != null ? Number(id) : null;
    if (sid != null && stationMap && stationMap[sid]) return stationMap[sid];
    if (fallback) return fallback;
    if (codeKey) return codeKey;
    return '';
  }

  function buildStopsForAccordion(h) {
    // NOTE: On affiche maintenant la liste des gares même si l'horaire est marqué comme annulé (_isCancelled)

    const base = Array.isArray(h.stops) ? [...h.stops] : [];
    // normalisation utilisée pour comparer les noms de gares (retirer diacritiques etc.)
    const nameOf = v => (v || '').toString().trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const stationId = station && station.id != null ? Number(station.id) : null;
    const stationCode = station && station.code ? String(station.code).toUpperCase() : null;

    // inject origin/terminus if not included
    const hasOrigin = base.some(s => nameOf(s.station_name || s.nom) === nameOf(h.depart_station_name) || Number(s.station_id) === Number(h.depart_station_id) || (s.station_code && h.depart_station_code && String(s.station_code).toUpperCase() === String(h.depart_station_code).toUpperCase()));
    const hasTerminus = base.some(s => nameOf(s.station_name || s.nom) === nameOf(h.arrivee_station_name) || Number(s.station_id) === Number(h.arrivee_station_id) || (s.station_code && h.arrivee_station_code && String(s.station_code).toUpperCase() === String(h.arrivee_station_code).toUpperCase()));

    if (!hasOrigin && (h.depart_station_name || h.depart_station_id != null || h.depart_station_code)) {
      base.unshift({
        depart_time: h.depart_time || null,
        station_name: stationNameById(h.depart_station_id, h.depart_station_name || '', h.depart_station_code),
        station_id: h.depart_station_id,
        voie: h.voie || '-',
      });
    }
    if (!hasTerminus && (h.arrivee_station_name || h.arrivee_station_id != null || h.arrivee_station_code)) {
      base.push({
        arrivee_time: h.arrivee_time || null,
        station_name: stationNameById(h.arrivee_station_id, h.arrivee_station_name || '', h.arrivee_station_code),
        station_id: h.arrivee_station_id,
        voie: h.voie || '-',
      });
    }

    // --- Nouvelle logique: inclure les gares référencées par parcours_changes (perturbations)
    try {
      const raw = h.parcours_changes || h._parcours_changes || null;
      let arr = [];
      if (raw) {
        if (Array.isArray(raw)) arr = raw;
        else if (typeof raw === 'string') {
          try { arr = JSON.parse(raw); } catch (e) { arr = []; }
        } else if (typeof raw === 'object') arr = Array.isArray(raw) ? raw : Object.values(raw);
      }
      if (Array.isArray(arr) && arr.length > 0) {
        // for each change, if it references a station not already in base, insert it
        for (const c of arr) {
          if (!c) continue;
          const cSid = c.station_id != null ? Number(c.station_id) : null;
          const cCode = c.station_code ? String(c.station_code).toUpperCase() : null;
          const cName = c.nom ? String(c.nom).trim() : null;
          // try to find an existing stop by id / code / normalized name
          const normName = (v) => (v || '').toString().trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
          const idxFound = base.findIndex(s => {
            if (!s) return false;
            const sid = s.station_id != null ? Number(s.station_id) : null;
            const scode = s.station_code ? String(s.station_code).toUpperCase() : null;
            if (cSid != null && sid != null && cSid === sid) return true;
            if (cCode && scode && cCode === scode) return true;
            const sname = s.station_name || s.nom || '';
            if (cName && sname && normName(sname) === normName(cName)) return true;
            return false;
          });

          if (idxFound >= 0) {
            // merge change into existing stop instead of duplicating
            const existing = base[idxFound];
            base[idxFound] = {
              ...existing,
              station_id: existing.station_id ?? cSid,
              station_code: existing.station_code ?? cCode,
              station_name: (cName || existing.station_name || existing.nom || ''),
              depart_time: c.depart_time || c.depart || existing.depart_time,
              arrivee_time: c.arrivee_time || c.arrivee || existing.arrivee_time,
              voie: c.voie || c.platform || c.platforme || existing.voie,
              // keep original data but attach change for rendering use
              _change: c,
            };
            // if explicit index provided and different, reposition
            let insertIndex = -1;
            if (typeof c.index === 'number') insertIndex = Number(c.index);
            else if (typeof c.position === 'number') insertIndex = Number(c.position);
            if (insertIndex >= 0 && insertIndex !== idxFound && insertIndex <= base.length) {
              const item = base.splice(idxFound, 1)[0];
              base.splice(insertIndex, 0, item);
            }
            continue;
          }

          // build a stop object from change (no existing stop matched)
          const newStop = {
            station_id: cSid,
            station_code: cCode,
            station_name: cName || (c.station_name || c.nom || ''),
            // times may be provided on the change (optionnel)
            depart_time: c.depart_time || c.depart || null,
            arrivee_time: c.arrivee_time || c.arrivee || null,
            voie: c.voie || c.platform || c.platforme || '-',
            _change: c,
          };

          // prefer explicit index insertion if provided
          let insertIndex = -1;
          if (typeof c.index === 'number') insertIndex = Number(c.index);
          else if (typeof c.position === 'number') insertIndex = Number(c.position);

          if (insertIndex >= 0 && insertIndex <= base.length) {
            base.splice(insertIndex, 0, newStop);
          } else {
            // fallback: try to place near origin/terminus if code matches
            if (cCode && h.depart_station_code && cCode === String(h.depart_station_code).toUpperCase()) {
              base.unshift(newStop);
            } else if (cCode && h.arrivee_station_code && cCode === String(h.arrivee_station_code).toUpperCase()) {
              base.push(newStop);
            } else {
              // otherwise push to end
              base.push(newStop);
            }
          }
        }
      }
    } catch (e) {
      // ignore errors when merging parcours_changes
    }

    // --- Dédoublonnage: fusionner entrées dupliquées potentielles (mêmes station_id / station_code / nom normalisé)
    try {
      const norm = v => (v || '').toString().trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
      const final = [];
      const byId = new Map();
      const byCode = new Map();
      const byName = new Map();

      for (const s of base) {
        if (!s) continue;
        const sid = s.station_id != null ? String(s.station_id) : null;
        const scode = s.station_code ? String(s.station_code).toUpperCase() : null;
        const sname = s.station_name || s.nom || '';
        const nname = norm(sname);

        let existingIdx = null;
        if (sid && byId.has(sid)) existingIdx = byId.get(sid);
        else if (scode && byCode.has(scode)) existingIdx = byCode.get(scode);
        else if (nname && byName.has(nname)) existingIdx = byName.get(nname);

        if (existingIdx != null) {
          const existing = final[existingIdx];
          const currHasChange = Boolean(s._change);
          const existHasChange = Boolean(existing._change);
          if (currHasChange && !existHasChange) {
            // prefer current (has perturbation) but keep missing fields
            final[existingIdx] = {
              ...existing,
              ...s,
              station_id: existing.station_id ?? s.station_id,
              station_code: existing.station_code ?? s.station_code,
              station_name: s.station_name || existing.station_name,
              depart_time: s.depart_time || existing.depart_time,
              arrivee_time: s.arrivee_time || existing.arrivee_time,
              voie: s.voie || existing.voie,
              _change: s._change || existing._change || null,
            };
          } else {
            // merge missing fields into existing
            final[existingIdx] = {
              ...existing,
              station_id: existing.station_id ?? s.station_id,
              station_code: existing.station_code ?? s.station_code,
              station_name: existing.station_name || s.station_name,
              depart_time: existing.depart_time || s.depart_time,
              arrivee_time: existing.arrivee_time || s.arrivee_time,
              voie: existing.voie || s.voie,
              _change: existing._change || s._change || null,
            };
          }
        } else {
          const idx = final.length;
          final.push(s);
          if (sid) byId.set(sid, idx);
          if (scode) byCode.set(scode, idx);
          if (nname) byName.set(nname, idx);
        }
      }

      base.length = 0;
      base.push(...final);
     } catch (e) {
       // noop
     }

    // find index of chosen station in composed list (tolérant: id, code, nom normalisé ou inclusion)
    const idx = (function(){
      try {
        const curName = nameOf(stationName || '');
        for (let i = 0; i < base.length; i++) {
          const s = base[i];
          if (!s) continue;
          const sid = s.station_id != null ? Number(s.station_id) : null;
          if (sid != null && stationId != null && sid === stationId) return i;
          const scode = s.station_code ? String(s.station_code).toUpperCase() : null;
          if (scode && stationCode && scode === stationCode) return i;
          const snameRaw = s.station_name || s.nom || '';
          const sname = nameOf(snameRaw);
          if (sname && curName && sname === curName) return i;
          // tolerant containment checks (handles prefixes / polite forms)
          if (sname && curName && (sname.includes(curName) || curName.includes(sname))) return i;
        }
        return -1;
      } catch (e) { return -1; }
    })();


    // slice according to mode
    if (mode === 'depart') {
      // show chosen station and all after
      return base.slice(idx);
    }
    // arrivals: show all before including chosen
    return base.slice(0, idx + 1);
  }

  // helper: render stops list JSX (factorisé pour éviter IIFE/ternary complexes)
  function renderStopsList(h) {
    try {
      if (!h) return (<div style={{ padding: '8px 0', color: '#555' }}>Aucune information d'arrêts disponible pour cet horaire.</div>);
      const rawStops = Array.isArray(h.stops) && h.stops.length > 0 ? buildStopsForAccordion(h) : buildStopsForAccordion(h);
      // If schedule is globally cancelled and parcours_changes exist, prefer the parcours_changes list
      let displayStops = rawStops;
      try {
        if (h && h._isCancelled) {
          // parse parcours_changes
          const raw = h.parcours_changes || h._parcours_changes || null;
          let arr = [];
          if (raw) {
            if (Array.isArray(raw)) arr = raw;
            else if (typeof raw === 'string') {
              try { arr = JSON.parse(raw); } catch (e) { arr = []; }
            } else if (typeof raw === 'object') arr = Array.isArray(raw) ? raw : Object.values(raw);
          }
          if (Array.isArray(arr) && arr.length > 0) {
            // map parcours_changes to stop-like objects and use that as the authoritative list
            const stopsFromChanges = arr.map(c => {
              return {
                station_id: c.station_id != null ? c.station_id : null,
                station_code: c.station_code || null,
                station_name: c.nom || c.station_name || null,
                depart_time: c.depart_time || c.depart || null,
                arrivee_time: c.arrivee_time || c.arrivee || null,
                voie: c.voie || c.platform || c.platforme || null,
                _change: c,
              };
            });
            // replace displayStops with stopsFromChanges (prevents showing the normal list)
            displayStops = stopsFromChanges;
          }
        }
      } catch (e) {
        // fall back to rawStops on error
        displayStops = rawStops;
      }

      // Pré-traitement: construire une liste dédupliquée de stops en priorisant les entrées issues de perturbations
      // Détecter si des suppressions spécifiques sont présentes dans parcours_changes (pour ne pas marquer toutes les gares supprimées lors d'une annulation globale)
      let hasSpecificSuppression = false;
      try {
        const rawPc = h.parcours_changes || h._parcours_changes || null;
        let pcArr = [];
        if (rawPc) {
          if (Array.isArray(rawPc)) pcArr = rawPc;
          else if (typeof rawPc === 'string') {
            try { pcArr = JSON.parse(rawPc); } catch (e) { pcArr = []; }
          } else if (typeof rawPc === 'object') pcArr = Array.isArray(rawPc) ? rawPc : Object.values(rawPc);
        }
        if (Array.isArray(pcArr) && pcArr.some(c => c && c.action && String(c.action).toLowerCase().includes('supp'))) {
          hasSpecificSuppression = true;
        }
      } catch (e) { /* noop */ }

       const normKey = v => (v || '').toString().trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, ' ');

      const processed = displayStops.map((s, si) => {
         const originalTime = s.depart_time || s.arrivee_time || null;
        const delayObj = getDelayForStop(h, s, si, rawStops);
         let change = getChangeForStop(h, s);
         let isSuppressed = Boolean(change && change.action && String(change.action).toLowerCase().includes('supp'));
         if (!isSuppressed && h._isCancelled && !hasSpecificSuppression) {
           isSuppressed = true;
           if (!change) {
             change = { action: 'suppression', cause: h._cancellationCause || (h._perturbations_applied && h._perturbations_applied.length ? (h._perturbations_applied[0].cause || h._perturbations_applied[0].reason) : null) };
           }
         }
         const d = Number(delayObj && (delayObj.delay ?? delayObj.delayMinutes ?? delayObj.delay_minutes)) || 0;
         const affected = Boolean(delayObj && (d > 0 || (delayObj.change && (String(delayObj.change.action || '').toLowerCase() === 'prolonge'))));
         const estimatedTime = affected && originalTime ? addMinutesToTimeString(originalTime, d) : null;
         const cause = (change && (change.cause || change.reason)) ? (change.cause || change.reason) : ((delayObj && delayObj.change && (delayObj.change.cause || delayObj.change.reason)) ? (delayObj.change.cause || delayObj.change.reason) : (h._cancellationCause || null));
        const key = s.station_id != null ? `id:${String(s.station_id)}` : (s.station_code ? `code:${String(s.station_code).toUpperCase()}` : `name:${normKey(s.station_name || s.nom || '')}`);
         return { raw: s, originalTime, delayObj, change, isSuppressed, d, affected, estimatedTime, cause, key };
       });

      // dédupliquer en testant station_id / station_code / nom normalisé (3 maps) — prioriser _change/isSuppressed
      const finalList = [];
      const byId = new Map();
      const byCode = new Map();
      const byName = new Map();

      for (const p of processed) {
        const s = p.raw || {};
        const sid = s.station_id != null ? String(s.station_id) : null;
        const scode = s.station_code ? String(s.station_code).toUpperCase() : null;
        const nname = normKey(s.station_name || s.nom || '');

        let existingIdx = null;
        if (sid && byId.has(sid)) existingIdx = byId.get(sid);
        else if (scode && byCode.has(scode)) existingIdx = byCode.get(scode);
        else if (nname && byName.has(nname)) existingIdx = byName.get(nname);

        if (existingIdx != null) {
          const existing = finalList[existingIdx];
          const currHasChange = Boolean(p.raw._change) || Boolean(p.change && p.change.action);
          const existHasChange = Boolean(existing.raw._change) || Boolean(existing.change && existing.change.action);
          // si la nouvelle entrée est provenant d'une perturbation ou supprimée, privilégier
          if ((currHasChange && !existHasChange) || (p.isSuppressed && !existing.isSuppressed)) {
            const merged = {
              ...existing,
              ...p,
              raw: { ...existing.raw, ...p.raw },
              originalTime: p.originalTime || existing.originalTime,
              d: p.d || existing.d,
              affected: p.affected || existing.affected,
              estimatedTime: p.estimatedTime || existing.estimatedTime,
              cause: p.cause || existing.cause,
              isSuppressed: existing.isSuppressed || p.isSuppressed,
              change: existing.change || p.change,
            };
            finalList[existingIdx] = merged;
          } else {
            // garder existing mais merger champs manquants
            finalList[existingIdx] = {
              ...existing,
              raw: { ...existing.raw, ...p.raw },
              originalTime: existing.originalTime || p.originalTime,
              d: existing.d || p.d,
              affected: existing.affected || p.affected,
              estimatedTime: existing.estimatedTime || p.estimatedTime,
              cause: existing.cause || p.cause,
              isSuppressed: existing.isSuppressed || p.isSuppressed,
              change: existing.change || p.change,
            };
          }
        } else {
          const idx = finalList.length;
          finalList.push(p);
          if (sid) byId.set(sid, idx);
          if (scode) byCode.set(scode, idx);
          if (nname) byName.set(nname, idx);
        }
      }

      const finalStops = finalList;

      return finalStops.map((item, si) => {
        const s = item.raw;
        const originalTime = item.originalTime;
        const d = Number(item.d) || 0;
        const affected = Boolean(item.affected);
        const estimatedTime = item.estimatedTime;
        const isSuppressed = Boolean(item.isSuppressed);
        const cause = item.cause;

        // déterminer si ce stop est le nouveau terminus ajouté par une modification de parcours
        const isNewTerminus = (function(){
          try {
            if (!hasParcoursModification(h)) return false;
            // prefer explicit parcours_changes entry with action === 'none'
            const change = getNewTerminusChange(h);
            if (!change) return false;
            const sid = (s && s.station_id != null) ? Number(s.station_id) : null;
            const scode = s && s.station_code ? String(s.station_code).toUpperCase() : null;
            const sname = s && (s.station_name || s.nom) ? String(s.station_name || s.nom).toLowerCase().trim() : null;
            const cSid = change.station_id != null ? Number(change.station_id) : null;
            const cCode = change.station_code ? String(change.station_code).toUpperCase() : null;
            const cName = change.nom ? String(change.nom).toLowerCase().trim() : null;
            if (sid != null && cSid != null && sid === cSid) return true;
            if (scode && cCode && scode === cCode) return true;
            if (sname && cName && sname === cName) return true;
            return false;
          } catch (e) { return false; }
        })();

        return (
          <div key={si} className={`${styles.stopRow} ${isSuppressed ? styles.stopRowSuppressed : ''}`}>
             <div className={styles.stopTime}>
               {!isSuppressed ? (
                 originalTime ? (
                   affected ? (<div><span className={styles.timeOriginal}>{originalTime}</span><div><span className={styles.timeEstimated}>{estimatedTime}</span></div></div>) : (<span className={styles.timeNormal}>{originalTime}</span>)
                 ) : '—'
               ) : null}
             </div>
             <div className={styles.timeline}><span className={styles.dot} aria-hidden></span></div>
             <div className={styles.stopName}>
               {isSuppressed ? (
                 <>
                  <span className={styles.cancelledText}>{stationNameById(s.station_id, s.station_name || s.nom || '', s.station_code)}</span>
                  {isNewTerminus ? (<span className={styles.newTerminusBadge}>Nouvelle Gare de Destination</span>) : null}
                   {/* Use same visual style as global cancellation banner for suppressed stops */}
                   <div className={styles.cancelBanner} style={{ marginTop: 8 }}>
                     <wcs-mat-icon icon="error" size="s" className={styles.cancelIcon} aria-hidden />
                     <div>Supprimé{cause ? ` — ${cause}` : ''}</div>
                   </div>
                 </>
               ) : (
                 <>
                  {stationNameById(s.station_id, s.station_name || s.nom || '', s.station_code)}
                  {isNewTerminus ? (<span className={styles.newTerminusBadge}>Nouvelle Gare de Destination</span>) : null}
                   {affected ? (
                     <div className={styles.stopInfo}>
                       <div className={styles.stopInfoHeader}>
                         <wcs-mat-icon icon="schedule" size="s" className={styles.stopInfoIcon} aria-hidden />
                         <div className={styles.stopInfoTitle}>Retard estimé de {d} min</div>
                       </div>
                       {cause ? (<div className={styles.stopInfoCause}>{cause}</div>) : null}
                     </div>
                   ) : null}
                 </>
               )}
             </div>
             <div className={styles.stopPlatform}>{isSuppressed ? ('-') : (s.voie || s.platform || s.platforme || '-')}</div>
           </div>
         );
       });

    } catch (e) {
      return (<div style={{ padding: '8px 0', color: '#555' }}>Aucune information d'arrêts disponible pour cet horaire.</div>);
    } // fin de renderStopsList
  }

  return (
    <div>
      <header role="banner">
        <InfoBanner />
        <Header />
        <NavigationBar />
      </header>

      <main role="main" className={styles.pageContainer}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.pageTitle}>{mode === 'arrivees' ? 'Prochaines arrivées' : 'Prochains départs'}</h1>
            <div className={styles.stationName}>Gare {stationName}</div>
          </div>

          <div className={styles.actionsTop}>
            <button className={styles.linkBtn}>Infos pratiques {stationName}</button>
            <button className={styles.linkBtn} onClick={() => history.back()}>Changer de gare</button>
          </div>
        </div>

        <div className={styles.modeTabs}>
          <button className={`${styles.modeTab} ${mode === 'depart' ? styles.modeTabActive : ''}`} onClick={() => setMode('depart')}>Départs SNCF</button>
          <button className={`${styles.modeTab} ${mode === 'arrivees' ? styles.modeTabActive : ''}`} onClick={() => setMode('arrivees')}>Arrivées SNCF</button>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableHeaderRow}>
            <div className={styles.colTime}>{mode === 'arrivees' ? 'Arrivée' : 'Départ'}</div>
            <div className={styles.colFrom}>{mode === 'arrivees' ? 'Provenance' : 'Destination'}</div>
            <div className={styles.colMode}>Mode</div>
            <div className={styles.colPlatform}>Voie</div>
          </div>

          {loading && <div style={{ padding: 16 }}>Chargement…</div>}
          {error && <div style={{ padding: 16, color: '#b00020' }}>Erreur: {error}</div>}

          {!loading && !error && todayList.length === 0 && tomorrowList.length === 0 && (
            <div style={{ padding: 16 }}>Aucun horaire trouvé pour cette gare.</div>
          )}

          {/* Render today's remaining schedules */}
          {!loading && !error && todayList.length === 0 && tomorrowList.length > 0 && (
            <div className={styles.noMoreToday}>
              <wcs-mat-icon icon="schedule" size="s" style={{ color: '#2c45a8' }}></wcs-mat-icon>
              <div>
                {mode === 'depart' ? "Plus aucun départ prévu aujourd'hui" : "Plus aucune arrivée prévue aujourd'hui"}
              </div>
            </div>
          )}

          {!loading && !error && todayList.map((h, idx) => {
            const uid = h.id != null ? `h-${h.id}` : `today-${idx}`;
            const assignedQuai = getAssignedQuai(h);
            const delayInfo = getDelayForStation(h);
            const hasDelay = delayInfo && delayInfo.delayMinutes && delayInfo.delayMinutes > 0;
            // compute display destination: if parcours modifié, prefer the last stop from buildStopsForAccordion
            const displayFrom = (function(){
              try {
                if (mode === 'depart') {
                  const isModified = (h._perturbations_applied && Array.isArray(h._perturbations_applied) && h._perturbations_applied.some(p => p && String(p.type || '').toLowerCase() === 'modification_parcours')) || hasParcoursModification(h);
                  if (isModified) {
                    // prefer explicit 'none' action new terminus from parcours_changes
                    const newTerm = getNewTerminusFromParcoursChanges(h);
                    if (newTerm) return newTerm;
                    const stops = Array.isArray(h.stops) || h.parcours_changes ? buildStopsForAccordion(h) : null;
                    if (Array.isArray(stops) && stops.length > 0) {
                      const last = stops[stops.length - 1];
                      return stationNameById(last.station_id, last.station_name || last.nom || '', last.station_code);
                    }
                  }
                  return h.terminus || (Array.isArray(h.stops) && h.stops[h.stops.length-1] && (h.stops[h.stops.length-1].station_name || h.stops[h.stops.length-1].station_code)) || '';
                }
                return h.origin || (h.stops && h.stops[0] && h.stops[0].station_name) || '';
              } catch (e) { return mode === 'depart' ? (h.terminus || '') : (h.origin || ''); }
            })();
             return (
               <div key={uid} className={styles.rowWrapper}>
                 <div
                   role="button"
                   tabIndex={0}
                   aria-expanded={expandedId === uid}
                   className={`${styles.tableRow} ${styles.clickableRow} ${hasDelay ? styles.rowDelayed : ''} ${h._isCancelled ? styles.rowCancelled : ''}`}
                   onClick={() => toggleExpanded(uid)}
                   onKeyDown={(e) => handleKeyToggle(e, uid)}
                 >
                   <div className={styles.colTime}>
                    {h._isCancelled ? (
                        <span className={styles.cancelledText}>{h.timeAtStation || '—'}</span>
                      ) : hasDelay ? (
                        <div>
                          <span className={styles.timeOriginal}>{h.timeAtStation || '—'}</span>
                          <span className={styles.timeEstimated}>{`${String((Number(h.timeAtStation ? h.timeAtStation.split(':')[0] : '0'))).padStart(2,'0')}:${String(((Number(h.timeAtStation ? h.timeAtStation.split(':')[1] : '0') || 0) + Number(delayInfo.delayMinutes || 0))%60).padStart(2,'0')}`}</span>
                        </div>
                      ) : (
                        <span className={styles.timeNormal} style={{ textDecoration: 'none', color: 'inherit', fontWeight: 800 }}>{h.timeAtStation || '—'}</span>
                      )}
                   </div>
                   <div className={styles.colFrom}><span className={h._isCancelled ? styles.cancelledText : ''}>{displayFrom}</span></div>
                   <div className={styles.colMode}><wcs-mat-icon icon="train" size="s" style={{ color: '#0b7d48' }}></wcs-mat-icon> <span className={h._isCancelled ? styles.cancelledText : ''}>{h.modeLabel}</span></div>
                   <div className={styles.colPlatform}>
                     {assignedQuai ? (
                       <span className={styles.platformBadge}>{assignedQuai}</span>
                     ) : (
                       h.voie || h.platform || h.platforme || '-'
                     )}
                   </div>
                 </div>

                 {h._isCancelled && (
                   <div className={styles.cancelBanner}>
                     <wcs-mat-icon icon="error" size="s" className={styles.cancelIcon} aria-hidden />
                     <div>Supprimé{h._cancellationCause ? ` — ${h._cancellationCause}` : ''}</div>
                   </div>
                 )}

                   {hasDelay && (
                    <div className={styles.delayBanner}>
                      <wcs-mat-icon icon="schedule" size="s" className={styles.clockIcon} aria-hidden />
                      <div>Retard estimé de {delayInfo.delayMinutes} min</div>
                    </div>
                  )}

                {/* Bannière pour modification de parcours */}
                {(!h._isCancelled && ((h._perturbations_applied && Array.isArray(h._perturbations_applied) && h._perturbations_applied.some(p => p && String(p.type || '').toLowerCase() === 'modification_parcours')) || hasParcoursModification(h))) && (
                  <div className={styles.modifyBanner}>
                    <wcs-mat-icon icon="warning" size="s" className={styles.modifyIcon} aria-hidden />
                    <div>Parcours modifié</div>
                  </div>
                )}

                 {expandedId === uid && (
                   <div className={styles.accordionContent}>
                    <div className={styles.accordionHeader}>
                      <h3>Liste des gares</h3>
                      <div className={styles.accordionSub}>Opéré par SNCF Voyageurs - {h.numero_train || ''}</div>
                    </div>
                    <div className={styles.stopsHeader}>
                      <div className={styles.stopHeadTime}>Départ</div>
                      <div className={styles.stopHeadTimeline}></div>
                      <div className={styles.stopHeadName}>Gare</div>
                      <div className={styles.stopHeadPlatform}>Voie</div>
                    </div>
                     <div className={styles.stopsList}>
                      {/* Afficher la liste des gares même si l'horaire est supprimé ; le rendu par stop gère les suppressions */}
                      {renderStopsList(h)}
                     </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Separator + tomorrow's schedules */}
          {!loading && !error && tomorrowList.length > 0 && (
            <>
              <div className={styles.dateDivider} style={{ padding: '12px 18px', fontWeight:700, color:'#333', borderTop: '2px solid var(--yellow)' }}>{formatDaySeparatorLabel(1)}</div>
              {tomorrowList.map((h, idx) => {
                const uid = h.id != null ? `h-${h.id}` : `tom-${idx}`;
                const assignedQuai = getAssignedQuai(h);
                const delayInfo = getDelayForStation(h);
                const hasDelay = delayInfo && delayInfo.delayMinutes && delayInfo.delayMinutes > 0;
                const displayFrom = (function(){
                  try {
                    if (mode === 'depart') {
                      const isModified = (h._perturbations_applied && Array.isArray(h._perturbations_applied) && h._perturbations_applied.some(p => p && String(p.type || '').toLowerCase() === 'modification_parcours')) || hasParcoursModification(h);
                      if (isModified) {
                        // prefer explicit 'none' action new terminus from parcours_changes
                        const newTerm = getNewTerminusFromParcoursChanges(h);
                        if (newTerm) return newTerm;
                        const stops = Array.isArray(h.stops) || h.parcours_changes ? buildStopsForAccordion(h) : null;
                        if (Array.isArray(stops) && stops.length > 0) {
                          const last = stops[stops.length - 1];
                          return stationNameById(last.station_id, last.station_name || last.nom || '', last.station_code);
                        }
                      }
                      return h.terminus || (Array.isArray(h.stops) && h.stops[h.stops.length-1] && (h.stops[h.stops.length-1].station_name || h.stops[h.stops.length-1].station_code)) || '';
                    }
                    return h.origin || (h.stops && h.stops[0] && h.stops[0].station_name) || '';
                  } catch (e) { return mode === 'depart' ? (h.terminus || '') : (h.origin || ''); }
                })();
                 return (
                   <div key={uid} className={styles.rowWrapper}>
                     <div
                       role="button"
                       tabIndex={0}
                       aria-expanded={expandedId === uid}
                       className={`${styles.tableRow} ${styles.clickableRow} ${hasDelay ? styles.rowDelayed : ''} ${h._isCancelled ? styles.rowCancelled : ''}`}
                       onClick={() => toggleExpanded(uid)}
                       onKeyDown={(e) => handleKeyToggle(e, uid)}
                     >
                       <div className={styles.colTime}>
                         {h._isCancelled ? (
                           <span className={styles.cancelledText}>{h.timeAtStation || '—'}</span>
                         ) : hasDelay ? (
                           <div>
                             <span className={styles.timeOriginal}>{h.timeAtStation || '—'}</span>
                             <span className={styles.timeEstimated}>{`${String((Number(h.timeAtStation ? h.timeAtStation.split(':')[0] : '0'))).padStart(2,'0')}:${String(((Number(h.timeAtStation ? h.timeAtStation.split(':')[1] : '0') || 0) + Number(delayInfo.delayMinutes || 0))%60).padStart(2,'0')}`}</span>
                           </div>
                         ) : (
                           <span className={styles.timeNormal} style={{ textDecoration: 'none', color: 'inherit', fontWeight: 800 }}>{h.timeAtStation || '—'}</span>
                         )}
                       </div>
                       <div className={styles.colFrom}>{displayFrom}</div>
                       <div className={styles.colMode}><wcs-mat-icon icon="train" size="s" style={{ color: '#0b7d48' }}></wcs-mat-icon> <span className={h._isCancelled ? styles.cancelledText : ''}>{h.modeLabel}</span></div>
                       <div className={styles.colPlatform}>
                         {assignedQuai ? (
                           <span className={styles.platformBadge}>{assignedQuai}</span>
                         ) : (
                           h.voie || h.platform || h.platforme || ''
                         )}
                       </div>
                     </div>

                     {h._isCancelled && (
                       <div className={styles.cancelBanner}>
                         <wcs-mat-icon icon="error" size="s" className={styles.cancelIcon} aria-hidden />
                         <div>Supprimé{h._cancellationCause ? ` — ${h._cancellationCause}` : ''}</div>
                       </div>
                     )}

                     {hasDelay && (
                      <div className={styles.delayBanner}>
                        <wcs-mat-icon icon="schedule" size="s" className={styles.clockIcon} aria-hidden />
                        <div>Retard estimé de {delayInfo.delayMinutes} min</div>
                      </div>
                    )}

                     {/* Bannière pour modification de parcours */}
                     {(!h._isCancelled && ((h._perturbations_applied && Array.isArray(h._perturbations_applied) && h._perturbations_applied.some(p => p && String(p.type || '').toLowerCase() === 'modification_parcours')) || hasParcoursModification(h))) && (
                       <div className={styles.modifyBanner}>
                         <wcs-mat-icon icon="warning" size="s" className={styles.modifyIcon} aria-hidden />
                         <div>Modifié</div>
                       </div>
                     )}

                     {expandedId === uid && (
                       <div className={styles.accordionContent}>
                         <div className={styles.accordionHeader}>
                           <h3>Liste des gares</h3>
                           <div className={styles.accordionSub}>Opéré par SNCF Voyageurs - {h.numero_train || ''}</div>
                         </div>
                         <div className={styles.stopsHeader}>
                           <div className={styles.stopHeadTime}>Départ</div>
                           <div className={styles.stopHeadTimeline}></div>
                           <div className={styles.stopHeadName}>Gare</div>
                           <div className={styles.stopHeadPlatform}>Voie</div>
                         </div>
                         <div className={styles.stopsList}>
                           {renderStopsList(h)}
                         </div>
                       </div>
                     )}
                   </div>
                 );
              })}
            </>
          )}

        </div>

      </main>
    </div>
  );
}

