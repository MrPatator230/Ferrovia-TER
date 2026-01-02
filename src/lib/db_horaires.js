import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
// NOTE: nous conservons une valeur par défaut placeholder pour la compatibilité,
// mais l'absence de NEXT_PUBLIC_SUPABASE_URL provoquera souvent des erreurs DNS (ENOTFOUND).
const DEFAULT_SUPABASE_URL = 'https://kkygdncjzytnndupzfjg.supabase.co';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'sb_publishable_m_5dWRQ6LLsIdIxOG-CEUg_YNhcKmEq';

// Avertissement explicite si la variable d'environnement n'est pas définie
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  // message explicite pour faciliter le debug local — ne pas lever d'erreur pour ne pas casser dev server
  console.warn('[db_horaires] WARNING: NEXT_PUBLIC_SUPABASE_URL is not set. Using placeholder URL', DEFAULT_SUPABASE_URL);
  console.warn('[db_horaires] Tip: set NEXT_PUBLIC_SUPABASE_URL in your .env.local or environment to your Supabase project URL (e.g. https://<project>.supabase.co)');
}

// Créer le client Supabase
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false, // Pour les APIs serveur
  }
});

// Parser SQL pour extraire les informations
function parseSQL(sql, params = []) {
  const sqlLower = sql.toLowerCase().trim();
  let tableName = null;
  let operation = null;

  if (sqlLower.startsWith('select')) {
    operation = 'select';
    const fromMatch = sql.match(/from\s+`?(\w+)`?/i);
    if (fromMatch) tableName = fromMatch[1];
  } else if (sqlLower.startsWith('insert')) {
    operation = 'insert';
    const intoMatch = sql.match(/insert\s+into\s+`?(\w+)`?/i);
    if (intoMatch) tableName = intoMatch[1];
  } else if (sqlLower.startsWith('update')) {
    operation = 'update';
    const updateMatch = sql.match(/update\s+`?(\w+)`?/i);
    if (updateMatch) tableName = updateMatch[1];
  } else if (sqlLower.startsWith('delete')) {
    operation = 'delete';
    const fromMatch = sql.match(/delete\s+from\s+`?(\w+)`?/i);
    if (fromMatch) tableName = fromMatch[1];
  }

  return { operation, tableName, sql, params };
}

// Wrapper pour compatibilité avec l'API mysql2/pg execute()
const wrappedPool = {
  async execute(sql, params = []) {
    try {
      const { operation, tableName } = parseSQL(sql, params);

      if (!tableName) {
        console.warn('⚠️  Requête SQL complexe détectée:', sql);
        throw new Error('Requête SQL non supportée. Utilisez l\'API Supabase directement via pool.from(table)');
      }

      // SELECT
      if (operation === 'select') {
        // Détecter les JOINs complexes avec alias
        const hasJoin = sql.toLowerCase().includes('join');
        const hasAlias = /\w+\.\w+/.test(sql); // Détecte table.column

        if (hasJoin || (hasAlias && sql.includes(','))) {
          // Les JOINs complexes ne sont pas supportés par l'API Supabase REST
          // On doit utiliser PostgREST ou faire des requêtes séparées
          throw new Error(
            'Requête JOIN complexe détectée. ' +
            'Supabase PostgREST ne supporte pas la syntaxe SQL JOIN standard. ' +
            'Utilisez des requêtes séparées ou l\'API Supabase avec relations imbriquées. ' +
            'Exemple: supabase.from("horaires").select("*, stations!depart_station_id(*)")'
          );
        }

        let query = supabase.from(tableName).select('*');

        // WHERE clause simple (= avec un paramètre)
        const whereMatch = sql.match(/where\s+(\w+)\s*=\s*\?/i);
        if (whereMatch && params.length > 0) {
          query = query.eq(whereMatch[1], params[0]);
        }

        // ORDER BY
        const orderMatch = sql.match(/order\s+by\s+(?:\w+\.)?(\w+)\s+(asc|desc)?/i);
        if (orderMatch) {
          const column = orderMatch[1];
          const ascending = !orderMatch[2] || orderMatch[2].toLowerCase() === 'asc';
          query = query.order(column, { ascending });
        }

        // LIMIT
        const limitMatch = sql.match(/limit\s+(\d+)/i);
        if (limitMatch) {
          query = query.limit(parseInt(limitMatch[1]));
        }

        const { data, error } = await query;

        if (error) throw error;

        return [data || [], []];
      }

      // INSERT
      if (operation === 'insert') {
        // Parser les colonnes et valeurs
        const columnsMatch = sql.match(/\((.*?)\)\s+values/i);

        if (columnsMatch && params.length > 0) {
          const columns = columnsMatch[1].split(',').map(c => c.trim().replace(/`/g, ''));
          const dataToInsert = {};

          columns.forEach((col, index) => {
            if (params[index] !== undefined) {
              dataToInsert[col] = params[index];
            }
          });

          const { data, error } = await supabase
            .from(tableName)
            .insert(dataToInsert)
            .select();

          if (error) throw error;

          // Pour compatibilité MySQL, retourner un objet avec insertId
          // Le premier élément du tableau est l'objet result (comme MySQL)
          const result = {
            insertId: data && data[0] && data[0].id ? data[0].id : null,
            affectedRows: data ? data.length : 0
          };

          // Retourner [result] comme MySQL (pas [data, result])
          // L'API attend result.insertId dans le premier élément
          return [result, []];
        }

        throw new Error('INSERT parsing failed');
      }

      // UPDATE
      if (operation === 'update') {
        // Parser SET et WHERE
        // capture multi-ligne entre SET et WHERE
        const setMatch = sql.match(/set\s+([\s\S]*?)\s+where/i);
        const whereMatch = sql.match(/where\s+([^\s=]+)\s*=\s*\?/i);

        if (setMatch && whereMatch) {
          // Extraire les noms de colonnes dans SET en recherchant les occurrences 'col = ?'
          const setSection = setMatch[1];
          const colRegex = /`?(\w+)`?\s*=\s*\?/g;
          const cols = [];
          let m;
          while ((m = colRegex.exec(setSection)) !== null) {
            cols.push(m[1]);
          }

          // Si on n'a pas trouvé via regex, fallback à l'ancien split
          let dataToUpdate = {};
          if (cols.length > 0) {
            // Associer params[0..cols.length-1] aux colonnes
            for (let i = 0; i < cols.length; i++) {
              if (params[i] !== undefined) dataToUpdate[cols[i]] = params[i];
            }
          } else {
            const setParts = setSection.split(',');
            let paramIndex = 0;
            setParts.forEach(part => {
              const [col] = part.split('=').map(s => s.trim().replace(/`/g, ''));
              if (params[paramIndex] !== undefined) {
                dataToUpdate[col] = params[paramIndex];
                paramIndex++;
              }
            });
          }

          // Déterminer la colonne WHERE et la valeur associée
          let whereCol = whereMatch[1];
          // strip table prefix if present (e.g. fh.id -> id)
          if (whereCol && whereCol.indexOf('.') !== -1) whereCol = whereCol.split('.').pop();
          // where value usually follows the SET params: try to pick params[cols.length] or last param
          const whereVal = (cols.length > 0 && params.length > cols.length) ? params[cols.length] : params[params.length - 1];

          const { data, error } = await supabase
            .from(tableName)
            .update(dataToUpdate)
            .eq(whereCol, whereVal)
            .select();

          if (error) throw error;

          // Retourner au format MySQL [result, fields]
          const result = {
            affectedRows: data ? data.length : 0
          };

          return [result, []];
        }

        throw new Error('UPDATE parsing failed');
      }

      // DELETE
      if (operation === 'delete') {
        const whereMatch = sql.match(/where\s+(\w+)\s*=\s*\?/i);

        if (whereMatch && params.length > 0) {
          const { data, error } = await supabase
            .from(tableName)
            .delete()
            .eq(whereMatch[1], params[0])
            .select();

          if (error) throw error;

          // Retourner au format MySQL [result, fields]
          const result = {
            affectedRows: data ? data.length : 0
          };

          return [result, []];
        }

        throw new Error('DELETE parsing failed');
      }

      throw new Error(`Opération SQL non supportée: ${operation}`);

    } catch (err) {
      console.error('❌ Erreur DB Horaires (Supabase):', err.message);
      console.error('   SQL:', sql);
      console.error('   Params:', params);
      throw err;
    }
  },

  async query(sql, params = []) {
    return this.execute(sql, params);
  },

  // Accès direct au client Supabase
  client: supabase,

  // Helper: Accès direct aux tables
  from(table) {
    return supabase.from(table);
  },

  async end() {
    // Supabase gère automatiquement les connexions
    return Promise.resolve();
  }
};

export default wrappedPool;
export { supabase };
