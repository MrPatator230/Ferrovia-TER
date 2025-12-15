"use client";
import React, { useEffect, useRef, useState } from 'react';

export default function StopsModal({ open, onClose, from, to, stops = [], fromTime = null, toTime = null }) {
  if (!open) return null;

  // layout constants
  const TIME_COL_WIDTH = 120; // width of time column in px
  const TIMELINE_CELL_W = 40; // width reserved for timeline between time and station
  const DOT_SIZE = 16; // overlay dot size
  const LINE_W = 4;

  // simple helpers
  const title = `${from || ''} → ${to || ''}`;

  // Normaliser les stops fournis
  const normalized = Array.isArray(stops) ? stops.map(s => ({
    station_code: s.station_code || s.station_id || null,
    station_name: s.station_name || s.nom || null,
    depart_time: s.depart_time || s.depart || null,
    arrivee_time: s.arrivee_time || s.arrive || null
  })) : [];

  // Trouver index de l'origine et de la destination dans la liste normalisée (match nom ou code)
  const normLower = (v) => (v || '').toString().toLowerCase().trim();
  const fromNorm = normLower(from);
  const toNorm = normLower(to);
  const findIndexBy = (needle) => {
    if (!needle) return -1;
    return normalized.findIndex(s => {
      const name = normLower(s.station_name);
      const code = normLower(s.station_code);
      return name === needle || code === needle;
    });
  };

  const startIdx = findIndexBy(fromNorm); // -1 if not found
  const endIdx = findIndexBy(toNorm); // -1 if not found

  // Déterminer la tranche d'arrêts à afficher
  let sliceStart = startIdx >= 0 ? startIdx : 0;
  let sliceEnd = (endIdx >= 0) ? endIdx : (normalized.length - 1);
  if (sliceEnd < sliceStart) {
    // fallback : afficher tout si les indices incohérents
    sliceStart = 0; sliceEnd = normalized.length - 1;
  }

  let displayedStops = normalized.slice(sliceStart, sliceEnd + 1);

  // Si origine non trouvée dans stops, préfixer l'origine avec heure fallback (préférer fromTime)
  if (startIdx < 0 && from) {
    // prefer offer fromTime, fallback to first stop time
    const first = normalized[0];
    const fallbackFrom = first ? (first.depart_time || first.arrivee_time) : null;
    displayedStops = [{ station_name: from, station_code: null, depart_time: fromTime || fallbackFrom || null }, ...displayedStops];
  }

  // Si destination non trouvée dans stops, suffixer la destination avec heure fallback (préférer toTime)
  if (endIdx < 0 && to) {
    const last = normalized[normalized.length - 1];
    const fallbackTo = last ? (last.arrivee_time || last.depart_time) : null;
    displayedStops = [...displayedStops, { station_name: to, station_code: null, arrivee_time: toTime || fallbackTo || null }];
  }

  // Déterminer les heures à afficher pour la première et la dernière étape.
  // Règle : si fromTime/toTime sont fournis, les afficher (heure du sillon) ; sinon utiliser l'horaire du stop.
  if (displayedStops.length > 0) {
    const first = displayedStops[0];
    if (first) {
      // If sillon provides fromTime, force it (user wants sillon time)
      first.depart_time = fromTime ? String(fromTime).slice(0,5) : (first.depart_time || first.arrivee_time || null);
    }
    const last = displayedStops[displayedStops.length - 1];
    if (last) {
      // If sillon provides toTime, force it (user wants sillon time)
      last.arrivee_time = toTime ? String(toTime).slice(0,5) : (last.arrivee_time || last.depart_time || null);
    }
  }

  // --- new: compute vertical line position between first and last dot ---
  const timelineRef = useRef(null);
  const [lineStyle, setLineStyle] = useState(null);
  const [dotPositions, setDotPositions] = useState([]);

  useEffect(() => {
    // compute after paint
    const compute = () => {
      const root = timelineRef.current;
      if (!root) return setLineStyle(null);
      // les dots sont dans la colonne de droite (rowsWrapper), qui est le sibling de root;
      // on recherche donc dans le parent (content wrapper)
      const parent = root.parentElement || root;
      const dots = parent.querySelectorAll('[data-dot]');
      if (!dots || dots.length === 0) {
        setDotPositions([]);
        return setLineStyle(null);
      }
      const first = dots[0].getBoundingClientRect();
      const last = dots[dots.length - 1].getBoundingClientRect();
      // container is the timeline column; positions should be relative to it
      const container = root.getBoundingClientRect();
      const top = (first.top + first.height / 2) - container.top;
      const bottom = (last.top + last.height / 2) - container.top;
      const height = Math.max(2, bottom - top);
      setLineStyle({ top: Math.round(top), height: Math.round(height) });
      // compute per-dot vertical centers relative to the timeline column
      const positions = Array.from(dots).map(d => {
        const r = d.getBoundingClientRect();
        return Math.round((r.top + r.height / 2) - container.top);
      });
      setDotPositions(positions);
    };
    // small delay to allow DOM update
    const id = setTimeout(compute, 20);
    // recompute on resize
    window.addEventListener('resize', compute);
    return () => { clearTimeout(id); window.removeEventListener('resize', compute); };
  }, [stops, from, to, fromTime, toTime]);

  // ensure content wrapper is relative so timeline absolute can be positioned over rows
  const contentWrapperStyleAdjusted = { ...contentWrapperStyle, position: 'relative' };

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true">
      <div style={modalStyle}>
        <button onClick={onClose} aria-label="Fermer" style={closeBtnStyle}>✕</button>
        <h2 style={titleStyle}>{title}</h2>

        <div style={dividerStyle} />

        <div style={tableHeaderStyle}>
          <div style={{ width: TIME_COL_WIDTH, textAlign: 'center', color: '#666', fontSize: 13 }}>Heure de passage</div>
          <div style={{ flex: 1, paddingLeft: 8, color: '#666', fontSize: 13 }}>Etape</div>
        </div>

        <div style={contentWrapperStyleAdjusted}>
          <div style={{ ...timelineColumnStyle, position: 'absolute', left: `${TIME_COL_WIDTH}px`, width: TIMELINE_CELL_W }} aria-hidden ref={timelineRef}>
            {/* vertical line positioned between first and last dot; placed to the left of dots */}
            <div style={{
              position: 'absolute', left: `${(TIMELINE_CELL_W - LINE_W) / 2}px`, width: LINE_W, background: '#0b7a36',
              borderRadius: 4,
              display: lineStyle ? 'block' : 'none',
              top: lineStyle ? `${lineStyle.top}px` : undefined,
              height: lineStyle ? `${lineStyle.height}px` : undefined,
              zIndex: 0
            }} />
            {/* overlay dots centered on the vertical line */}
            {dotPositions && dotPositions.map((pos, i) => (
              <div key={`overlay-${i}`} style={{
                position: 'absolute', left: `${(TIMELINE_CELL_W - DOT_SIZE) / 2}px`, // center dot in timeline cell
                top: `${pos - (DOT_SIZE / 2)}px`,
                width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE, background: '#0b7a36', zIndex: 2
              }} />
            ))}
          </div>

          <div style={rowsWrapperStyle}>
            {displayedStops.map((s, idx) => {
              const time = s.depart_time || s.arrivee_time || '';
              return (
                <div key={idx} style={rowStyle}>
                  <div style={{ width: TIME_COL_WIDTH, textAlign: 'center' }}>{time}</div>
                  <div style={timelineCellStyle}>
                    <div data-dot style={{ ...dotStyle, width: DOT_SIZE, height: DOT_SIZE, position: 'relative', zIndex: 2, visibility: (dotPositions && dotPositions.length) ? 'hidden' : 'visible' }} />
                  </div>
                  <div style={{ flex: 1, paddingLeft: 12 }}>{s.station_name || s.station_code || ''}</div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

// Inline styles (kept here to avoid new css files)
const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
};
const modalStyle = {
  width: '80%', maxWidth: 980, maxHeight: '80vh', overflow: 'auto',
  background: '#fff', borderRadius: 8, padding: 28, position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
};
const closeBtnStyle = {
  position: 'absolute', right: 16, top: 12, background: 'transparent', border: 'none', fontSize: 22, cursor: 'pointer'
};
const titleStyle = { margin: '2px 0 10px 0', fontSize: 24, fontWeight: 500 };
const dividerStyle = { height: 2, background: '#f3c400', marginTop: 8, marginBottom: 12 };
const tableHeaderStyle = { display: 'flex', alignItems: 'center', borderBottom: '2px solid #f3c400', paddingBottom: 8, marginBottom: 12 };
const contentWrapperStyle = { display: 'flex', alignItems: 'flex-start' };
const timelineColumnStyle = { width: 40, position: 'relative' };
const rowsWrapperStyle = { flex: 1 };
const rowStyle = { display: 'flex', alignItems: 'center', padding: '10px 0' };
const timelineCellStyle = { width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const dotStyle = { width: 16, height: 16, borderRadius: 16, background: '#0b7a36' };
