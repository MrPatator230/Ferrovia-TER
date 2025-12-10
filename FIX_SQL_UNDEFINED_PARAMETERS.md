# 🐛 Fix : Erreur SQL "Bind parameters must not contain undefined"

## Problème
Lors de la génération du PDF ou de la création/modification d'une fiche horaire, l'erreur suivante apparaît :
```
Erreur lors de la génération du PDF: Bind parameters must not contain undefined. To pass SQL NULL specify JS null
```

## Cause
MySQL2 n'accepte pas les valeurs `undefined` comme paramètres dans les requêtes préparées. Les valeurs peuvent être :
- `null` (SQL NULL) ✅
- Une valeur définie ✅
- `undefined` ❌ ERREUR

### Sources du problème

1. **Formulaire** : Les champs vides sont envoyés comme chaînes vides `""` ou `undefined`
2. **API** : Les paramètres optionnels peuvent être `undefined` si non fournis
3. **Génération PDF** : Le `service_annuel_id` peut être manquant

## Solutions appliquées

### 1. Nettoyage des données dans le formulaire

**Fichier** : `src/app/espace/admin/fiches-horaires/components/FicheHoraireForm.js`

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  // ...

  // ✅ Nettoyer les données : convertir les chaînes vides en null
  const cleanedData = {
    ...formData,
    ligne_id: formData.ligne_id || null,
    service_annuel_id: formData.service_annuel_id || null
  };

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleanedData)  // ✅ Utiliser cleanedData
  });
};
```

### 2. Conversion explicite dans l'API POST

**Fichier** : `src/app/api/fiches-horaires/route.js`

```javascript
const [result] = await connection.execute(
  `INSERT INTO fiches_horaires ...`,
  [
    nom,
    service_annuel_id,
    type_fiche,
    design_region,
    (ligne_id && ligne_id !== '') ? ligne_id : null,  // ✅ Conversion explicite
    afficher_page_recherche ? 1 : 0
  ]
);
```

### 3. Conversion explicite dans l'API PUT

**Fichier** : `src/app/api/fiches-horaires/[id]/route.js`

```javascript
const [result] = await connection.execute(
  `UPDATE fiches_horaires ...`,
  [
    nom,
    service_annuel_id,
    type_fiche,
    design_region,
    (ligne_id && ligne_id !== '') ? ligne_id : null,  // ✅ Conversion explicite
    afficher_page_recherche ? 1 : 0,
    id
  ]
);
```

### 4. Validation dans la génération PDF

**Fichier** : `src/app/api/fiches-horaires/[id]/generate/route.js`

```javascript
const fiche = fiches[0];

// ✅ Vérifier que le service_annuel_id existe
if (!fiche.service_annuel_id) {
  return NextResponse.json({
    success: false,
    message: 'La fiche horaire n\'a pas de service annuel associé'
  }, { status: 400 });
}

// Maintenant on peut utiliser fiche.service_annuel_id en toute sécurité
const [horaires] = await connection.execute(
  `SELECT ... WHERE h.service_annuel_id = ?`,
  [fiche.service_annuel_id]
);
```

## Règle générale pour éviter ce problème

### ❌ À éviter

```javascript
// Mauvais : peut envoyer undefined
const value = formData.optionalField;
await connection.execute('...', [value]);

// Mauvais : ne gère pas les chaînes vides
const value = formData.optionalField || null;  // "" devient null, mais undefined reste undefined
```

### ✅ Bonne pratique

```javascript
// Bon : conversion explicite
const value = (formData.optionalField && formData.optionalField !== '') 
  ? formData.optionalField 
  : null;

await connection.execute('...', [value]);
```

### ✅ Fonction utilitaire recommandée

Créer une fonction helper pour nettoyer les valeurs :

```javascript
function toSqlValue(value) {
  // undefined, null, ou chaîne vide => null
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return value;
}

// Utilisation
await connection.execute('...', [
  toSqlValue(ligne_id),
  toSqlValue(autre_champ_optionnel)
]);
```

## Autres cas courants

### Dates
```javascript
// ❌ Peut envoyer undefined
const date = formData.date;

// ✅ Conversion explicite
const date = formData.date || null;
```

### Nombres
```javascript
// ❌ Peut envoyer undefined ou ""
const nombre = formData.nombre;

// ✅ Conversion et parsing
const nombre = formData.nombre ? parseInt(formData.nombre, 10) : null;
```

### Booléens
```javascript
// ❌ Peut envoyer undefined
const bool = formData.actif;

// ✅ Conversion explicite
const bool = formData.actif ? 1 : 0;
```

## Vérification

Pour vérifier que tous les paramètres sont corrects, ajouter un log avant l'exécution :

```javascript
const params = [nom, service_annuel_id, type_fiche, design_region, ligne_id, afficher_page_recherche];

// Log pour debug
console.log('Paramètres SQL:', params);
console.log('Types:', params.map(p => typeof p));
console.log('Contient undefined?', params.some(p => p === undefined));

await connection.execute('...', params);
```

## Messages d'erreur associés

- `Bind parameters must not contain undefined`
- `Incorrect parameter count in the call to native function`
- `Parameter X is undefined`

## Fichiers modifiés

1. ✅ `src/app/espace/admin/fiches-horaires/components/FicheHoraireForm.js`
2. ✅ `src/app/api/fiches-horaires/route.js`
3. ✅ `src/app/api/fiches-horaires/[id]/route.js`
4. ✅ `src/app/api/fiches-horaires/[id]/generate/route.js`

## Tests recommandés

1. ✅ Créer une fiche horaire sans ligne (ligne_id vide)
2. ✅ Modifier une fiche horaire en vidant la ligne
3. ✅ Générer un PDF pour une fiche avec ligne
4. ✅ Générer un PDF pour une fiche sans ligne
5. ✅ Tester avec des champs texte vides

---

**Date de correction** : 9 décembre 2025  
**Fichiers corrigés** : 4 fichiers

