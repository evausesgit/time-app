# 🔥 Configuration Firebase pour Time Progress App

Ce guide vous explique comment configurer Firebase pour permettre à chaque utilisateur d'avoir son propre compte et ses propres données.

## 📋 Étapes de configuration

### 1. Créer un projet Firebase (GRATUIT)

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Cliquez sur **"Ajouter un projet"**
3. Nom du projet : `time-progress-app` (ou votre choix)
4. Désactivez Google Analytics (optionnel)
5. Cliquez sur **"Créer le projet"**

### 2. Activer l'authentification

1. Dans votre projet Firebase, allez dans **"Authentication"** (menu de gauche)
2. Cliquez sur **"Commencer"**
3. Activez les méthodes de connexion :
   - **Email/Password** : Activez l'option
   - **Google** : Activez l'option (optionnel mais recommandé)
4. Cliquez sur **"Enregistrer"**

### 3. Activer Firestore Database

1. Dans le menu de gauche, allez dans **"Firestore Database"**
2. Cliquez sur **"Créer une base de données"**
3. Choisissez **"Mode production"** (nous allons configurer les règles ensuite)
4. Sélectionnez un emplacement proche de vous (ex: `europe-west1` pour l'Europe)
5. Cliquez sur **"Activer"**

### 4. Configurer les règles de sécurité Firestore

1. Dans **Firestore Database**, allez dans l'onglet **"Règles"**
2. Remplacez les règles par ceci :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Règle pour la collection 'timers'
    match /timers/{timerId} {
      // Les utilisateurs connectés peuvent uniquement lire/écrire leurs propres données
      allow read, write: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}
```

3. Cliquez sur **"Publier"**

### 5. Obtenir les credentials Firebase

1. Dans **Project Settings** (⚙️ en haut à gauche → Paramètres du projet)
2. Descendez jusqu'à **"Vos applications"**
3. Cliquez sur l'icône **Web** `</>`
4. Nom de l'app : `time-progress-web`
5. **NE PAS** cocher "Configurer Firebase Hosting" pour l'instant
6. Cliquez sur **"Enregistrer l'application"**
7. Copiez la configuration qui apparaît (elle ressemble à ça) :

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "time-progress-app.firebaseapp.com",
  projectId: "time-progress-app",
  storageBucket: "time-progress-app.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:XXXXXXXXXXXXXXXXXX"
};
```

### 6. Configurer votre application

1. Ouvrez le fichier `firebase-config.js`
2. Remplacez les valeurs par celles que vous avez copiées :

```javascript
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",           // ← Collez votre valeur ici
  authDomain: "VOTRE_PROJECT_ID.firebaseapp.com",
  projectId: "VOTRE_PROJECT_ID",
  storageBucket: "VOTRE_PROJECT_ID.appspot.com",
  messagingSenderId: "VOTRE_SENDER_ID",
  appId: "VOTRE_APP_ID"
};
```

3. Renommez `app-firestore.js` en `app.js` (remplacez l'ancien) :
```bash
mv app.js app-localstorage.js
mv app-firestore.js app.js
```

### 7. Tester localement

1. Lancez votre serveur local :
```bash
python3 -m http.server 8000
```

2. Ouvrez http://localhost:8000
3. Vous devriez être redirigé vers `auth.html`
4. Créez un compte et testez !

## 🚀 Déploiement (optionnel)

### Option A : GitHub Pages

1. Dans votre repository GitHub, allez dans **Settings** → **Pages**
2. Source : **Deploy from a branch**
3. Branch : **master** (ou main), folder : **/ (root)**
4. Cliquez sur **Save**
5. Votre app sera disponible à : `https://votre-username.github.io/time-app/`

**IMPORTANT** : Ajoutez ce domaine dans Firebase Authentication :
- Firebase Console → Authentication → Settings → Authorized domains
- Ajoutez : `votre-username.github.io`

### Option B : Firebase Hosting

```bash
# Installer Firebase CLI
npm install -g firebase-tools

# Se connecter
firebase login

# Initialiser Firebase Hosting
firebase init hosting

# Déployer
firebase deploy --only hosting
```

## ✅ Vérification

Une fois configuré, vous devriez pouvoir :
- ✅ Créer un compte avec email/password
- ✅ Se connecter avec Google
- ✅ Ajouter des périodes de temps
- ✅ Les retrouver après déconnexion/reconnexion
- ✅ Chaque utilisateur voit uniquement ses propres données

## 🆘 Problèmes courants

### "Firebase not configured"
→ Vérifiez que vous avez bien copié les credentials dans `firebase-config.js`

### "Permission denied"
→ Vérifiez les règles Firestore (étape 4)

### "Auth domain not authorized"
→ Ajoutez votre domaine dans Firebase Authentication → Authorized domains

## 📚 Ressources

- [Documentation Firebase](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
