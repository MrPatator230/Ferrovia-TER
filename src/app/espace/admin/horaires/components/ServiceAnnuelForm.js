"use client";
import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';

const ServiceAnnuelForm = forwardRef(function ServiceAnnuelForm({ editServiceAnnuel, onSuccess, onCancel }, ref) {
  const [formData, setFormData] = useState({
    nomSA: '',
    dateDebut: '',
    dateFin: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [debugInfo, setDebugInfo] = useState(null);

  // Exposer la fonction submit au parent via ref
  useImperativeHandle(ref, () => ({
    submit: () => {
      // Déclencher la soumission du formulaire
      const formElement = document.getElementById('service-annuel-form');
      if (formElement) {
        if (typeof formElement.requestSubmit === 'function') {
          formElement.requestSubmit();
        } else {
          formElement.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }
    },
    // Lit les valeurs WCS, met à jour l'état et soumet
    syncAndSubmit: () => {
      try {
        const formElement = document.getElementById('service-annuel-form');
        if (!formElement) return;
        // lire uniquement les inputs natifs (nous utilisons maintenant des inputs HTML)
        const nomInput = document.querySelector('input[name="nomSA"]');
        const dateDebutInput = document.querySelector('input[name="dateDebut"]');
        const dateFinInput = document.querySelector('input[name="dateFin"]');
        const nomValue = getWcsInputValue(nomInput);
        const dateDebutValue = normalizeDateValue(getWcsInputValue(dateDebutInput));
        const dateFinValue = normalizeDateValue(getWcsInputValue(dateFinInput));
        setFormData({ nomSA: nomValue || '', dateDebut: dateDebutValue || '', dateFin: dateFinValue || '' });
        // slight delay to ensure state update reflected in hidden inputs
        setTimeout(() => {
          if (typeof formElement.requestSubmit === 'function') formElement.requestSubmit();
          else formElement.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }, 30);
      } catch (e) { console.warn('syncAndSubmit failed', e); }
    }
  }));

  // Initialiser le formulaire avec les données existantes en cas de modification
  useEffect(() => {
    if (editServiceAnnuel) {
      setFormData({
        nomSA: editServiceAnnuel.nom || '',
        dateDebut: editServiceAnnuel.date_debut ? editServiceAnnuel.date_debut.split('T')[0] : '',
        dateFin: editServiceAnnuel.date_fin ? editServiceAnnuel.date_fin.split('T')[0] : ''
      });
    } else {
      // Réinitialiser le formulaire pour une nouvelle création
      setFormData({
        nomSA: '',
        dateDebut: '',
        dateFin: ''
      });
    }
    setErrors({});
  }, [editServiceAnnuel]);

  function normalizeDateValue(raw) {
    if (!raw) return '';
    const s = String(raw).trim();

    // Si déjà au format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // dd/mm/YYYY -> YYYY-MM-DD
    const dm = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dm) return `${dm[3]}-${dm[2]}-${dm[1]}`;

    // dd-mm-YYYY or dd.mm.YYYY -> YYYY-MM-DD
    const dm2 = s.match(/^(\d{2})[-.](\d{2})[-.](\d{4})$/);
    if (dm2) return `${dm2[3]}-${dm2[2]}-${dm2[1]}`;

    // ISO-like strings starting with YYYY-MM-DD (keep prefix)
    const isoPrefix = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoPrefix) return isoPrefix[1];

    // Essayer de parser d'autres formats via Date mais en gardant la date locale
    try {
      const dt = new Date(s);
      if (!Number.isNaN(dt.getTime())) {
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const d = String(dt.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch (e) {
      // ignore
    }

    // fallback: renvoyer la chaîne brute (le serveur validera/échouera si nécessaire)
    return s;
  }

  // helper: récupérer la valeur d'un wcs-input de façon robuste
  function getWcsInputValue(el, eventDetail) {
    if (!el) return '';
    try {
      // 1) event detail (si fourni par l'événement)
      if (eventDetail && typeof eventDetail.value !== 'undefined' && String(eventDetail.value).trim() !== '') return normalizeDateValue(eventDetail.value);
      // 2) propriété value exposée
      if (typeof el.value !== 'undefined' && el.value !== null && String(el.value).trim() !== '') return normalizeDateValue(el.value);

      // 2.5) autres méthodes/propriétés possibles
      const tryProps = ['getValue', 'get', 'val', '_value', 'valueAsDate'];
      for (const p of tryProps) {
        try {
          if (typeof el[p] === 'function') {
            const v = el[p]();
            if (v != null && String(v).trim() !== '') return normalizeDateValue(v);
          } else if (typeof el[p] !== 'undefined' && el[p] != null && String(el[p]).trim() !== '') {
            return normalizeDateValue(el[p]);
          }
        } catch (e) { /* ignore */ }
      }

      // 3) chercher un input natif dans le light DOM
      try {
        const lightInput = el.querySelector && el.querySelector('input');
        if (lightInput && typeof lightInput.value !== 'undefined' && String(lightInput.value).trim() !== '') return normalizeDateValue(lightInput.value);
      } catch (e) { /* ignore */ }
      // 4) shadowRoot
      if (el.shadowRoot) {
        try {
          const inner = el.shadowRoot.querySelector('input');
          if (inner && typeof inner.value !== 'undefined' && String(inner.value).trim() !== '') return normalizeDateValue(inner.value);
        } catch (e) { /* ignore */ }
      }
      // 5) attribut value
      const attr = el.getAttribute && el.getAttribute('value');
      if (attr && String(attr).trim() !== '') return normalizeDateValue(attr);
      // 6) dataset
      const dataVal = el.dataset && el.dataset.value;
      if (dataVal && String(dataVal).trim() !== '') return normalizeDateValue(dataVal);
      // 7) fallback: innerText
      const txt = el.innerText || el.textContent;
      if (txt && String(txt).trim() !== '') return normalizeDateValue(txt);

      // debug log when value not found - include a few properties to help identify component
      if (typeof window !== 'undefined' && window && window.__DEV__ !== false) {
        try {
          const props = {};
          ['value','getValue','get','val','_value','valueAsDate'].forEach(k => {
            try { props[k] = typeof el[k] === 'function' ? 'function' : el[k]; } catch(_) { props[k] = 'error'; }
          });
          console.debug('[ServiceAnnuelForm] getWcsInputValue: NO VALUE', { tag: el.tagName, name: el.getAttribute && el.getAttribute('name'), sampleOuter: (el.outerHTML && el.outerHTML.slice(0,200)), props });
        } catch (e) { /* ignore */ }
      }
      return '';
    } catch (e) {
      return '';
    }
  }

  // Synchroniser avec les inputs WCS (listeners sur le formulaire)
  useEffect(() => {
    const formElement = document.getElementById('service-annuel-form');
    if (!formElement) return;

    const handleWcsChange = (e) => {
      const input = e.target;
      const name = input.getAttribute && input.getAttribute('name');
      const detail = e && e.detail ? e.detail : undefined;
      const value = getWcsInputValue(input, detail);

      if (name && (name === 'nomSA' || name === 'dateDebut' || name === 'dateFin')) {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));

        if (value && errors[name]) {
          setErrors(prev => ({
            ...prev,
            [name]: ''
          }));
        }
      }
    };

    formElement.addEventListener('wcsInput', handleWcsChange);
    formElement.addEventListener('wcsChange', handleWcsChange);
    formElement.addEventListener('input', handleWcsChange);
    formElement.addEventListener('change', handleWcsChange);

    return () => {
      formElement.removeEventListener('wcsInput', handleWcsChange);
      formElement.removeEventListener('wcsChange', handleWcsChange);
      formElement.removeEventListener('input', handleWcsChange);
      formElement.removeEventListener('change', handleWcsChange);
    };
  }, [errors]);

  // Écouteurs globaux au niveau du document (capture) pour attraper les événements
  useEffect(() => {
    const handler = (e) => {
      const target = e.target;
      if (!target) return;
      const name = target.getAttribute && target.getAttribute('name');
      if (!name || !(name === 'nomSA' || name === 'dateDebut' || name === 'dateFin')) return;
      const detail = e && e.detail ? e.detail : undefined;
      const value = getWcsInputValue(target, detail);
      setFormData(prev => ({ ...prev, [name]: value }));
      if (value && errors[name]) {
        setErrors(prev => ({ ...prev, [name]: '' }));
      }
    };

    // utiliser capture pour garantir la réception
    document.addEventListener('wcsInput', handler, true);
    document.addEventListener('wcsChange', handler, true);
    document.addEventListener('input', handler, true);
    document.addEventListener('change', handler, true);

    return () => {
      document.removeEventListener('wcsInput', handler, true);
      document.removeEventListener('wcsChange', handler, true);
      document.removeEventListener('input', handler, true);
      document.removeEventListener('change', handler, true);
    };
  }, [errors]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Utiliser prioritairement l'état contrôlé formData (inputs natifs contrôlés)
    let actualFormData = {
      nomSA: formData.nomSA ? String(formData.nomSA).trim() : '',
      dateDebut: formData.dateDebut ? String(formData.dateDebut).trim() : '',
      dateFin: formData.dateFin ? String(formData.dateFin).trim() : ''
    };

    // Si une des valeurs est vide, tenter les fallbacks DOM (compatibilité)
    if (!actualFormData.nomSA || !actualFormData.dateDebut || !actualFormData.dateFin) {
      const formElement = e.target;

      // les inputs natifs sont directement lisibles via FormData si nécessaire
      try {
        const fd = new FormData(formElement);
        if (!actualFormData.nomSA) {
          const fdn = fd.get('nomSA'); if (fdn) actualFormData.nomSA = String(fdn).trim();
        }
        if (!actualFormData.dateDebut) {
          const fdd = fd.get('dateDebut'); if (fdd) actualFormData.dateDebut = String(fdd).trim();
        }
        if (!actualFormData.dateFin) {
          const fdf = fd.get('dateFin'); if (fdf) actualFormData.dateFin = String(fdf).trim();
        }
      } catch (err) { /* ignore */ }
    }

    console.log('[ServiceAnnuelForm] Using formData for submit:', actualFormData);

    // Validation avec les valeurs réelles
    const newErrors = {};

    if (!actualFormData.nomSA || !actualFormData.nomSA.trim()) {
      newErrors.nomSA = 'Le nom du service annuel est requis';
    }

    if (!actualFormData.dateDebut) {
      newErrors.dateDebut = 'La date de début est requise';
    }

    if (!actualFormData.dateFin) {
      newErrors.dateFin = 'La date de fin est requise';
    }

    // Normaliser et validation des dates
    actualFormData.dateDebut = normalizeDateValue(actualFormData.dateDebut);
    actualFormData.dateFin = normalizeDateValue(actualFormData.dateFin);

    if (actualFormData.dateDebut && actualFormData.dateFin) {
      const debut = new Date(actualFormData.dateDebut);
      const fin = new Date(actualFormData.dateFin);

      if (debut >= fin) {
        newErrors.dateFin = 'La date de fin doit être postérieure à la date de début';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setDebugInfo({ nomValue: actualFormData.nomSA, dateDebutValue: actualFormData.dateDebut, dateFinValue: actualFormData.dateFin });
      console.log('[ServiceAnnuelForm] Validation errors:', newErrors);
      return;
    }

    // Mettre à jour l'état avant envoi (pour cohérence)
    setFormData(actualFormData);
    setDebugInfo(null);

    setLoading(true);

    try {
      const payload = {
        nomSA: actualFormData.nomSA.trim(),
        dateDebut: actualFormData.dateDebut,
        dateFin: actualFormData.dateFin
      };

      if (editServiceAnnuel) {
        payload.id = editServiceAnnuel.id;
      }

      console.log('[ServiceAnnuelForm] Submitting payload:', payload);

      const res = await fetch('/api/admin/services-annuels', {
        method: editServiceAnnuel ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = errorText;
        try {
          const parsed = JSON.parse(errorText);
          errorMessage = parsed.error || errorText;
        } catch (_) {}

        console.error('[ServiceAnnuelForm] API error:', errorMessage);
        throw new Error(errorMessage);
      }

      const result = await res.json();
      console.log('[ServiceAnnuelForm] Success result:', result);

      // Appeler le callback de succès
      if (onSuccess) {
        onSuccess(result);
      }
      setDebugInfo(null);

    } catch (error) {
      console.error('[ServiceAnnuelForm] Submit error:', error);
      alert('Erreur lors de la sauvegarde : ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div style={{ padding: '16px' }}>
      <form id="service-annuel-form" onSubmit={handleSubmit}>
        {/* Hidden native inputs as robust fallback for submission */}
        <input type="hidden" name="nomSA" value={formData.nomSA || ''} />
        <input type="hidden" name="dateDebut" value={formData.dateDebut || ''} />
        <input type="hidden" name="dateFin" value={formData.dateFin || ''} />

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--wcs-text-dark)' }}>
            Nom du SA *
          </label>
          <input
            type="text"
            name="nomSA"
            value={formData.nomSA}
            placeholder="Ex: Service Été 2025, Service Hiver 2024-2025..."
            required
            aria-invalid={errors.nomSA ? 'true' : 'false'}
            onChange={(e) => setFormData(prev => ({ ...prev, nomSA: e.target.value }))}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: errors.nomSA ? '1px solid var(--wcs-red)' : '1px solid var(--wcs-gray-300)', boxSizing: 'border-box' }}
          />
          {errors.nomSA && (
            <div style={{ color: 'var(--wcs-red)', fontSize: '0.875rem', marginTop: '4px' }}>
              {errors.nomSA}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--wcs-text-dark)' }}>
              Date de début du SA *
            </label>
            <input
              type="date"
              name="dateDebut"
              value={formData.dateDebut}
              required
              aria-invalid={errors.dateDebut ? 'true' : 'false'}
              onChange={(e) => setFormData(prev => ({ ...prev, dateDebut: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: errors.dateDebut ? '1px solid var(--wcs-red)' : '1px solid var(--wcs-gray-300)', boxSizing: 'border-box' }}
            />
            {errors.dateDebut && (
              <div style={{ color: 'var(--wcs-red)', fontSize: '0.875rem', marginTop: '4px' }}>
                {errors.dateDebut}
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--wcs-text-dark)' }}>
              Date de fin du SA *
            </label>
            <input
              type="date"
              name="dateFin"
              value={formData.dateFin}
              required
              aria-invalid={errors.dateFin ? 'true' : 'false'}
              onChange={(e) => setFormData(prev => ({ ...prev, dateFin: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: errors.dateFin ? '1px solid var(--wcs-red)' : '1px solid var(--wcs-gray-300)', boxSizing: 'border-box' }}
            />
            {errors.dateFin && (
              <div style={{ color: 'var(--wcs-red)', fontSize: '0.875rem', marginTop: '4px' }}>
                {errors.dateFin}
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div style={{ marginTop: '16px', textAlign: 'center', padding: '16px', backgroundColor: 'var(--wcs-gray-50)', borderRadius: '4px' }}>
            <wcs-spinner size="m"></wcs-spinner>
            <p style={{ margin: '8px 0 0 0', color: 'var(--wcs-text-medium)' }}>
              {editServiceAnnuel ? 'Modification en cours...' : 'Création en cours...'}
            </p>
          </div>
        )}
        {debugInfo && (
          <div style={{ marginTop: 12, padding: 12, background: 'rgba(255,240,230,0.6)', borderRadius: 6, fontSize: 12, color: '#333' }}>
            <strong>Diagnostic (valeurs / éléments trouvés)</strong>
            <div style={{ marginTop: 6 }}><strong>nomInputExists:</strong> {String(!!debugInfo.nomInputExists)}</div>
            <div style={{ marginTop: 4 }}><strong>dateDebutInputExists:</strong> {String(!!debugInfo.dateDebutInputExists)}</div>
            <div style={{ marginTop: 4 }}><strong>dateFinInputExists:</strong> {String(!!debugInfo.dateFinInputExists)}</div>
            <div style={{ marginTop: 8 }}><strong>nomValue:</strong> {String(debugInfo.nomValue)}</div>
            <div style={{ marginTop: 4 }}><strong>dateDebutValue:</strong> {String(debugInfo.dateDebutValue)}</div>
            <div style={{ marginTop: 4 }}><strong>dateFinValue:</strong> {String(debugInfo.dateFinValue)}</div>
            <details style={{ marginTop: 8 }}><summary>HTML extrait</summary>
              <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>{debugInfo.nomInputOuter || ''}</pre>
              <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>{debugInfo.dateDebutOuter || ''}</pre>
              <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>{debugInfo.dateFinOuter || ''}</pre>
            </details>
          </div>
        )}
      </form>
    </div>
  );
});

export default ServiceAnnuelForm;
