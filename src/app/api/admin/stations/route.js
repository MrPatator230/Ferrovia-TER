// filepath: c:\Users\MrPatator\Documents\Développement\Ferrovia-TER\src\app\api\admin\stations\route.js
import { NextResponse } from 'next/server';
import pool from '@/lib/db_horaires';

function safeParseJsonOrCsv(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return [];

  const s = value.trim();
  if (!s) return [];

  // Si ça ressemble à du JSON, essayer JSON.parse
  if (s.startsWith('{') || s.startsWith('[')) {
    try {
      return JSON.parse(s);
    } catch (e) {
      // fallback vers CSV
    }
  }

  // Fallback: interpréter comme liste séparée par des virgules
  try {
    return s.split(',').map(it => it.trim()).filter(Boolean);
  } catch (e) {
    return [];
  }
}

// GET - Récupérer toutes les gares
export async function GET(request) {
  try {
    const [rows] = await pool.execute('SELECT * FROM stations ORDER BY nom ASC');

    const stations = rows.map(station => ({
      ...station,
      service: safeParseJsonOrCsv(station.service),
      quais: (() => {
        // quais attend normalement un tableau d'objets; essayer JSON puis fallback []
        try {
          const parsed = safeParseJsonOrCsv(station.quais);
          // si parsed est un tableau de strings (CSV), on retourne [] car on ne sait pas mapper
          if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') return [];
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) { return []; }
      })(),
      transports_commun: (() => {
        try {
          const parsed = safeParseJsonOrCsv(station.transports_commun);
          // si parsed est un tableau de strings (CSV), on retourne des objets simples { type: 'value' }
          if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
            return parsed.map(p => ({ type: p }));
          }
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) { return []; }
      })()
    }));

    return NextResponse.json(stations);
  } catch (error) {
    console.error('Erreur lors de la récupération des gares:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des gares' }, { status: 500 });
  }
}

// POST - Créer une nouvelle gare
export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (err) {
      // Peut-être que le client a envoyé du form-urlencoded (ex: via <form>)
      const text = await request.text();
      try {
        // essayer d'interpréter comme URLSearchParams
        const params = new URLSearchParams(text);
        body = Object.fromEntries(params.entries());
      } catch (e) {
        // fallback : corps brut
        body = { raw: text };
      }
    }

    console.log('POST /api/admin/stations body:', body);

    let { nom, type_gare, service, quais, transports_commun } = body;

    // Normaliser `service` : peut être une chaîne 'TER,TGV' ou un JSON stringifié
    if (typeof service === 'string') {
      try { service = JSON.parse(service); } catch (e) {
        service = service.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    if (!Array.isArray(service)) service = [];

    // Normaliser `quais` et `transports_commun` si envoyés en string
    if (typeof quais === 'string') {
      try { quais = JSON.parse(quais); } catch (e) { quais = []; }
    }
    if (!Array.isArray(quais)) quais = [];

    if (typeof transports_commun === 'string') {
      try { transports_commun = JSON.parse(transports_commun); } catch (e) { transports_commun = []; }
    }
    if (!Array.isArray(transports_commun)) transports_commun = [];

    if (!nom || !type_gare) {
      return NextResponse.json({ error: 'Le nom et le type de gare sont requis' }, { status: 400 });
    }

    const [result] = await pool.execute(
      `INSERT INTO stations (nom, type_gare, service, quais, transports_commun) VALUES (?, ?, ?, ?, ?)`,
      [
        nom,
        type_gare,
        JSON.stringify(service),
        JSON.stringify(quais),
        JSON.stringify(transports_commun)
      ]
    );

    const [newStationRows] = await pool.execute('SELECT * FROM stations WHERE id = ?', [result.insertId]);

    const newStation = newStationRows[0];
    const station = {
      ...newStation,
      service: safeParseJsonOrCsv(newStation.service || '[]'),
      quais: (() => {
        try {
          const parsed = safeParseJsonOrCsv(newStation.quais || '[]');
          if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') return [];
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) { return []; }
      })(),
      transports_commun: (() => {
        try {
          const parsed = safeParseJsonOrCsv(newStation.transports_commun || '[]');
          if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
            return parsed.map(p => ({ type: p }));
          }
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) { return []; }
      })()
    };

    return NextResponse.json(station, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création de la gare:', error);
    return NextResponse.json({ error: 'Erreur lors de la création de la gare' }, { status: 500 });
  }
}
