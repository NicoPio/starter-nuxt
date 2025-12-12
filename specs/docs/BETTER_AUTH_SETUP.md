# Guide de Configuration Better-Auth

Ce projet utilise Better-Auth comme gestionnaire d'authentification avec PostgreSQL (Supabase).

## ✅ Configuration Actuelle

- ✅ Better-Auth installé et configuré
- ✅ Connexion à PostgreSQL via `pg`
- ✅ Tables Better-Auth migrées dans la base de données
- ✅ Support email/password activé
- ✅ Support GitHub, Google, Apple (optionnel)
- ✅ Client Vue configuré avec composables réactifs

## 📋 Prérequis

1. **Base de données PostgreSQL**
   - Supabase local ou distant
   - Connection string dans `.env`

2. **Variables d'environnement**
   ```env
   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
   BETTER_AUTH_SECRET=your_secret_key
   BETTER_AUTH_URL=http://localhost:3000
   ```

## 🚀 Démarrage Rapide

### 1. Installer les dépendances
```bash
npm install
```

### 2. Configurer la base de données
La migration Better-Auth a déjà été exécutée. Les tables suivantes ont été créées :
- `user` - Utilisateurs
- `session` - Sessions d'authentification
- `account` - Comptes liés (OAuth)
- `verification` - Tokens de vérification

### 3. Lancer le serveur
```bash
npm run dev
```

## 🔐 Providers Sociaux (Optionnel)

Pour activer les providers sociaux, ajoutez les variables d'environnement :

### GitHub
```env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

1. Créer une OAuth App sur GitHub : https://github.com/settings/developers
2. Authorization callback URL : `http://localhost:3000/api/auth/callback/github`

### Google
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

1. Créer un projet sur Google Cloud Console
2. Activer Google+ API
3. Créer des identifiants OAuth 2.0
4. Authorized redirect URI : `http://localhost:3000/api/auth/callback/google`

### Apple
```env
APPLE_CLIENT_ID=your_apple_client_id
APPLE_CLIENT_SECRET=your_apple_client_secret
```

1. Créer un Service ID sur Apple Developer
2. Configurer Sign in with Apple
3. Return URLs : `http://localhost:3000/api/auth/callback/apple`

## 📝 Utilisation dans le Code

### Dans les composants Vue

```vue
<script setup lang="ts">
import { authClient } from "~/lib/auth-client";

const session = authClient.useSession();
const user = computed(() => session.data?.user);
</script>

<template>
  <div v-if="session.data">
    <p>Bonjour {{ user?.name }}!</p>
    <button @click="authClient.signOut()">Se déconnecter</button>
  </div>
  <div v-else>
    <button @click="authClient.signIn.social({ provider: 'github' })">
      Se connecter avec GitHub
    </button>
  </div>
</template>
```

### Dans les composables

```ts
const { user, isAuthenticated, signup, login, logout } = useAuth();

// Inscription
await signup('user@example.com', 'password123', 'John Doe');

// Connexion
await login('user@example.com', 'password123');

// Déconnexion
await logout();
```

### API côté serveur

```ts
import { auth } from "~/app/utils/auth";

// Dans une route API
export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({
    headers: getHeaders(event),
  });

  if (!session) {
    throw createError({
      statusCode: 401,
      message: 'Non authentifié',
    });
  }

  return {
    user: session.user,
  };
});
```

## 🔧 Configuration Avancée

### Personnaliser Better-Auth

Éditez `app/utils/auth.ts` pour ajouter des plugins ou options :

```ts
import { betterAuth } from "better-auth";
import { Pool } from "pg";

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  // Ajouter d'autres plugins ici
  // plugins: [twoFactor(), ...],
});
```

## 📚 Ressources

- [Documentation Better-Auth](https://better-auth.com/docs)
- [Guide d'intégration Nuxt](https://better-auth.com/docs/integrations/nuxt)
- [Plugins disponibles](https://better-auth.com/docs/plugins)

## 🐛 Dépannage

### Erreur de connexion à la base de données
Vérifiez que :
- PostgreSQL est démarré
- `DATABASE_URL` est correcte dans `.env`
- Les tables ont été migrées : `npx @better-auth/cli migrate`

### Session non persistée
Assurez-vous que :
- `BETTER_AUTH_SECRET` est défini
- Les cookies ne sont pas bloqués par votre navigateur
- Le domaine correspond à `BETTER_AUTH_URL`

### Providers sociaux ne fonctionnent pas
Vérifiez :
- Les callback URLs sont correctes dans les dashboards des providers
- Les variables d'environnement sont définies
- Les scopes nécessaires sont autorisés
