# Refonte Complète de l'API Horaires

## Date
30 novembre 2025

## Fichiers Modifiés

### 1. `src/app/api/admin/horaires/route.js`
**Endpoints**: GET (liste), POST (création)

### 2. `src/app/api/admin/horaires/[id]/route.js`
**Endpoints**: GET (par ID), PUT (mise à jour), DELETE (suppression)

---

## Problèmes Corrigés

### 1. **ReferenceError: Cannot access 'params' before initialization**
- **Cause**: Conflit de noms entre le paramètre `{ params }` de Next.js et les variables locales `const params = [...]`
- **Solution**: Renommage des variables locales en `sqlParams` et `insertParams`

### 2. **Error: params is a Promise and must be unwrapped**
- **Cause**: Next.js 15+ rend `params` asynchrone dans les routes dynamiques
- **Solution**: Ajout de `const resolvedParams = await params;` dans tous les handlers (GET, PUT, DELETE)

### 3. **Code dupliqué et désorganisé**
- **Solution**: Création de fonctions helper réutilisables et nettoyage du code

### 4. **Validations incohérentes**
- **Solution**: Validations strictes et uniformes pour tous les champs requis

### 5. **Gestion d'erreurs insuffisante**
- **Solution**: Try/catch avec logging et messages d'erreur clairs

---

## Fonctions Helper Créées

### `normalizeTime(t)`
- Valide et normalise les heures au format `HH:MM`
- Accepte `HH:MM` ou `HH:MM:SS`, retourne toujours `HH:MM`
- Retourne `null` si invalide

### `safeParseJSON(input, fallback)`
- Parse JSON de manière sécurisée
- Retourne la valeur fallback en cas d'erreur
- Gère les cas où l'input est déjà un objet

### `parseStopsInput(raw)`
- Valide et normalise le tableau des arrêts
- Vérifie que `station_id` est numérique
- Normalise les heures de départ et d'arrivée

### `formatHoraireRow(r)`
- Formate uniformément les lignes retournées au client
- Parse les champs JSON (`stops`, `jours_circulation`, `jours_personnalises`)
- Convertit les booléens MySQL (0/1) en vrais booléens
- Normalise tous les formats de temps

---

## Validations Implémentées

### Champs Requis
- ✅ `depart_station_id` (numeric)
- ✅ `arrivee_station_id` (numeric)
- ✅ `depart_time` (HH:MM format)
- ✅ `arrivee_time` (HH:MM format)

### Pour Chaque Arrêt (stops)
- ✅ `station_id` (numeric)
- ✅ `depart_time` (HH:MM format)
- ✅ `arrivee_time` (HH:MM format)

### Champs Optionnels
- `numero_train` (string ou null)
- `type_train` (string ou null)
- `materiel_id` (numeric ou null)
- `jours_circulation` (object)
- `circulent_jours_feries` (boolean)
- `circulent_dimanches` (boolean)
- `jours_personnalises` (array)
- `is_substitution` (boolean)

---

## Codes de Statut HTTP

| Code | Signification | Quand |
|------|---------------|-------|
| 200 | OK | GET/PUT réussis |
| 201 | Created | POST réussi |
| 400 | Bad Request | Validation échouée, ID invalide |
| 404 | Not Found | Horaire non trouvé |
| 500 | Internal Server Error | Erreur serveur/base de données |

---

## Réponses d'Erreur

### Validation échouée (400)
```json
{
  "error": "Champs requis manquants ou invalides",
  "missing": {
    "depart_station_id": "missing_or_invalid",
    "stops[0].depart_time": "missing_or_invalid_time_format"
  }
}
```

### Horaire non trouvé (404)
```json
{
  "error": "Not found"
}
```

### Erreur serveur (500)
```json
{
  "error": "Erreur serveur",
  "debug": "Message d'erreur détaillé"
}
```

---

## Exemples d'Utilisation

### GET - Lister les horaires
```powershell
curl http://localhost:3000/api/admin/horaires
```

### POST - Créer un horaire
```powershell
curl -X POST http://localhost:3000/api/admin/horaires `
  -H "Content-Type: application/json" `
  -d '{
    "depart_station_id": 1,
    "arrivee_station_id": 2,
    "depart_time": "08:30",
    "arrivee_time": "09:15",
    "numero_train": "T123",
    "type_train": "TER",
    "stops": [
      {"station_id": 1, "depart_time":"08:30", "arrivee_time":"08:32"},
      {"station_id": 2, "depart_time":"09:12", "arrivee_time":"09:15"}
    ],
    "jours_circulation": {"mon": true, "tue": true},
    "circulent_jours_feries": false,
    "circulent_dimanches": true,
    "materiel_id": null,
    "is_substitution": false
  }'
```

### GET - Récupérer un horaire par ID
```powershell
curl http://localhost:3000/api/admin/horaires/2
```

### PUT - Mettre à jour un horaire (partiel)
```powershell
curl -X PUT http://localhost:3000/api/admin/horaires/2 `
  -H "Content-Type: application/json" `
  -d '{
    "depart_time": "08:45",
    "stops": [
      {"station_id":1,"depart_time":"08:45","arrivee_time":"08:47"},
      {"station_id":2,"depart_time":"09:20","arrivee_time":"09:22"}
    ]
  }'
```

### DELETE - Supprimer un horaire
```powershell
curl -X DELETE http://localhost:3000/api/admin/horaires/2
```

---

## Améliorations Techniques

### 1. **Mise à jour Partielle (PUT)**
- Le PUT accepte maintenant les mises à jour partielles
- Les champs non fournis conservent leurs valeurs existantes en DB
- Lecture de l'enregistrement existant avant mise à jour

### 2. **Gestion des Types**
- Conversion stricte des IDs en entiers
- Gestion des valeurs `undefined` → `null`
- Chaînes vides transformées en `null` pour les champs optionnels

### 3. **Format de Sortie Uniforme**
- Tous les endpoints utilisent `formatHoraireRow()`
- Format cohérent entre GET (liste), GET (ID), POST et PUT
- Times toujours au format `HH:MM`
- Booléens toujours en `true/false` (pas 0/1)

### 4. **Sécurité SQL**
- Utilisation systématique de requêtes préparées
- Paramètres bindés via `pool.execute(sql, params)`
- Aucune concaténation de chaînes SQL

### 5. **Logging**
- `console.error()` pour les erreurs serveur
- `console.warn()` pour les validations échouées (POST uniquement)
- `console.debug()` pour le debug des paramètres (POST uniquement)

---

## Points d'Attention

### ⚠️ Next.js 15+ - Params Asynchrone
Dans Next.js 15+, le paramètre `params` des routes dynamiques est une Promise. 
**Toujours utiliser**: `const resolvedParams = await params;`

### ⚠️ Validation Stricte
Les arrêts (`stops`) doivent **tous** avoir `station_id`, `depart_time` et `arrivee_time` valides, sinon la requête est rejetée avec un 400.

### ⚠️ Limite de Résultats
GET (liste) est limité à **500 résultats** pour éviter les surcharges.

---

## Prochaines Améliorations Possibles

### 1. **Module Helper Partagé**
Créer `src/lib/horaire-utils.js` pour partager les helpers entre route.js et [id]/route.js

### 2. **Validation avec Zod/Joi**
Remplacer les validations manuelles par un schéma formel

### 3. **Tests Unitaires**
- Tests pour `normalizeTime()`, `safeParseJSON()`, etc.
- Tests d'intégration pour les endpoints

### 4. **Pagination**
Ajouter `?page=1&limit=50` pour GET (liste)

### 5. **Filtres**
Ajouter filtres par gare, date, type de train

### 6. **Authentification**
Vérifier les permissions admin via middleware

### 7. **Logs Structurés**
Utiliser Winston ou Pino pour des logs JSON structurés

---

## Vérification

### ✅ Aucune Erreur de Compilation
Seuls des warnings IDE (sources SQL non configurées) subsistent - ce sont des avertissements d'IDE, pas des erreurs d'exécution.

### ✅ Code Propre et Lisible
- Fonctions bien nommées
- Commentaires pertinents
- Structure cohérente

### ✅ Robustesse
- Gestion complète des cas d'erreur
- Validations strictes
- Types corrects

---

## Commande de Test

Redémarrez le serveur Next.js pour appliquer les changements :
```powershell
npm run dev
```

Testez ensuite les endpoints avec les exemples ci-dessus.

---

**Auteur**: GitHub Copilot  
**Date**: 30 novembre 2025  
**Status**: ✅ Refonte Complète Terminée

