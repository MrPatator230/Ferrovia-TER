"use client";
import React from 'react';

export default function PerturbationModal({ sillon = null, initialData = null, horaireId = null, onClose, onSaved }) {
  const tabsRef = React.useRef(null);
  const [tab, setTab] = React.useState('general');

  // Champs généraux
  const [numeroTrain, setNumeroTrain] = React.useState(initialData?.numero_train ?? sillon?.numero_train ?? '');
  const [horairesMatches, setHorairesMatches] = React.useState([]);
  const [isSearchingHoraires, setIsSearchingHoraires] = React.useState(false);
  const [resolvedHoraireId, setResolvedHoraireId] = React.useState(initialData?.horaire_id ?? null);
  const searchTimerRef = React.useRef(null);
  const [type, setType] = React.useState(initialData?.type || 'retard');
  const [cause, setCause] = React.useState(initialData?.cause || '');
  const [tempsArretGlobal, setTempsArretGlobal] = React.useState(initialData?.temps_arret_global ?? 0);
  const [tempsRetard, setTempsRetard] = React.useState(initialData?.temps_retard_minutes ?? 0);
  const [consequenceParcours, setConsequenceParcours] = React.useState(initialData?.consequence_parcours ?? false);
  const [joursImpactList, setJoursImpactList] = React.useState(Array.isArray(initialData?.jours_impact) ? initialData.jours_impact : (initialData?.jours_impact ? [initialData.jours_impact] : []));
  const [selectedDate, setSelectedDate] = React.useState('');

  // Parcours
  const [parcoursChanges, setParcoursChanges] = React.useState(Array.isArray(initialData?.parcours_changes) ? initialData.parcours_changes.map(c => ({ ...c })) : []);
  const [isLoadingStations, setIsLoadingStations] = React.useState(false);

  // Sync cause globale vers chaque arrêt quand elle change
  React.useEffect(() => {
    if (!cause) return;
    setParcoursChanges(prev => prev.map(p => ({ ...p, cause })));
  }, [cause]);

  // Ne montrer le tab parcours que si consequenceParcours est vraie
  React.useEffect(() => {
    if (!consequenceParcours && tab === 'parcours') setTab('general');
  }, [consequenceParcours]);

  // Initialiser parcours à partir du sillon si présent et parcours_changes non fourni
  React.useEffect(() => {
    if (Array.isArray(initialData?.parcours_changes) && initialData.parcours_changes.length > 0) return; // déjà initialisé
    async function load() {
      if (!sillon) return;
      setIsLoadingStations(true);
      const stops = sillon.stops || [];
      let stationsList = [];
      try {
        const res = await fetch('/api/admin/stations');
        if (res.ok) stationsList = await res.json();
      } catch (e) { /* ignore */ }
      const nameById = {}, nameByCode = {};
      stationsList.forEach(st => { if (!st) return; if (st.id) nameById[st.id] = st.nom || st.code; if (st.code) nameByCode[String(st.code)] = st.nom || st.code; });
      const resolve = (st) => {
        if (!st) return null;
        if (st.station_id != null && nameById[st.station_id]) return nameById[st.station_id];
        if (st.station_code && nameByCode[String(st.station_code)]) return nameByCode[String(st.station_code)];
        if (st.station_nom) return st.station_nom;
        return null;
      };
      const seen = new Set();
      const list = [];
      const originKey = sillon.depart_station_id ? `id:${sillon.depart_station_id}` : (sillon.depart_station_code ? `code:${String(sillon.depart_station_code)}` : null);
      if (originKey && !seen.has(originKey)) { seen.add(originKey); list.push({ id: originKey, index: list.length, nom: sillon.depart_station_name || resolve({ station_id: sillon.depart_station_id, station_code: sillon.depart_station_code }) || 'Origine', arrivee: null, depart: sillon.depart_time || '', action: 'none', cause: '', delayMinutes: null, propagated: false }); }
      (Array.isArray(stops) ? stops : []).forEach((st, idx) => { const key = st && st.station_id != null ? `id:${st.station_id}` : (st && st.station_code ? `code:${String(st.station_code)}` : `idx:${idx}`); if (seen.has(key)) return; seen.add(key); list.push({ id: key, index: list.length, nom: resolve(st) || st.station_nom || st.station_code || `Arrêt ${idx+1}`, arrivee: st.arrivee_time || st.arrival || '', depart: st.depart_time || st.departure || '', action: 'none', cause: '', delayMinutes: null, propagated: false }); });
      const termKey = sillon.arrivee_station_id ? `id:${sillon.arrivee_station_id}` : (sillon.arrivee_station_code ? `code:${String(sillon.arrivee_station_code)}` : null);
      if (termKey && !seen.has(termKey)) { seen.add(termKey); list.push({ id: termKey, index: list.length, nom: sillon.arrivee_station_name || resolve({ station_id: sillon.arrivee_station_id, station_code: sillon.arrivee_station_code }) || 'Terminus', arrivee: sillon.arrivee_time || '', depart: null, action: 'none', cause: '', delayMinutes: null, propagated: false }); }
      setParcoursChanges(list);
      setIsLoadingStations(false);
    }
    load();
  }, [sillon, initialData]);

  React.useEffect(() => {
    const el = tabsRef.current; if (!el) return;
    const handler = (ev) => { const newKey = ev?.detail?.selectedKey ?? ev?.detail?.tabName ?? ev?.detail?.key; if (newKey) setTab(String(newKey)); };
    el.addEventListener('tabChange', handler); el.addEventListener('wcsTabChange', handler); el.addEventListener('change', handler);
    return () => { el.removeEventListener('tabChange', handler); el.removeEventListener('wcsTabChange', handler); el.removeEventListener('change', handler); };
  }, []);

  // si la prop horaireId est fournie et est un UUID, l'utiliser comme resolvedHoraireId
  React.useEffect(() => {
    try {
      if (horaireId && typeof horaireId === 'string' && isUuid(String(horaireId))) setResolvedHoraireId(String(horaireId));
    } catch (e) { /* noop */ }
  }, [horaireId]);

  // nettoyer le timer de recherche au démontage
  React.useEffect(() => { return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); }; }, []);

  React.useEffect(() => { const el = tabsRef.current; if (!el) return; try { if (el.selectedKey !== tab) { el.selectedKey = tab; el.setAttribute('selected-key', tab); } } catch (e) {} }, [tab]);

  const addDateImpact = () => { if (!selectedDate) return; setJoursImpactList(prev => { if (prev.includes(selectedDate)) return prev; return [...prev, selectedDate]; }); setSelectedDate(''); };
  const removeDateImpact = (d) => setJoursImpactList(prev => prev.filter(x => x !== d));

  const updateStopAction = (id, action) => {
    setParcoursChanges(prev => {
      const list = prev.map(p => ({ ...p }));
      const idx = list.findIndex(p => p.id === id); if (idx === -1) return prev;
      list[idx].action = action;
      const resolvedDelay = (list[idx].delayMinutes != null && list[idx].delayMinutes !== '') ? Number(list[idx].delayMinutes) : (tempsRetard || tempsArretGlobal || 0);
      if (action === 'suppression') { list[idx].propagated = false; list[idx].delayMinutes = null; }
      if (action === 'retard' || action === 'prolonge') {
        if (!list[idx].delayMinutes || list[idx].delayMinutes === '') list[idx].delayMinutes = resolvedDelay || null;
        const minutes = list[idx].delayMinutes != null ? Number(list[idx].delayMinutes) : 0;
        for (let i = idx + 1; i < list.length; i++) { if (list[i].action !== 'none' && !list[i].propagated) break; list[i].action = 'retard'; list[i].delayMinutes = minutes; list[i].propagated = true; }
      }
      if (action === 'none') { if (list[idx].propagated) { for (let i = idx + 1; i < list.length; i++) { if (list[i].propagated) { list[i].propagated = false; list[i].delayMinutes = null; list[i].action = 'none'; } } } list[idx].propagated = false; list[idx].delayMinutes = null; }
      return list;
    });
  };

  const updateStopDelay = (id, minutes) => {
    setParcoursChanges(prev => {
      const list = prev.map(p => ({ ...p }));
      const idx = list.findIndex(p => p.id === id); if (idx === -1) return prev;
      const newMinutes = minutes != null && minutes !== '' ? Number(minutes) : null; list[idx].delayMinutes = newMinutes;
      if (list[idx].action === 'retard' || list[idx].action === 'prolonge') { for (let i = idx + 1; i < list.length; i++) { if (list[i].propagated) list[i].delayMinutes = newMinutes; else { if (list[i].action !== 'none') break; } } }
      return list;
    });
  };

  // helper pour détecter UUID
  const isUuid = (val) => {
    if (!val || typeof val !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
  };

  const resolveHoraireUuid = async () => {
    // Priorité: resolvedHoraireId si l'utilisateur a sélectionné un horaire, puis prop horaireId (si fourni et valide/identifiable), puis initialData.horaire_id (édition), sinon sillon.id
    if (resolvedHoraireId && isUuid(String(resolvedHoraireId))) return String(resolvedHoraireId);
    if (horaireId && isUuid(String(horaireId))) return String(horaireId);

    try {
      // If horaireId provided but not UUID, attempt to match it among horaires (by id, numero_train, or code)
      if (horaireId) {
        try {
          const r = await fetch('/api/admin/horaires', { method: 'GET', cache: 'no-store' });
          if (r.ok) {
            const hs = await r.json();
            if (Array.isArray(hs)) {
              const match = hs.find(h => String(h.id) === String(horaireId) || String(h.numero_train) === String(horaireId) || String(h.depart_station_code) === String(horaireId) || String(h.arrivee_station_code) === String(horaireId));
              if (match && match.id) return match.id;
            }
          }
        } catch (e) { /* ignore */ }
      }

    } catch (e) {
      // noop
    }

    if (initialData && initialData.horaire_id) return initialData.horaire_id;
    if (sillon && isUuid(String(sillon.id))) return String(sillon.id);

    // Sinon, tenter d'identifier le bon horaire via l'API /api/admin/horaires
    try {
      const res = await fetch('/api/admin/horaires', { method: 'GET', cache: 'no-store' });
      if (!res.ok) return null;
      const horaires = await res.json();
      if (!Array.isArray(horaires) || horaires.length === 0) return null;

      // Tentatives de matching : priorité au numéro saisi par l'utilisateur, puis numéro présent sur le sillon
      const num = (numeroTrain && String(numeroTrain).trim()) || sillon?.numero_train || sillon?.numero || sillon?.train || null;
       if (num) {
         const found = horaires.find(h => h.numero_train && String(h.numero_train) === String(num));
         if (found && found.id) return found.id;
       }

      // fallback: match par depart_time + stations
      const depTime = sillon?.depart_time || sillon?.depart_time_local || sillon?.depart;
      const depCode = sillon?.depart_station_code || sillon?.depart_station || sillon?.depart_station_id;
      const arrCode = sillon?.arrivee_station_code || sillon?.arrivee_station || sillon?.arrivee_station_id;

      const found2 = horaires.find(h => {
        try {
          if (depTime && h.depart_time && String(h.depart_time).slice(0,5) === String(depTime).slice(0,5)) {
            if (!depCode || String(h.depart_station_code) === String(depCode) || String(h.depart_station_id) === String(depCode)) return true;
            if (!arrCode || String(h.arrivee_station_code) === String(arrCode) || String(h.arrivee_station_id) === String(arrCode)) return true;
          }
        } catch(e) { /* ignore */ }
        return false;
      });
      if (found2 && found2.id) return found2.id;

      return null;
    } catch (e) {
      console.warn('resolveHoraireUuid error', e);
      return null;
    }
  };

  const savePerturbation = async () => {
    // Résoudre l'UUID du sillon cible
    let horaireUuid = null;
    try {
      horaireUuid = await resolveHoraireUuid();
    } catch (e) {
      console.warn('Erreur résolution horaire:', e);
    }

    const payload = {
      horaire_id: horaireUuid ?? (initialData?.horaire_id ?? null),
      numero_train: numeroTrain || null,
      type,
      cause: cause || null,
      temps_retard_minutes: type === 'retard' ? Number(tempsRetard || tempsArretGlobal || 0) : null,
      temps_arret_global: Number(tempsArretGlobal || 0),
      consequence_parcours: consequenceParcours,
      jours_impact: joursImpactList,
      parcours_changes: parcoursChanges
    };

    try {
      if (initialData && initialData.id) {
        // edition
        const body = { id: initialData.id, ...payload };
        const res = await fetch('/api/admin/perturbations', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok) { const txt = await res.text(); console.error('Erreur update perturbation', txt); alert('Erreur lors de la mise à jour: ' + res.statusText); return; }
      } else {
        const res = await fetch('/api/admin/perturbations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) { const txt = await res.text(); console.error('Erreur save perturbation', txt); alert('Erreur lors de l\'enregistrement: ' + res.statusText); return; }
      }
      onSaved && onSaved();
      onClose && onClose();
    } catch (e) { console.error(e); alert('Erreur réseau'); }
  };

  return (
    <wcs-modal show close-button-aria-label="Fermer" show-close-button>
      <div slot="header"><wcs-mat-icon icon="warning" size="s"></wcs-mat-icon>{initialData ? 'Modifier une perturbation' : `Ajouter une perturbation pour le train ${sillon?.numero_train || sillon?.id}`}</div>
      <div style={{ padding: 12 }}>
        <wcs-tabs ref={tabsRef} selected-key={tab} align="start" aria-label="Onglets perturbation">
          <wcs-tab header="Général" item-key="general"></wcs-tab>
          {consequenceParcours && <wcs-tab header="Parcours" item-key="parcours"></wcs-tab>}
        </wcs-tabs>

        {tab === 'general' && (
          <div style={{ marginTop: 12 }}>
            <div style={{ marginBottom: 8 }}>
              <label>Numéro de train</label>
              <input type="text" value={numeroTrain} onChange={e => {
                const v = e.target.value;
                setNumeroTrain(v);
                // debounce search
                if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                setHorairesMatches([]);
                setResolvedHoraireId(null);
                if (!v || !v.trim()) return;
                searchTimerRef.current = setTimeout(async () => {
                  setIsSearchingHoraires(true);
                  try {
                    const res = await fetch('/api/admin/horaires', { cache: 'no-store' });
                    if (!res.ok) { setHorairesMatches([]); return; }
                    const data = await res.json();
                    const arr = Array.isArray(data) ? data : [];
                    const filtered = arr.filter(h => h && h.numero_train && String(h.numero_train).toLowerCase().includes(String(v).toLowerCase()));
                    setHorairesMatches(filtered.slice(0, 50));
                  } catch (err) {
                    console.warn('Recherche horaires failed', err);
                    setHorairesMatches([]);
                  } finally { setIsSearchingHoraires(false); }
                }, 400);
              }} style={{ width: '100%', padding: 8 }} />

              {/* Liste de correspondances */}
              {isSearchingHoraires && <div style={{ marginTop: 6 }}>Recherche...</div>}
              {!isSearchingHoraires && horairesMatches && horairesMatches.length > 0 && (
                <div style={{ marginTop: 6, border: '1px solid var(--wcs-border-color)', borderRadius: 6, maxHeight: 200, overflow: 'auto', background: 'var(--wcs-surface)' }}>
                  {horairesMatches.map(h => (
                    <div key={h.id} onClick={() => {
                      if (searchTimerRef.current) { clearTimeout(searchTimerRef.current); searchTimerRef.current = null; }
                      setResolvedHoraireId(h.id || null);
                      setNumeroTrain(h.numero_train || '');
                      setHorairesMatches([]);
                      // charger le parcours de cet horaire dans tab Parcours
                      loadParcoursFromHoraire(h);
                      // activer le tab Parcours
                      setConsequenceParcours(true);
                      setTab('parcours');
                    }} style={{ padding: 8, borderBottom: '1px solid rgba(0,0,0,0.04)', cursor: 'pointer' }}>
                       <div style={{ fontWeight: 700 }}>{h.numero_train || '(sans numéro)'}</div>
                       <div style={{ fontSize: 12, color: 'var(--wcs-text-medium)' }}>{(h.depart_station_name || h.depart_station_code || '-') + ' → ' + (h.arrivee_station_name || h.arrivee_station_code || '-')} · {h.depart_time ? String(h.depart_time).slice(0,5) : '-'}</div>
                     </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Type de perturbation</label>
              <select value={type} onChange={e => setType(e.target.value)} style={{ display: 'block', width: '100%', padding: 8 }}>
                <option value="retard">Retard</option>
                <option value="suppression">Suppression</option>
                <option value="modification_parcours">Modification de parcours</option>
                <option value="autre">Autre</option>
              </select>
            </div>

            {(type === 'retard' || parcoursChanges.some(p => p.action === 'prolonge')) && (
              <div style={{ marginBottom: 8 }}>
                <label>Temps d'arrêt (minutes)</label>
                <input type="number" min="0" value={tempsArretGlobal} onChange={e => setTempsArretGlobal(e.target.value)} style={{ width: '100%', padding: 8 }} />
              </div>
            )}

            { type === 'retard' && (
              <div style={{ marginBottom: 8 }}>
                <label>Temps de retard global (minutes)</label>
                <input type="number" min="0" value={tempsRetard} onChange={e => setTempsRetard(e.target.value)} style={{ width: '100%', padding: 8 }} />
              </div>
            )}

            <div style={{ marginBottom: 8 }}>
              <label><input type="checkbox" checked={consequenceParcours} onChange={e => setConsequenceParcours(e.target.checked)} /> Conséquence sur le parcours</label>
            </div>

            <div style={{ marginBottom: 8 }}>
                <label>Jour de circulation impacté (sélectionnez puis ajouter)</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ padding: 8 }} />
                  <wcs-button mode="stroked" onClick={addDateImpact}>Ajouter</wcs-button>
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {joursImpactList.map(d => (
                    <div key={d} style={{ background: 'var(--wcs-surface)', padding: '4px 8px', borderRadius: 16, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span>{d}</span>
                      <button onClick={() => removeDateImpact(d)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 8 }}>
                <label>Cause (facultatif)</label>
                <input type="text" value={cause} onChange={e => setCause(e.target.value)} style={{ width: '100%', padding: 8 }} />
              </div>

          </div>
        )}

        {tab === 'parcours' && (
          <div style={{ marginTop: 12 }}>
            {isLoadingStations ? (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <wcs-spinner size="m"></wcs-spinner>
                <p style={{ marginTop: 8, color: 'var(--wcs-text-medium)' }}>Chargement des arrêts...</p>
              </div>
            ) : parcoursChanges.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--wcs-text-medium)' }}>
                Aucun arrêt défini pour ce sillon
              </div>
            ) : (
              <>
                {parcoursChanges.map(p => {
                  const border = p.action === 'suppression'
                    ? '1px solid #ff6b6b'
                    : (p.action === 'prolonge' ? '1px solid #ffa726' : (p.propagated && p.action === 'retard' ? '1px solid #ffa726' : '1px solid var(--wcs-border-color)'));

                  let label = '';
                  if (p.action === 'suppression') label = 'Arrêt Supprimé';
                  else if (p.action === 'prolonge') label = 'Arrêt Prolongé';
                  else if (p.propagated && p.action === 'retard') label = 'Retard (propagé)';

                  const isPropagated = Boolean(p.propagated && p.action === 'retard');
                  const cardBackground = isPropagated ? '#fff4e6' : undefined;
                  return (
                    <div key={p.id} style={{ border, background: cardBackground, padding: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ flex: '1 1 200px' }}>
                        <div style={{ fontWeight: 600 }}>{p.nom}</div>
                        <div style={{ color: 'var(--wcs-text-medium)', fontSize: '0.9em' }}>
                          Arrivée: {p.arrivee || '-'} · Départ: {p.depart || '-'}
                        </div>
                        {label && <div style={{ marginTop: 6, fontWeight: 700, color: p.action === 'suppression' ? '#ff6b6b' : '#bf6b00' }}>{label}</div>}
                      </div>
                      <div style={{ minWidth: 240, flex: '0 0 240px' }}>
                        <div style={{ marginBottom: 6 }}>
                          <select value={p.action} onChange={(e) => updateStopAction(p.id, e.target.value)} style={{ width: '100%', padding: 6 }}>
                            <option value="none">Aucun</option>
                            <option value="retard">Retard</option>
                            <option value="suppression">Suppression de l'arrêt</option>
                          </select>
                        </div>
                        {p.action !== 'suppression' && (
                          <>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                              <input type="number" value={p.delayMinutes || ''} onChange={e => updateStopDelay(p.id, e.target.value)} placeholder="Délai (minutes)" style={{ flex: 1, padding: 8, border: '1px solid var(--wcs-border-color)', borderRadius: 4 }} />
                            </div>
                            <div style={{ marginBottom: 6 }}>
                              <label>Cause (facultatif)</label>
                              <input type="text" value={p.cause || ''} onChange={e => {
                                const val = e.target.value;
                                const stopId = p.id;
                                setParcoursChanges(prev => {
                                  const list = prev.map(x => ({ ...x }));
                                  const idx = list.findIndex(x => x.id === stopId);
                                  if (idx !== -1) list[idx].cause = val;
                                  return list;
                                });
                              }} placeholder="Description de la cause" style={{ width: '100%', padding: 8, border: '1px solid var(--wcs-border-color)', borderRadius: 4 }} />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <wcs-button mode="outlined" onClick={onClose}>Annuler</wcs-button>
                  <wcs-button onClick={savePerturbation}>Enregistrer les modifications</wcs-button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </wcs-modal>
  );

  // charge parcours depuis un objet horaire dans le state local
  function loadParcoursFromHoraire(h) {
    if (!h) return;
    // similar to initialization: build parcoursChanges from horaire stops
    const stops = h.stops || [];
    (async () => {
      let stationsList = [];
      try {
        const res = await fetch('/api/admin/stations');
        if (res.ok) stationsList = await res.json();
      } catch (e) { /* ignore */ }
      const nameById = {}, nameByCode = {};
      stationsList.forEach(st => { if (!st) return; if (st.id) nameById[st.id] = st.nom || st.code; if (st.code) nameByCode[String(st.code)] = st.nom || st.code; });
      const resolve = (st) => {
        if (!st) return null;
        if (st.station_id != null && nameById[st.station_id]) return nameById[st.station_id];
        if (st.station_code && nameByCode[String(st.station_code)]) return nameByCode[String(st.station_code)];
        if (st.station_nom) return st.station_nom;
        return null;
      };
      const list = [];
      const originKey = h.depart_station_id ? `id:${h.depart_station_id}` : (h.depart_station_code ? `code:${String(h.depart_station_code)}` : null);
      if (originKey) list.push({ id: originKey, index: list.length, nom: h.depart_station_name || resolve({ station_id: h.depart_station_id, station_code: h.depart_station_code }) || 'Origine', arrivee: null, depart: h.depart_time || '', action: 'none', cause: '', delayMinutes: null, propagated: false });
      (Array.isArray(stops) ? stops : []).forEach((st, idx) => { const key = st && st.station_id != null ? `id:${st.station_id}` : (st && st.station_code ? `code:${String(st.station_code)}` : `idx:${idx}`); list.push({ id: key, index: list.length, nom: resolve(st) || st.station_nom || st.station_code || `Arrêt ${idx+1}`, arrivee: st.arrivee_time || st.arrival || '', depart: st.depart_time || st.departure || '', action: 'none', cause: '', delayMinutes: null, propagated: false }); });
      const termKey = h.arrivee_station_id ? `id:${h.arrivee_station_id}` : (h.arrivee_station_code ? `code:${String(h.arrivee_station_code)}` : null);
      if (termKey) list.push({ id: termKey, index: list.length, nom: h.arrivee_station_name || resolve({ station_id: h.arrivee_station_id, station_code: h.arrivee_station_code }) || 'Terminus', arrivee: h.arrivee_time || '', depart: null, action: 'none', cause: '', delayMinutes: null, propagated: false });
      setParcoursChanges(list);
    })();
  }
}
