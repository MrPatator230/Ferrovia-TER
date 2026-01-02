import { supabase } from './supabase';

// Helpers locaux
function ensureArrayMaybe(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return [];
    try { return JSON.parse(s); } catch (e) { return s.split(',').map(x => x.trim()).filter(Boolean); }
  }
  return [];
}

function normalizeTransports(value) {
  const arr = ensureArrayMaybe(value);
  return arr.map(item => {
    if (item == null) return null;
    if (typeof item === 'string') return { type: String(item).trim(), couleur: null };
    if (typeof item === 'object') return { type: String(item.type || '').trim(), couleur: (item.couleur === undefined ? null : item.couleur) };
    return null;
  }).filter(x => x && x.type);
}

function normalizeCode(code) {
  if (!code && code !== '') return null;
  if (typeof code !== 'string') return null;
  const c = code.trim().toUpperCase();
  return c === '' ? null : c;
}

function normalizeStation(station) {
  if (!station) return station;
  return {
    ...station,
    service: ensureArrayMaybe(station.service),
    quais: ensureArrayMaybe(station.quais),
    transports_commun: normalizeTransports(station.transports_commun),
    code: normalizeCode(station.code),
    correspondance: ensureArrayMaybe(station.correspondance)
  };
}

// API
export async function listStations() {
  const { data, error } = await supabase.from('stations').select('*').order('nom', { ascending: true });
  if (error) throw error;
  return (data || []).map(normalizeStation);
}

export async function createStation(raw) {
  const nom = raw.nom ? String(raw.nom).trim() : '';
  const type_gare = raw.type_gare ? String(raw.type_gare).trim() : '';
  const service = ensureArrayMaybe(raw.service);
  const quais = ensureArrayMaybe(raw.quais);
  const transports_commun = normalizeTransports(raw.transports_commun);
  const code = normalizeCode(raw.code);
  const correspondance = ensureArrayMaybe(raw.correspondance);

  console.log('[stationsLib] createStation payload normalized:', { nom, type_gare, service, quais, transports_commun, code, correspondance });

  if (!nom || !type_gare) {
    const err = new Error('Le nom et le type de gare sont requis');
    err.status = 400;
    throw err;
  }

  if (code && !/^[A-Z]{3}$/.test(code)) {
    const err = new Error('Le champ Code doit être composé de 3 lettres (A-Z)');
    err.status = 400;
    throw err;
  }

  // vérifier unicité du code
  if (code) {
    const { data: exists, error: existsErr } = await supabase.from('stations').select('id').ilike('code', code).limit(1);
    console.log('[stationsLib] createStation check code exists:', { code, exists, existsErr });
    if (existsErr) {
      const err = new Error('Erreur lors de la vérification du code');
      err.status = 500;
      throw err;
    }
    if (exists && exists.length > 0) {
      const err = new Error('Le code fourni est déjà utilisé par une autre gare');
      err.status = 409;
      throw err;
    }
  }

  const toInsert = {
    nom,
    type_gare,
    service: service || [],
    quais: quais || [],
    transports_commun: transports_commun || [],
    code: code || null,
    correspondance: correspondance || []
  };

  const { data, error } = await supabase.from('stations').insert([toInsert]).select();
  console.log('[stationsLib] supabase.insert result:', { error, data });
  if (error) {
    console.error('[stationsLib] supabase.insert error detail:', error);
    const err = new Error('Erreur lors de l\'insertion en base: ' + (error?.message || JSON.stringify(error)));
    err.cause = error;
    err.status = 500;
    throw err;
  }
  return normalizeStation((data && data[0]) || null);
}

export async function findStationByIdentifier(identifier) {
  if (!identifier && identifier !== 0) return null;
  const idNum = parseInt(identifier, 10);
  if (!Number.isNaN(idNum) && idNum > 0) {
    const { data, error } = await supabase.from('stations').select('*').eq('id', idNum).limit(1);
    if (error) throw error;
    return normalizeStation((data && data[0]) || null);
  }
  const code = normalizeCode(String(identifier));
  const { data, error } = await supabase.from('stations').select('*').ilike('code', code).limit(1);
  if (error) throw error;
  return normalizeStation((data && data[0]) || null);
}

export async function updateStationById(id, rawUpdate) {
  if (!id) {
    const err = new Error('ID manquant'); err.status = 400; throw err;
  }
  const updateObj = {};
  if (rawUpdate.nom !== undefined) updateObj.nom = rawUpdate.nom;
  if (rawUpdate.type_gare !== undefined) updateObj.type_gare = rawUpdate.type_gare;
  if (rawUpdate.service !== undefined) updateObj.service = ensureArrayMaybe(rawUpdate.service);
  if (rawUpdate.quais !== undefined) updateObj.quais = ensureArrayMaybe(rawUpdate.quais);
  if (rawUpdate.transports_commun !== undefined) updateObj.transports_commun = normalizeTransports(rawUpdate.transports_commun);
  if (rawUpdate.correspondance !== undefined) updateObj.correspondance = ensureArrayMaybe(rawUpdate.correspondance);
  if (rawUpdate.code !== undefined) updateObj.code = normalizeCode(rawUpdate.code);

  console.log('[stationsLib] updateStationById build updateObj:', { id, updateObj });

  if (Object.keys(updateObj).length === 0) {
    const err = new Error('Aucun champ à mettre à jour'); err.status = 400; throw err;
  }

  // Si code présent et changé, vérifier unicité
  if (updateObj.code) {
    // check existing station with same code
    const { data: dup, error: dupErr } = await supabase.from('stations').select('id').ilike('code', updateObj.code).limit(1);
    console.log('[stationsLib] updateStationById duplicate check:', { code: updateObj.code, dup, dupErr });
    if (dupErr) {
      const err = new Error('Erreur lors de la vérification du code'); err.status = 500; throw err;
    }
    if (dup && dup.length > 0) {
      // if duplicate and not the same id -> conflict
      if (!(dup.length === 1 && dup[0].id === id)) {
        const err = new Error('Le code fourni est déjà utilisé'); err.status = 409; throw err;
      }
    }
  }

  const { data, error } = await supabase.from('stations').update(updateObj).eq('id', id).select();
  console.log('[stationsLib] supabase.update result:', { error, data });
  if (error) {
    console.error('[stationsLib] supabase.update error detail:', error);
    const err = new Error('Erreur lors de la mise à jour: ' + (error?.message || JSON.stringify(error)));
    err.cause = error; err.status = 500; throw err;
  }
  return normalizeStation((data && data[0]) || null);
}

export async function deleteStationById(id) {
  if (!id) { const err = new Error('ID manquant'); err.status = 400; throw err; }
  const { error } = await supabase.from('stations').delete().eq('id', id);
  if (error) { const err = new Error('Erreur lors de la suppression'); err.cause = error; err.status = 500; throw err; }
  return true;
}
