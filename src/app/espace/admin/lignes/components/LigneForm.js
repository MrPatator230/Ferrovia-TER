"use client";
import React, { useState, useEffect, useRef } from 'react';
import styles from '../lignes.module.css';

export default function LigneForm({ editLigne, onSuccess, onCancel }) {
  const [nom, setNom] = useState('');
  const [code, setCode] = useState('');
  const [stops, setStops] = useState([]); // {station_id, ordre}
  const [communications, setCommunications] = useState({ message: '' });
  const [stationsOptions, setStationsOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const formRef = useRef(null);
  const nomRef = useRef(null);
  const codeRef = useRef(null);
  const commRef = useRef(null);
  const stopsRefs = useRef([]);
  const ordRefs = useRef([]);

  useEffect(() => {
    fetchStationsOptions();
  }, []);

  useEffect(() => {
    if (editLigne) {
      setNom(editLigne.nom || '');
      setCode(editLigne.code || '');
      setStops(editLigne.stops || []);
      setCommunications(editLigne.communications || { message: '' });
    } else {
      setNom(''); setCode(''); setStops([]); setCommunications({ message: '' });
    }
  }, [editLigne]);

  useEffect(() => {
    // sync WCS inputs values when state changes
    try { if (nomRef.current) nomRef.current.value = nom; } catch(e){}
    try { if (codeRef.current) codeRef.current.value = code; } catch(e){}
    try { if (commRef.current) commRef.current.value = communications && communications.message ? communications.message : ''; } catch(e){}

    // ensure refs arrays match length
    stopsRefs.current.length = stops.length;
    ordRefs.current.length = stops.length;

    stops.forEach((s, idx) => {
      const sel = stopsRefs.current[idx];
      if (sel) {
        try { sel.value = (s.station_id !== undefined && s.station_id !== null) ? String(s.station_id) : ''; } catch(e){}
      }
      const ord = ordRefs.current[idx];
      if (ord) {
        try { ord.value = (s.ordre || (idx+1)).toString(); } catch(e){}
      }
    });
  }, [nom, code, communications, stops, stationsOptions]);

  // Attachement d'un listener global sur le formulaire pour capter les changements
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const readValueFromEvent = (e, target) => {
      const detail = e && e.detail ? e.detail : null;
      if (detail && detail.value !== undefined) return detail.value;
      if (detail && detail.target && detail.target.value !== undefined) return detail.target.value;
      if (target && target.value !== undefined) return target.value;
      // fallback try attribute
      try { return target && target.getAttribute && target.getAttribute('value'); } catch(e) { return undefined; }
    };

    const onFormChange = (e) => {
      const target = e && (e.target || (e.detail && e.detail.target));
      if (!target) return;

      // Nom / Code / Communications
      if (target.matches && target.matches('wcs-input[data-field="nom"]')) {
        const v = readValueFromEvent(e, target); setNom(v || ''); return;
      }
      if (target.matches && target.matches('wcs-input[data-field="code"]')) {
        const v = readValueFromEvent(e, target); setCode(v || ''); return;
      }
      if (target.matches && target.matches('wcs-textarea[data-field="comm"]')) {
        const v = readValueFromEvent(e, target); setCommunications({ message: v || '' }); return;
      }

      // stop select change: wcs-select[data-field="stop-select-{idx}"]
      if (target.matches && target.matches('wcs-select[data-field^="stop-select-"]')) {
        const key = target.getAttribute('data-field');
        const parts = key.split('-');
        const idx = Number(parts[2]);
        const val = readValueFromEvent(e, target);
        updateStop(idx, 'station_id', val === '' || val === null || val === undefined ? null : Number(val));
        return;
      }

      // ordre change: wcs-input[data-field^="stop-ordre-"]
      if (target.matches && target.matches('wcs-input[data-field^="stop-ordre-"]')) {
        const key = target.getAttribute('data-field');
        const parts = key.split('-');
        const idx = Number(parts[2]);
        const val = readValueFromEvent(e, target);
        updateStop(idx, 'ordre', Number(val) || (idx+1));
        return;
      }

      // fallback: nothing
    };

    form.addEventListener('wcsChange', onFormChange);
    form.addEventListener('change', onFormChange);

    return () => {
      form.removeEventListener('wcsChange', onFormChange);
      form.removeEventListener('change', onFormChange);
    };
  }, [formRef.current, stops]);

  async function fetchStationsOptions() {
    try {
      const res = await fetch('/api/admin/stations');
      if (res.ok) {
        const data = await res.json();
        setStationsOptions(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error('Erreur fetch stations', e); }
  }

  function addStop() {
    setStops(prev => ([...prev, { station_id: stationsOptions && stationsOptions[0] ? stationsOptions[0].id : null, ordre: prev.length + 1 }]));
  }

  function removeStop(idx) {
    setStops(prev => prev.filter((_,i) => i !== idx).map((s, i) => ({ ...s, ordre: i+1 })));
  }

  function updateStop(idx, field, value) {
    setStops(prev => prev.map((s,i) => i===idx ? ({ ...s, [field]: value }) : s));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nom) { alert('Nom requis'); return; }
    setLoading(true);
    try {
      const payload = { nom, code, stops, communications };
      const url = editLigne ? `/api/admin/lignes/${editLigne.id}` : '/api/admin/lignes';
      const method = editLigne ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        const data = await res.json();
        onSuccess && onSuccess(data);
      } else {
        const text = await res.text();
        alert('Erreur: ' + text);
      }
    } catch (e) {
      console.error(e);
      alert('Erreur lors de l\'enregistrement');
    } finally { setLoading(false); }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className={styles.formWrap}>
      <wcs-tabs aria-label="Tabs Lignes" align="start">
        <wcs-tab header="Général" item-key="general">
          <div className={styles.tabPanel}>
            <wcs-form-field>
              <wcs-label>Nom de la ligne</wcs-label>
              <wcs-input data-field="nom" type="text" ref={nomRef} value={nom} placeholder="Nom de la ligne"></wcs-input>
            </wcs-form-field>

            <wcs-form-field>
              <wcs-label>Code (optionnel)</wcs-label>
              <wcs-input data-field="code" type="text" ref={codeRef} value={code} placeholder="Code"></wcs-input>
            </wcs-form-field>
          </div>
        </wcs-tab>

        <wcs-tab header="Arrêts" item-key="stops">
          <div className={styles.tabPanel}>
            <div style={{ marginBottom: 8 }}>
              <wcs-button onClick={addStop}><wcs-mat-icon icon="add" /> Ajouter un arrêt</wcs-button>
            </div>
            {stops && stops.length === 0 && <div style={{ color: '#666' }}>Aucun arrêt défini</div>}
            {stops && stops.map((s, idx) => (
              <div key={idx} className={styles.stopRow}>
                <wcs-form-field style={{ flex: 1 }}>
                  <wcs-label>Sélectionner une gare</wcs-label>
                  <wcs-select ref={el => stopsRefs.current[idx] = el} data-field={`stop-select-${idx}`} value={s.station_id !== null && s.station_id !== undefined ? String(s.station_id) : ''} onChange={(e) => { const v = e && e.target && e.target.value; updateStop(idx, 'station_id', v === '' || v == null ? null : Number(v)); }}>
                    <wcs-select-option value="">Sélectionner une gare</wcs-select-option>
                    {stationsOptions.map(st => <wcs-select-option key={st.id} value={String(st.id)}>{st.nom}</wcs-select-option>)}
                  </wcs-select>
                </wcs-form-field>

                <wcs-form-field style={{ width: 120 }}>
                  <wcs-label>Ordre</wcs-label>
                  <wcs-input ref={el => ordRefs.current[idx] = el} data-field={`stop-ordre-${idx}`} type="number" value={(s.ordre || (idx+1)).toString()} onInput={(e) => { const v = e && e.target && e.target.value; updateStop(idx, 'ordre', Number(v) || (idx+1)); }}></wcs-input>
                </wcs-form-field>

                <wcs-button mode="clear" shape="small" onClick={() => removeStop(idx)}><wcs-mat-icon icon="delete" /></wcs-button>
              </div>
            ))}
          </div>
        </wcs-tab>

        <wcs-tab header="Communications" item-key="comms">
          <div className={styles.tabPanel}>
            <wcs-form-field>
              <wcs-label>Message de communication</wcs-label>
              <wcs-textarea data-field="comm" ref={commRef} rows={6} value={communications && communications.message ? communications.message : ''}></wcs-textarea>
            </wcs-form-field>
          </div>
        </wcs-tab>
      </wcs-tabs>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        <wcs-button mode="clear" onClick={onCancel}>Annuler</wcs-button>
        <wcs-button type="submit" disabled={loading}>{loading ? 'Enregistrement...' : (editLigne ? 'Mettre à jour' : 'Créer')}</wcs-button>
      </div>
    </form>
  );
}
