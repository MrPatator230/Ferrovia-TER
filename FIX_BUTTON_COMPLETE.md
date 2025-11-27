# 🔧 SOLUTION COMPLÈTE - Bouton Account Invisible

## 🔍 Diagnostic du problème

D'après la capture d'écran fournie, le bouton Account **disparaît complètement** quand le menu s'ouvre, ne laissant que le menu visible. Le problème est plus complexe qu'un simple z-index.

## 🎯 Causes identifiées

1. **Web Components SNCF** : Le `wcs-com-nav` gère son propre stacking context
2. **Position du dropdown** : Couvrait potentiellement le bouton
3. **Z-index non hérité** : Les web components ne transmettent pas toujours le z-index aux enfants
4. **Slot "actions"** : N'avait pas de z-index défini

## ✅ Solutions appliquées

### 1. Modification du CSS du UserMenu

**Fichier** : `src/components/UserMenu.module.css`

```css
.userMenuContainer {
  position: relative;
  display: inline-block;
  z-index: 1001;
}

.buttonWrapper {
  position: relative;
  z-index: 1002;
  pointer-events: auto;        /* ← Force l'interactivité */
  display: inline-block;
}

.activeButton {
  background-color: rgba(11, 125, 72, 0.15) !important;
  position: relative;
  z-index: 1003;              /* ← Z-index le plus élevé */
}

.dropdown {
  position: absolute;
  top: calc(100% + 0.75rem);  /* ← Plus d'espace */
  right: 0;
  width: 320px;
  z-index: 999;               /* ← En dessous du bouton */
  pointer-events: auto;
  /* ...autres styles... */
}
```

### 2. Ajout de style inline sur le wcs-button

**Fichier** : `src/components/UserMenu.js`

```javascript
<wcs-button
  mode="clear"
  shape="round"
  onClick={...}
  className={isOpen ? styles.activeButton : ''}
  style={{ position: 'relative', zIndex: 1003 }}  /* ← Force z-index */
>
  <wcs-mat-icon icon="account_circle" />
</wcs-button>
```

### 3. Modification du slot actions dans NavigationBar

**Fichier** : `src/components/NavigationBar.js`

```javascript
<div
  slot="actions"
  style={{
    alignItems: "center",
    display: "flex",
    position: "relative",    /* ← Ajouté */
    zIndex: 1000,           /* ← Ajouté */
  }}>
  <wcs-button mode="clear" shape="round">
    <wcs-mat-icon icon="search" />
  </wcs-button>
  <UserMenu />
</div>
```

## 📊 Hiérarchie complète des z-index

```
NIVEAU 5: wcs-button (inline style)         z-index: 1003
          ↑ LE PLUS ÉLEVÉ - Toujours visible
          
NIVEAU 4: .activeButton (classe CSS)        z-index: 1003
          
NIVEAU 3: .buttonWrapper                    z-index: 1002
          
NIVEAU 2: .userMenuContainer                z-index: 1001
          
NIVEAU 1: slot="actions" (NavigationBar)    z-index: 1000
          
NIVEAU 0: .dropdown (menu)                  z-index: 999
          ↓ LE PLUS BAS
```

## 🎨 Positionnement visuel

```
NavigationBar (z-index: 1000)
  ↓
  userMenuContainer (z-index: 1001)
    ↓
    buttonWrapper (z-index: 1002)
      ↓
      wcs-button (z-index: 1003) ← TOUJOURS AU-DESSUS
        [👤] ← Visible en permanence
      
      dropdown (z-index: 999) ← EN DESSOUS
        ┌─────────────────┐
        │ Bonjour, Admin! │
        │ • Mon espace    │
        │ • Déconnexion   │
        └─────────────────┘
```

## 🧪 Tests à effectuer

### Test 1 : Visibilité du bouton
1. ✅ Ouvrir la page
2. ✅ Cliquer sur le bouton Account
3. ✅ **Vérifier** : Le bouton reste visible au-dessus du menu
4. ✅ Le bouton doit être cliquable

### Test 2 : Toggle du menu
1. ✅ Cliquer sur le bouton → Menu s'ouvre
2. ✅ Cliquer à nouveau → Menu se ferme
3. ✅ Répéter 5 fois
4. ✅ Toujours fonctionnel

### Test 3 : Clic extérieur
1. ✅ Ouvrir le menu
2. ✅ Cliquer ailleurs sur la page
3. ✅ Menu se ferme
4. ✅ Bouton reste visible

### Test 4 : Actions du menu
1. ✅ Ouvrir le menu
2. ✅ Cliquer sur "Mon espace personnel"
3. ✅ Navigation fonctionne
4. ✅ Menu se ferme

## 🔄 Comportement attendu

### État fermé
```
Navbar:  [...menus...]  [🔍]  [👤]
                              ↑
                         Bouton visible
```

### État ouvert
```
Navbar:  [...menus...]  [🔍]  [👤] ← RESTE VISIBLE !
                              ↓
                        ┌─────────────────┐
                        │ Bonjour, Admin! │
                        │ admin@email.com │
                        ├─────────────────┤
                        │ • Mon espace    │
                        │ • Déconnexion   │
                        └─────────────────┘
```

## 🐛 Si le problème persiste

Si après ces modifications le bouton disparaît encore :

### Solution alternative 1 : Ajout d'un CSS global

Créez `src/app/globals.css` et ajoutez :

```css
wcs-button[shape="round"] {
  position: relative !important;
  z-index: 1003 !important;
}

wcs-com-nav [slot="actions"] {
  position: relative !important;
  z-index: 1000 !important;
}
```

### Solution alternative 2 : Utiliser un portail React

Modifier `UserMenu.js` pour utiliser `createPortal` et afficher le menu en dehors du flux normal :

```javascript
import { createPortal } from 'react-dom';

// Dans le return :
{isOpen && user && createPortal(
  <div className={styles.dropdown} ref={menuRef}>
    {/* contenu */}
  </div>,
  document.body
)}
```

## 📝 Fichiers modifiés

1. ✅ `src/components/UserMenu.module.css`
   - z-index sur container, wrapper, button, dropdown
   - pointer-events: auto
   - position: relative

2. ✅ `src/components/UserMenu.js`
   - style inline sur wcs-button

3. ✅ `src/components/NavigationBar.js`
   - position et z-index sur slot actions

## 🚀 Commandes de test

```bash
# Redémarrer le serveur
npm run dev
```

Puis testez dans le navigateur :
1. Ouvrez les DevTools (F12)
2. Inspectez le bouton Account quand le menu est ouvert
3. Vérifiez le z-index calculé
4. Vérifiez que le bouton a `z-index: 1003`

## 💡 Pourquoi ces modifications ?

### pointer-events: auto
Force le bouton à rester interactif même si des éléments le recouvrent théoriquement.

### z-index multiples
Crée une hiérarchie claire où chaque niveau sait exactement où il se situe.

### style inline
Les web components SNCF peuvent avoir leurs propres styles. Le style inline a la priorité la plus élevée.

### position: relative
Nécessaire pour que z-index fonctionne (z-index ne fonctionne que sur les éléments positionnés).

## ✨ Résultat attendu

Après ces modifications :
- ✅ Le bouton Account reste **toujours visible**
- ✅ Le bouton est **toujours cliquable**
- ✅ Le toggle fonctionne parfaitement
- ✅ Le menu s'affiche **en dessous** du bouton
- ✅ Aucun conflit visuel

---

**Date de résolution** : 27 novembre 2025

Si le problème persiste après ces modifications, veuillez fournir :
1. Une nouvelle capture d'écran
2. Les logs de la console DevTools
3. Le z-index calculé du bouton (visible dans l'inspecteur)

