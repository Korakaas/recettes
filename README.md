# Nos recettes

Carnet de recettes à deux, sur téléphone : retrouver ce qu'on a déjà cuisiné, avoir des idées chaque semaine, importer depuis un lien, une photo ou un texte, cuisiner avec minuteurs. Application web installable (PWA), synchronisée par Firebase.

## Mise en route (une seule fois)

1. **GitHub Pages** : dépôt → Settings → Pages → Source : **GitHub Actions**. Le site se publie à chaque push sur `main`.
2. **Firebase** (projet `recettes-e5e55`) :
   - Authentication → Sign-in method : activer **Google**.
   - Authentication → Settings → Authorized domains : ajouter **`korakaas.github.io`**.
   - Firestore Database : créer la base si ce n'est pas fait.
   - Firestore → Rules : coller le contenu de `firestore.rules` en remplaçant `EMAIL_1` et `EMAIL_2` par vos deux adresses Google, puis Publier.
3. **Sur le téléphone** (Chrome Android) : ouvrir `https://korakaas.github.io/recettes/` → menu ⋮ → *Installer l'application*.
4. **Clé Claude** : Réglages → coller la clé API (ou *Reprendre la clé de nikki-app*). Elle reste sur l'appareil.

Le mode démo (`?demo`) fonctionne sans compte, avec des données d'exemple stockées localement.

## Développement

```
npm install
npm run dev      # http://localhost:5173/?demo
npm run build
```

Vite + React + TypeScript, Firebase (Auth Google + Firestore avec cache hors ligne), API Claude appelée depuis le navigateur pour l'import et le classement.
