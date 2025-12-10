# Tests - Stockage des images avec nom original

## Test 1 : Upload avec nom de fichier standard
- **Fichier** : `train_ter.jpg`
- **Attendu** : Fichier stocké dans `public/m-r/train_ter.jpg`
- **Chemin DB** : `/m-r/train_ter.jpg`

## Test 2 : Upload avec caractères spéciaux
- **Fichier** : `Train TER (2024).jpg`
- **Attendu** : Fichier stocké dans `public/m-r/Train_TER__2024_.jpg`
- **Chemin DB** : `/m-r/Train_TER__2024_.jpg`
- **Note** : Caractères spéciaux `( )` remplacés par `_`

## Test 3 : Upload avec accents
- **Fichier** : `Matériel_Ferroviaire.jpg`
- **Attendu** : Fichier stocké dans `public/m-r/Mat_riel_Ferroviaire.jpg`
- **Chemin DB** : `/m-r/Mat_riel_Ferroviaire.jpg`

## Test 4 : Upload sans nom (fallback)
- **Fichier** : (pas de nom fourni)
- **Attendu** : Fichier stocké dans `public/m-r/12345.jpg` (numéro de série)
- **Chemin DB** : `/m-r/12345.jpg`

## Vérification manuelle
1. Créer un matériel avec une image nommée `AGC_B82500.jpg`
2. Vérifier que le fichier existe dans `public/m-r/AGC_B82500.jpg`
3. Vérifier que l'image s'affiche dans la card
4. Vérifier en DB que `image_path = '/m-r/AGC_B82500.jpg'`

## Regex de nettoyage
```javascript
filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
```
- **Conserve** : lettres (a-z, A-Z), chiffres (0-9), point (.), underscore (_), tiret (-)
- **Remplace** : tout autre caractère par underscore (_)
