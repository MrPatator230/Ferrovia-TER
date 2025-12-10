# ✅ MODIFICATION TERMINÉE - Stockage avec nom de fichier original

## 🎯 Objectif atteint

Les fichiers d'images des matériels roulants sont maintenant stockés dans `public/m-r/` **avec leur nom original** au lieu du numéro de série.

## 📋 Ce qui a été modifié

### 1. **MaterialForm.js** (Formulaire de création)
- ✅ Extraction du nom de fichier original (`imageFile.name`)
- ✅ Envoi du nom dans le payload (`image_filename`)

### 2. **route.js** (API Backend)
- ✅ Extraction du champ `image_filename`
- ✅ Nettoyage du nom de fichier (sécurité)
- ✅ Utilisation du nom original pour sauvegarder
- ✅ Fallback sur numéro de série si nom non fourni

### 3. **Documentation**
- ✅ `MATERIEL_ROULANT_README.md` mis à jour
- ✅ `TESTS_STOCKAGE_IMAGES.md` créé
- ✅ `CHANGEMENT_STOCKAGE_IMAGES.md` créé

## 🔍 Exemples concrets

### Avant (numéro de série)
```
Upload: train_ter.jpg
Stocké: public/m-r/12345.jpg
```

### Après (nom original)
```
Upload: train_ter.jpg
Stocké: public/m-r/train_ter.jpg
```

### Avec caractères spéciaux
```
Upload: Train TER (2024).jpg
Stocké: public/m-r/Train_TER__2024_.jpg
```

## 🔒 Sécurité

Le nom de fichier est **nettoyé automatiquement** :
```javascript
filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
```

**Caractères autorisés :** a-z, A-Z, 0-9, `.`, `_`, `-`  
**Autres caractères :** remplacés par `_`

## ✅ Tests à effectuer

1. **Test basique**
   - Upload fichier `agc_b82500.jpg`
   - Vérifier : `public/m-r/agc_b82500.jpg` existe
   - Vérifier : image s'affiche dans la card

2. **Test avec espaces**
   - Upload fichier `Train AGC.jpg`
   - Vérifier : `public/m-r/Train_AGC.jpg` existe
   - Vérifier : image s'affiche correctement

3. **Test avec caractères spéciaux**
   - Upload fichier `Train (Test).jpg`
   - Vérifier : `public/m-r/Train__Test_.jpg` existe
   - Vérifier : aucune erreur

4. **Test sans extension bizarre**
   - Upload fichier `photo.jpeg`
   - Vérifier : `public/m-r/photo.jpeg` existe
   - Vérifier : image s'affiche

## 🚀 Prêt à utiliser !

Le système est maintenant opérationnel. Vous pouvez :

1. Démarrer l'application : `npm run dev`
2. Accéder à `/espace/admin/materiels`
3. Créer un matériel avec une image
4. Vérifier que le fichier est bien dans `public/m-r/` avec le nom original

## 📝 Note importante

- Les fichiers existants avec numéro de série (ex: `12345.jpg`) ne sont **pas affectés**
- Les nouveaux uploads utiliseront le nom original
- Le système a un fallback robuste si le nom n'est pas fourni

## ✨ Avantages

- ✅ **Lisibilité** : On reconnaît immédiatement le fichier
- ✅ **Organisation** : Noms significatifs dans le dossier
- ✅ **Sécurité** : Caractères dangereux neutralisés
- ✅ **Compatibilité** : Fonctionne partout
- ✅ **Fallback** : Toujours une solution de repli

---

**Prêt à tester !** 🎉
