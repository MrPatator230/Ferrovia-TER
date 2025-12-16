# Attribution de quai avec "Appliquer à toutes les gares desservies"

## Fonctionnalité

Cette fonctionnalité permet d'attribuer un numéro de quai à toutes les gares desservies par un horaire en une seule opération.

## Changements apportés

### 1. Migration de base de données

**Fichier:** `sql/migration_add_attribution_quais.sql`

Une nouvelle colonne `attribution_quais` (JSON) a été ajoutée à la table `horaires`. Cette colonne stocke les attributions de quais par code de gare.

**⚠️ IMPORTANT:** Exécutez cette migration sur votre instance Supabase avant d'utiliser la fonctionnalité:

```sql
ALTER TABLE horaires 
ADD COLUMN IF NOT EXISTS attribution_quais JSON DEFAULT NULL;
```

### 2. API Backend

**Fichier:** `src/app/api/admin/horaires/[id]/quais/route.js`

Deux endpoints ont été créés:

#### GET `/api/admin/horaires/[id]/quais`
Récupère les attributions de quais pour un horaire.

**Réponse:**
```json
{
  "success": true,
  "attribution_quais": {
    "DIJ": "3A",
    "SEU": "4B"
  }
}
```

#### PUT `/api/admin/horaires/[id]/quais`
Met à jour les attributions de quais.

**Payload:**
```json
{
  "station_id": 123,
  "quais": "3A",
  "apply_to_all": true
}
```

**Paramètres:**
- `station_id` (number): ID de la gare (requis si `apply_to_all` est false)
- `quais` (string): Numéro(s) de quai (ex: "3A", "4B, 5C")
- `apply_to_all` (boolean): Si true, applique le quai à toutes les gares du trajet

**Comportement avec `apply_to_all: true`:**
1. Récupère tous les IDs de gares du trajet (départ, arrivée, stops)
2. Convertit les IDs en codes de gare (3 lettres)
3. Applique ou supprime le quai pour chaque code dans `attribution_quais`

**Réponse:**
```json
{
  "success": true,
  "applied_stations": [
    { "station_id": 1, "code": "DIJ" },
    { "station_id": 2, "code": "SEU" }
  ],
  "attribution_quais": {
    "DIJ": "3A",
    "SEU": "3A"
  }
}
```

### 3. Interface utilisateur

**Fichier:** `src/app/espace/admin/attributions-quais/page.js`

Ajouts:
- État `applyAllValues` pour gérer le statut de la checkbox par horaire
- Colonne "Appliquer partout" dans le tableau avec une checkbox
- Checkbox "Appliquer à toutes les gares desservies" pour chaque horaire
- Envoi du flag `apply_to_all` dans la requête PUT

**Correction de bug:** La checkbox utilise correctement `h.id` (ID de l'horaire) au lieu de `horaireId` (variable non définie).

## Utilisation

1. Accédez à la page "Attributions des quais" dans l'interface admin
2. Sélectionnez une gare
3. Choisissez l'onglet "Départs" ou "Arrivées"
4. Pour chaque horaire:
   - Saisissez le(s) numéro(s) de quai dans le champ "Quais"
   - **Cochez** "Appliquer à toutes les gares desservies" si vous voulez que le quai soit attribué à toutes les gares du trajet (départ, arrivée, arrêts intermédiaires)
   - Cliquez sur "Enregistrer"

## Tests

Un script de test a été créé: `scripts/test-apply-to-all.js`

**Prérequis:**
- Le serveur de développement doit être en cours d'exécution (`npm run dev`)
- Au moins un horaire doit exister dans la base de données

**Exécution:**
```bash
node scripts/test-apply-to-all.js
```

**Tests effectués:**
1. Récupération initiale des attributions (GET)
2. Attribution de quai avec `apply_to_all: true` (PUT)
3. Vérification que plusieurs codes de gare ont reçu l'attribution (GET)
4. Suppression des attributions avec `apply_to_all: true` (PUT)

## Exemple de flux complet

### Scénario: Attribuer le quai "3A" à toutes les gares d'un TER

1. **État initial:**
   - Train TER 12345: Dijon → Beaune → Chalon-sur-Saône
   - Aucune attribution de quai

2. **Action utilisateur:**
   - Sélectionne la gare "Dijon" en départ
   - Pour le TER 12345, saisit "3A" dans le champ quais
   - Coche "Appliquer à toutes les gares desservies"
   - Clique sur "Enregistrer"

3. **Traitement backend:**
   ```javascript
   // Requête PUT
   {
     "station_id": 1,  // Dijon
     "quais": "3A",
     "apply_to_all": true
   }
   
   // Le backend:
   // 1. Récupère les station_ids: [1 (Dijon), 2 (Beaune), 3 (Chalon)]
   // 2. Convertit en codes: ["DIJ", "BEA", "CHA"]
   // 3. Met à jour attribution_quais
   ```

4. **Résultat:**
   ```json
   {
     "attribution_quais": {
       "DIJ": "3A",
       "BEA": "3A",
       "CHA": "3A"
     }
   }
   ```

## Dépannage

### La checkbox ne se met pas à jour
✅ **Corrigé:** Le bug utilisait `horaireId` (non défini) au lieu de `h.id`. Le code utilise maintenant correctement `h.id`.

### Erreur "Column 'attribution_quais' not found"
❌ **Solution:** Exécutez la migration SQL sur votre instance Supabase.

### Les gares intermédiaires ne reçoivent pas le quai
❌ **Vérification:** 
- Le champ `stops` de l'horaire doit contenir des objets avec `station_id`
- Ces `station_id` doivent exister dans la table `stations`
- Les stations doivent avoir un code (3 lettres)

## Architecture

```
Frontend (page.js)
    ↓ PUT /api/admin/horaires/[id]/quais
Backend (route.js)
    ↓ 1. Récupère l'horaire
    ↓ 2. Collecte les station_ids (depart, arrivee, stops)
    ↓ 3. Convertit les IDs en codes via table stations
    ↓ 4. Met à jour attribution_quais (JSON)
    ↓ 5. Sauvegarde dans Supabase
Database (Supabase)
    attribution_quais: { "DIJ": "3A", "SEU": "3A", ... }
```

## Notes techniques

- Le champ `attribution_quais` est au format JSON pour faciliter les recherches par code de gare
- Les codes de gare sont utilisés (au lieu des IDs) pour la portabilité et la lisibilité
- Le flag `apply_to_all` est facultatif (défaut: false)
- Si `quais` est vide, l'attribution est supprimée pour le(s) code(s) concerné(s)
