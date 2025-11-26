# Supabase Setup Instructions

Ce projet utilise une instance Supabase auto-hébergée pour l'authentification et la base de données.

## Démarrage rapide

### 1. Installation de Supabase en local

```bash
# Cloner Supabase
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker

# Copier le fichier d'environnement
cp .env.example .env

# Démarrer Supabase
docker-compose up -d

# Attendre que les services démarrent (30-60 secondes)
```

### 2. Accéder à Supabase Studio

- Supabase Studio: http://localhost:54323
- Supabase API: http://localhost:54321
- PostgreSQL: localhost:54322

### 3. Obtenir les clés API

1. Ouvrir Supabase Studio: http://localhost:54323
2. Aller dans Settings → API
3. Copier "anon key" → `SUPABASE_KEY` dans .env
4. Copier "service_role key" → `SUPABASE_SERVICE_KEY` dans .env

### 4. Exécuter les migrations

#### Option A: Via Supabase Studio (recommandé)

1. Aller sur http://localhost:54323
2. Ouvrir SQL Editor
3. Copier le contenu de `migrations/001_initial_schema.sql`
4. Exécuter le script SQL
5. Vérifier que les tables sont créées: profiles, subscriptions, payment_config

#### Option B: Via Supabase CLI

```bash
# Installer Supabase CLI
npm install -g supabase

# Lier au projet local
supabase link --project-ref local

# Appliquer les migrations
supabase db push
```

### 5. Créer le premier utilisateur admin

Après avoir créé un compte via /signup :

```sql
-- Dans SQL Editor de Supabase Studio
UPDATE public.profiles
SET role = 'Admin'
WHERE email = 'votre-email@example.com';
```

## Structure des migrations

- `001_initial_schema.sql` - Schéma initial avec tables profiles, subscriptions, payment_config
  - Politiques RLS (Row Level Security)
  - Triggers pour auto-création de profil et abonnement gratuit
  - Indexes pour performance

## Dépannage

### Supabase ne démarre pas

```bash
# Vérifier les logs
cd supabase/docker
docker-compose logs

# Redémarrer
docker-compose restart
```

### Erreurs de migration

```bash
# Réinitialiser la base de données
supabase db reset
```

### Problèmes de connexion

Vérifier que `.env` contient les bonnes valeurs :

```env
SUPABASE_URL=http://localhost:54321
SUPABASE_KEY=<anon-key-from-studio>
SUPABASE_SERVICE_KEY=<service-role-key-from-studio>
```

## Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [Supabase Self-Hosting](https://supabase.com/docs/guides/self-hosting)
- [Guide quickstart.md](../specs/001-saas-starter-foundation/quickstart.md)
