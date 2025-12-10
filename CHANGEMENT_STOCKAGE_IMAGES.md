# 🔄 Changement : Stockage avec nom de fichier original

## ✅ Modifications appliquées

### 📝 Fichiers modifiés

#### 1. `MaterialForm.js` (Frontend)
**Avant :**
```javascript
let image_base64 = null;
if(imageFile){
  image_base64 = await fileToBase64(imageFile);
}
const payload = { ..., image_base64 };
```

**Après :**
```javascript
let image_base64 = null;
let image_filename = null;
if(imageFile){
  image_base64 = await fileToBase64(imageFile);
  image_filename = imageFile.name;  // ✨ Nouveau
}
const payload = { ..., image_base64, image_filename }; // ✨ Ajout
```

#### 2. `route.js` (API)
**Avant :**
```javascript
const filename = `${numero_serie}.${ext}`;  // Ex: 12345.jpg
```

**Après :**
```javascript
let filename;
if(image_filename){
  // Utiliser le nom original, nettoyé
  filename = image_filename.replace(/[^a-zA-Z0-9._-]/g, '_');
} else {
  // Fallback sur numéro de série
  filename = `${numero_serie}.${ext}`;
}
```

## 🎯 Comportement

### Exemple 1 : Nom standard
- **Upload** : `train_agc.jpg`
- **Stocké** : `public/m-r/train_agc.jpg`
- **DB** : `/m-r/train_agc.jpg`

### Exemple 2 : Nom avec espaces et caractères spéciaux
- **Upload** : `Train AGC (2024).jpg`
- **Stocké** : `public/m-r/Train_AGC__2024_.jpg`
- **DB** : `/m-r/Train_AGC__2024_.jpg`

### Exemple 3 : Nom avec accents
- **Upload** : `Matériel_Ferré.png`
- **Stocké** : `public/m-r/Mat_riel_Ferr_.png`
- **DB** : `/m-r/Mat_riel_Ferr_.png`

## 🔒 Sécurité

### Nettoyage du nom de fichier
```javascript
filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
```

**Caractères autorisés :**
- Lettres : `a-z`, `A-Z`
- Chiffres : `0-9`
- Point : `.`
- Underscore : `_`
- Tiret : `-`

**Caractères remplacés par `_` :**
- Espaces
- Parenthèses
- Accents
- Slashes
- Caractères spéciaux

## ✅ Avantages

1. **Conservation de l'information** : Le nom original du fichier est préservé
2. **Identification facile** : On reconnaît facilement le fichier dans le dossier
3. **Sécurité** : Les caractères dangereux sont neutralisés
4. **Compatibilité** : Fonctionne sur tous les systèmes de fichiers
5. **Fallback robuste** : Si le nom n'est pas fourni, utilise le numéro de série

## 🧪 Tests recommandés

```bash
# 1. Créer un matériel avec image "AGC_B82500.jpg"
# Vérifier : public/m-r/AGC_B82500.jpg existe

# 2. Créer un matériel avec image "Train (Test).jpg"
# Vérifier : public/m-r/Train__Test_.jpg existe

# 3. Vérifier que les images s'affichent dans les cards

# 4. Vérifier en DB que image_path contient le bon chemin
```

## 📊 Comparaison

| Aspect | Avant | Après |
|--------|-------|-------|
| Nom fichier | `12345.jpg` | `train_agc.jpg` |
| Identifiable | ❌ Non | ✅ Oui |
| Nom original | ❌ Perdu | ✅ Conservé |
| Sécurité | ✅ Oui | ✅ Oui |
| Fallback | N/A | ✅ Numéro série |

## 🚀 Prêt à tester !

Le système est maintenant configuré pour stocker les fichiers avec leur nom original dans `public/m-r/`. Testez en uploadant différents types de fichiers avec différents noms !
