import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

function isUuid(val) {
  if (!val || typeof val !== 'string') return false;
  // simple UUID v4/v1 regex (accept lowercase/uppercase)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

async function tableHasColumn(columnName) {
  try {
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'perturbations')
      .eq('column_name', columnName)
      .limit(1);
    if (error) {
      console.warn('tableHasColumn error', error);
      return false;
    }
    return Array.isArray(data) && data.length > 0;
  } catch (e) {
    console.warn('tableHasColumn exception', e);
    return false;
  }
}

export async function GET(req) {
  try {
    // Lister les perturbations (ordre décroissant)
    const { data, error } = await supabase.from('perturbations').select('*').order('created_at', { ascending: false }).limit(2000);
    if (error) {
      console.error('Supabase list perturbations error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (e) {
    console.error('GET /api/admin/perturbations error', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    const hasHoraire = await tableHasColumn('horaire_id');
    const horaireId = hasHoraire && isUuid(body.horaire_id) ? body.horaire_id : null;

    const toInsert = {
      // n'ajouter horaire_id que si la colonne existe
      ...(hasHoraire ? { horaire_id: horaireId } : {}),
      numero_train: body.numero_train || null,
      type: body.type || null,
      cause: body.cause || null,
      temps_retard_minutes: body.temps_retard_minutes || null,
      consequence_parcours: body.consequence_parcours || false,
      jours_impact: body.jours_impact || null,
      parcours_changes: body.parcours_changes || null,
      created_by: null
    };

    const { data, error } = await supabase.from('perturbations').insert([toInsert]).select();
    if (error) {
      console.error('Supabase insert perturbations error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    console.error('POST /api/admin/perturbations error', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json();
    const id = body.id;
    if (!isUuid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const hasHoraire = await tableHasColumn('horaire_id');

    // Construire l'objet de mise à jour avec les champs autorisés
    const allowed = ['numero_train', 'type', 'cause', 'temps_retard_minutes', 'consequence_parcours', 'jours_impact', 'parcours_changes'];
    if (hasHoraire) allowed.unshift('horaire_id');

    const toUpdate = {};
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, k)) toUpdate[k] = body[k];
    }

    // Coercer horaire_id si présent et si la colonne existe
    if (hasHoraire && toUpdate.horaire_id && !isUuid(toUpdate.horaire_id)) {
      toUpdate.horaire_id = null;
    }

    const { data, error } = await supabase.from('perturbations').update(toUpdate).eq('id', id).select();
    if (error) {
      console.error('Supabase update perturbations error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data }, { status: 200 });
  } catch (e) {
    console.error('PATCH /api/admin/perturbations error', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
