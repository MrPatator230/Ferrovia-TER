"use client";
import React, { useEffect, useState } from 'react';

// Affiche les statuts répercutés des horaires sur le widget d'accueil
export default function PerturbationBanners() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const [rp, rh] = await Promise.all([
          fetch('/api/admin/perturbations', { cache: 'no-store' }),
          fetch('/api/admin/horaires', { cache: 'no-store' }),
        ]);
        if (!rp.ok) throw new Error(`perturbations API ${rp.status}`);
        if (!rh.ok) throw new Error(`horaires API ${rh.status}`);
        const perturbations = await rp.json();
        const horairesRaw = await rh.json();
        const horaires = Array.isArray(horairesRaw) ? horairesRaw : (horairesRaw && Array.isArray(horairesRaw.mapped) ? horairesRaw.mapped : []);

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

        const perturbationAppliesOnDate = (pert, date) => {
          try {
            if (!pert) return false;
            if (!pert.jours_impact || (Array.isArray(pert.jours_impact) && pert.jours_impact.length === 0)) return true;
            const raw = Array.isArray(pert.jours_impact) ? pert.jours_impact : (typeof pert.jours_impact === 'string' ? [pert.jours_impact] : []);
            const targetYMD = toLocalYMD(date);
            if (!targetYMD) return false;
            const dayMap = { 'dim':0, 'lun':1, 'mar':2, 'mer':3, 'jeu':4, 'ven':5, 'sam':6 };
            for (const item of raw) {
              if (item == null) continue;
              const s = String(item).trim();
              const ymd = toLocalYMD(s);
              if (ymd && ymd === targetYMD) return true;
              const lower = s.toLowerCase();
              if (dayMap[lower] !== undefined) {
                if (date.getDay() === dayMap[lower]) return true;
              } else if (dayMap[lower.slice(0,3)] !== undefined) {
                if (date.getDay() === dayMap[lower.slice(0,3)]) return true;
              }
            }
            return false;
          } catch (e) { return true; }
        };

        const perturbationMatchesHoraire = (pert, h) => {
          try {
            if (!pert || !h) return false;
            if (pert.horaire_id && h.id && String(pert.horaire_id) === String(h.id)) return true;
            if (pert.numero_train && h.numero_train && String(pert.numero_train) === String(h.numero_train)) return true;
            return false;
          } catch (e) { return false; }
        };

        // apply perturbations to an horaire for a given date (similar logic to page.js)
        function applyPerturbationsToHoraire(h, date) {
          if (!h) return h;
          const copy = { ...h };
          const applicable = (perturbations || []).filter(p => perturbationMatchesHoraire(p, h) && perturbationAppliesOnDate(p, date));
          if (!applicable || applicable.length === 0) {
            copy._perturbations_applied = [];
            return copy;
          }

          // delays: take max
          const delays = applicable.map(p => Number(p.temps_retard_minutes ?? p.temps_retard ?? 0) || 0);
          const maxDelay = delays.length > 0 ? Math.max(...delays) : null;
          if (maxDelay != null && maxDelay > 0) copy.temps_retard_minutes = maxDelay;

          // apply first parcours_changes if provided
          for (const p of applicable) {
            if (p.parcours_changes) {
              try {
                copy.parcours_changes = Array.isArray(p.parcours_changes) ? p.parcours_changes : (typeof p.parcours_changes === 'string' ? JSON.parse(p.parcours_changes) : p.parcours_changes);
                break;
              } catch (e) { /* ignore */ }
            }
          }

          // _isCancelled only if an applicable perturbation has explicit type 'suppression'
          try {
            const supPert = applicable.find(p => p && p.type && String(p.type).toLowerCase() === 'suppression');
            if (supPert) {
              copy._isCancelled = true;
              copy._cancellationCause = supPert.cause || supPert.reason || null;
            }
          } catch (e) { /* noop */ }

          copy._perturbations_applied = applicable;
          return copy;
        }

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
            return arr.some(c => c && !(c.action && String(c.action).toLowerCase().includes('supp')));
          } catch (e) { return false; }
        }

        const today = new Date();

        // compute statuses per horaire
        const affected = [];
        for (const h of horaires) {
          try {
            const hh = applyPerturbationsToHoraire(h, today);
            // determine a status
            if (hh._isCancelled) {
              affected.push({
                id: hh.id || `h-${Math.random()}`,
                label: hh.numero_train ? `Train ${hh.numero_train}` : (hh.modeLabel || `${hh.depart_station_name || ''} → ${hh.arrivee_station_name || ''}`),
                summary: 'Supprimé',
                horaire: hh,
              });
              continue;
            }
            if (hasParcoursModification(hh)) {
              affected.push({
                id: hh.id || `h-${Math.random()}`,
                label: hh.numero_train ? `Train ${hh.numero_train}` : (hh.modeLabel || `${hh.depart_station_name || ''} → ${hh.arrivee_station_name || ''}`),
                summary: 'Modifié',
                horaire: hh,
              });
              continue;
            }
            const delay = Number(hh.temps_retard_minutes ?? hh.temps_retard ?? 0) || 0;
            if (delay > 0) {
              affected.push({
                id: hh.id || `h-${Math.random()}`,
                label: hh.numero_train ? `Train ${hh.numero_train}` : (hh.modeLabel || `${hh.depart_station_name || ''} → ${hh.arrivee_station_name || ''}`),
                summary: `Retard ${delay} min`,
                horaire: hh,
              });
              continue;
            }
          } catch (e) { /* skip problematic horaire */ }
        }

        if (mounted) {
          setItems(affected.slice(0, 10)); // limit to 10
          setError(null);
        }
      } catch (e) {
        if (mounted) setError(e.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (loading) return (<div style={{ padding: 12 }}>Chargement des perturbations…</div>);
  if (error) return (<div style={{ padding: 12, color: '#b00020' }}>Erreur chargement perturbations : {String(error)}</div>);
  if (!items || items.length === 0) return (<div style={{ padding: 12 }}>Aucune perturbation aujourd'hui.</div>);

  return (
    <div style={{ padding: 12 }} role="region" aria-label="Perturbations">
      <h3 style={{ margin: '0 0 8px 0', fontSize: 16 }}>Perturbations</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(it => (
          <div key={it.id} style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#fff', borderRadius: 8, padding: 8, border: '1px solid #eee' }}>
            <div style={{ width: 36, height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: it.summary.startsWith('Retard') ? '#fff3cd' : (it.summary === 'Supprimé' ? '#f8d7da' : '#fff3cd'), color: '#222', fontWeight: 700 }}>
              {it.summary === 'Supprimé' ? '✖' : (it.summary === 'Modifié' ? '⚠' : '⏱')}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{it.label}</div>
              <div style={{ fontSize: 13, color: '#444' }}>{it.summary}{it.horaire && it.horaire.timeAtStation ? ` — ${it.horaire.timeAtStation}` : ''}</div>
            </div>
            <div>
              <a href={it.horaire ? `/se-deplacer/prochains-departs/${encodeURIComponent(String(it.horaire.depart_station_code || it.horaire.depart_station_name || ''))}` : '/se-deplacer/prochains-departs'} style={{ color: '#0b7d48', textDecoration: 'none', fontWeight: 700 }}>Voir</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
