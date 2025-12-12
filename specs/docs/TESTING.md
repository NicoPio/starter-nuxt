# Guide de test - SaaS Starter Foundation

Ce guide vous aide à tester l'implémentation complète de la Phase 4 (User Story 2 - Gestion des comptes utilisateurs).

## Prérequis

- Docker installé et en cours d'exécution
- Node.js 18+ installé
- Supabase CLI installé (`brew install supabase/tap/supabase`)

## Étape 1 : Démarrer Supabase localement

```bash
# Démarrer Supabase (première fois, cela peut prendre quelques minutes)
supabase start

# Une fois terminé, vous verrez les informations de connexion :
# - API URL: http://localhost:54321
# - DB URL: postgresql://postgres:postgres@localhost:54322/postgres
# - Studio URL: http://localhost:54323
# - anon key: eyJh... (clé publique)
# - service_role key: eyJh... (clé secrète)
```

## Étape 2 : Appliquer les migrations

```bash
# Appliquer toutes les migrations de base de données
supabase db push

# Vérifier que les tables ont été créées
supabase db diff
```

## Étape 3 : Configurer les variables d'environnement

Créez un fichier `.env` à la racine du projet :

```bash
# Copier l'exemple
cp .env.example .env
```

Modifiez `.env` avec les valeurs de Supabase :

```env
# Supabase (from supabase start output)
SUPABASE_URL=http://localhost:54321
SUPABASE_KEY=<votre-anon-key>
SUPABASE_SERVICE_KEY=<votre-service-role-key>

# App
NUXT_PUBLIC_SITE_URL=http://localhost:3001
```

## Étape 4 : Démarrer l'application

```bash
# Installer les dépendances (si pas déjà fait)
npm install

# Démarrer le serveur de développement
npm run dev
```

L'application devrait être accessible sur http://localhost:3000

## Étape 5 : Test du flux complet

### Test 1 : Accès public

1. Ouvrez http://localhost:3000
2. ✅ Vérifiez que la page d'accueil se charge
3. ✅ Cliquez sur "Features" et vérifiez que la page de contenu gratuit s'affiche
4. ✅ Essayez d'accéder à `/dashboard` - vous devriez être redirigé vers `/login`

### Test 2 : Inscription (Signup)

1. Allez sur http://localhost:3000/signup
2. Remplissez le formulaire :
   - **Email** : `test@example.com`
   - **Password** : `Test1234!`
   - **Nom complet** (optionnel) : `Jean Test`
3. ✅ Cliquez sur "S'inscrire"
4. ✅ Vérifiez que vous êtes redirigé vers `/dashboard`
5. ✅ Vérifiez qu'un message de succès (toast) s'affiche

### Test 3 : Vérification dans Supabase Studio

1. Ouvrez http://localhost:54323 (Supabase Studio)
2. Allez dans **Table Editor** → **profiles**
3. ✅ Vérifiez qu'un nouveau profil a été créé avec :
   - Email : `test@example.com`
   - Role : `User`
   - Full name : `Jean Test`
4. Allez dans **Table Editor** → **subscriptions**
5. ✅ Vérifiez qu'un abonnement gratuit a été automatiquement créé :
   - Plan type : `free`
   - Status : `active`

### Test 4 : Dashboard

1. Sur http://localhost:3000/dashboard
2. ✅ Vérifiez que le dashboard affiche :
   - Message de bienvenue avec votre nom
   - Votre rôle (User)
   - Actions rapides (View Profile, Manage Subscription)

### Test 5 : Déconnexion (Logout)

1. Cliquez sur le bouton "Déconnexion" dans le header
2. ✅ Vérifiez que vous êtes redirigé vers la page d'accueil
3. ✅ Vérifiez qu'un message de succès s'affiche
4. ✅ Essayez d'accéder à `/dashboard` - vous devriez être redirigé vers `/login`

### Test 6 : Connexion (Login)

1. Allez sur http://localhost:3000/login
2. Entrez vos identifiants :
   - **Email** : `test@example.com`
   - **Password** : `Test1234!`
3. ✅ Cochez "Se souvenir de moi" (optionnel)
4. ✅ Cliquez sur "Se connecter"
5. ✅ Vérifiez que vous êtes redirigé vers `/dashboard`
6. ✅ Vérifiez qu'un message de bienvenue s'affiche

### Test 7 : Gestion du profil

1. Sur le dashboard, cliquez sur "View Profile" ou allez sur http://localhost:3000/profile
2. ✅ Vérifiez que vos informations actuelles s'affichent
3. Modifiez votre profil :
   - **Nom complet** : `Jean Test Modifié`
   - **Avatar URL** : `https://i.pravatar.cc/150?img=1`
4. ✅ Cliquez sur "Enregistrer les modifications"
5. ✅ Vérifiez qu'un message de succès s'affiche
6. ✅ Vérifiez que l'aperçu de l'avatar apparaît
7. ✅ Retournez sur `/dashboard` et vérifiez que le nom et l'avatar sont mis à jour

### Test 8 : Redirection après authentification

1. Déconnectez-vous
2. Essayez d'accéder directement à http://localhost:3000/profile
3. ✅ Vous devriez être redirigé vers `/login?redirect=/profile`
4. Connectez-vous
5. ✅ Vous devriez être automatiquement redirigé vers `/profile` (l'URL d'origine)

### Test 9 : Validation des formulaires

1. Sur `/signup`, essayez de soumettre avec :
   - Email invalide : `test@` → ✅ Erreur de validation
   - Mot de passe trop court : `Test1` → ✅ Erreur de validation
2. Sur `/login`, essayez avec :
   - Mauvais mot de passe → ✅ Erreur "Email ou mot de passe invalide"

### Test 10 : Internationalisation (i18n)

1. L'application devrait détecter automatiquement votre langue (FR/EN)
2. ✅ Vérifiez que tous les textes sont traduits
3. Pour tester l'autre langue, modifiez votre préférence de langue dans le navigateur

## Vérification de la base de données

### Vérifier les triggers

```sql
-- Connectez-vous à PostgreSQL
psql postgresql://postgres:postgres@localhost:54322/postgres

-- Vérifier que le trigger existe
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Vérifier les fonctions
\df public.handle_new_user
\df public.update_updated_at_column
```

### Vérifier les policies RLS

```sql
-- Liste toutes les policies sur la table profiles
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Liste toutes les policies sur la table subscriptions
SELECT * FROM pg_policies WHERE tablename = 'subscriptions';
```

## Nettoyage et réinitialisation

### Réinitialiser la base de données

```bash
# Arrêter Supabase
supabase stop

# Réinitialiser complètement (supprime toutes les données)
supabase db reset

# Redémarrer
supabase start
```

### Supprimer un utilisateur de test

Dans Supabase Studio (http://localhost:54323) :
1. **Authentication** → **Users**
2. Sélectionnez l'utilisateur
3. Cliquez sur "Delete user"
4. Le profil et l'abonnement seront automatiquement supprimés (CASCADE)

## Dépannage

### Erreur : "Missing supabase url"

- ✅ Vérifiez que le fichier `.env` existe et contient `SUPABASE_URL`
- ✅ Redémarrez le serveur de développement (`npm run dev`)

### Erreur : "Connection refused" lors de l'inscription

- ✅ Vérifiez que Supabase est démarré : `supabase status`
- ✅ Vérifiez que l'URL dans `.env` est correcte : `http://localhost:54321`

### Les migrations ne s'appliquent pas

```bash
# Forcer l'application des migrations
supabase db reset

# Vérifier le statut
supabase migration list
```

### L'avatar ne s'affiche pas

- ✅ Vérifiez que l'URL de l'avatar est valide et accessible
- ✅ Essayez avec : `https://i.pravatar.cc/150?img=1`

## Logs et débogage

### Voir les logs Supabase

```bash
# Logs de tous les services
supabase logs

# Logs du service auth uniquement
supabase logs gotrue

# Logs de PostgreSQL
supabase logs postgres
```

### Voir les logs de l'application

Les logs s'affichent directement dans le terminal où vous avez lancé `npm run dev`

## Prochaines étapes

Une fois tous les tests validés, vous pouvez :

1. ✅ Créer un premier utilisateur admin manuellement dans Supabase Studio
2. ✅ Passer à la Phase 5 : Gestion des abonnements
3. ✅ Passer à la Phase 6 : Administration des utilisateurs

## Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs Supabase : `supabase logs`
2. Vérifiez la console du navigateur (F12)
3. Vérifiez que Docker est en cours d'exécution : `docker ps`
