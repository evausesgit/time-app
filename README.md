# ⏱️ Time Progress App

Progressive Web App pour visualiser le temps qui passe avec des cercles de progression animés.

![Time Progress App](screenshot.png)

## ✨ Fonctionnalités

- 🔐 **Authentification utilisateur** (Email/Password + Google)
- ⭕ **Cercles de progression animés** avec point mobile
- 📅 **Date picker visuel** (Flatpickr)
- ✏️ **Édition** des périodes de temps
- 🗑️ **Suppression** des périodes
- 💾 **Sauvegarde cloud** (Firebase Firestore)
- 🔄 **Synchronisation en temps réel**
- 📱 **PWA** - Installable et fonctionne hors ligne
- 🎨 **Thème sombre moderne**

## 🚀 Démarrage rapide

### Version LocalStorage (Sans authentification)

1. Clonez le repository :
```bash
git clone https://github.com/evausesgit/time-app.git
cd time-app
```

2. Si vous voulez utiliser la version sans authentification (LocalStorage) :
```bash
# L'ancienne version est déjà dans app-localstorage.js
# Remplacez app.js par cette version
mv app.js app-firestore.js
mv app-localstorage.js app.js
```

3. Lancez un serveur local :
```bash
python3 -m http.server 8000
```

4. Ouvrez http://localhost:8000

### Version Firebase (Avec authentification)

Pour avoir des comptes utilisateurs et synchronisation cloud :

1. Suivez le guide complet dans [SETUP_FIREBASE.md](SETUP_FIREBASE.md)
2. Configurez votre projet Firebase
3. Remplacez les credentials dans `firebase-config.js`
4. Lancez le serveur

## 📖 Utilisation

1. **Créer un compte** ou se connecter
2. Cliquer sur le **bouton +** en haut à gauche
3. Remplir le formulaire :
   - Titre de la période
   - Date et heure de début
   - Date et heure de fin
   - Granularité (secondes, minutes, heures, jours)
   - Fréquence de rafraîchissement
4. Les cercles se mettent à jour automatiquement
5. Cliquer sur **✎** pour modifier une période
6. Cliquer sur **×** pour supprimer une période

## 🛠️ Technologies

- **Frontend** : HTML5, CSS3, JavaScript (Vanilla)
- **Date Picker** : Flatpickr
- **Backend** : Firebase (Authentication + Firestore)
- **PWA** : Service Worker, Web App Manifest
- **Hébergement** : GitHub Pages / Firebase Hosting

## 📁 Structure du projet

```
time-app/
├── index.html              # Page principale
├── auth.html               # Page de connexion/inscription
├── app.js                  # Logique principale (Firestore)
├── app-localstorage.js     # Version LocalStorage (sans auth)
├── app-firestore.js        # Version Firestore (backup)
├── styles.css              # Styles
├── firebase-config.js      # Configuration Firebase
├── service-worker.js       # Service Worker PWA
├── manifest.json           # Manifest PWA
├── SETUP_FIREBASE.md       # Guide configuration Firebase
└── README.md               # Ce fichier
```

## 🤝 Partage avec des collègues

### Sans authentification (LocalStorage)
Partagez simplement l'URL de votre app hébergée. Chacun aura ses données locales.

### Avec authentification (Firebase)
1. Hébergez l'app (GitHub Pages ou Firebase Hosting)
2. Partagez l'URL
3. Chaque personne crée son compte
4. Chacun a ses propres données, synchronisées sur tous ses appareils

## 🌐 Déploiement

### GitHub Pages

```bash
# Pousser sur GitHub
git add .
git commit -m "Deploy"
git push origin master

# Activer GitHub Pages dans Settings → Pages
```

URL : `https://votre-username.github.io/time-app/`

### Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## 📝 Licence

MIT License - Libre d'utilisation

## 👨‍💻 Auteur

Créé avec l'aide de [Claude Code](https://claude.com/claude-code)

## 🐛 Bugs & Suggestions

Ouvrez une [issue sur GitHub](https://github.com/evausesgit/time-app/issues)
