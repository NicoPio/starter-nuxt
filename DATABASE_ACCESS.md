# Guide d'Accès à la Base de Données PostgreSQL

## 🎯 Accès Rapide

### Interface Graphique (Recommandé pour débuter)

#### Supabase Studio (Inclus)
```
URL: http://127.0.0.1:54323
```

Supabase Studio offre :
- Vue des tables et données
- Éditeur SQL
- Gestion des utilisateurs
- Logs en temps réel
- Gestion des migrations

### Clients PostgreSQL Tiers

#### TablePlus (Recommandé pour MacOS)
```bash
brew install --cask tableplus
```

**Configuration de connexion :**
```
Host:     127.0.0.1
Port:     54322
User:     postgres
Password: postgres
Database: postgres
```

#### DBeaver (Gratuit, Multiplateforme)
```bash
brew install --cask dbeaver-community
```

#### Postico (MacOS)
```bash
brew install --cask postico
```

#### pgAdmin (Interface web complète)
```bash
brew install --cask pgadmin4
```

## 📊 Tables de la Base de Données

### Tables Supabase (Originales)

#### `profiles`
Profils utilisateurs étendus
```sql
SELECT * FROM profiles;
```

Colonnes :
- `id` (UUID) - Clé primaire
- `email` (TEXT)
- `role` (TEXT) - 'Admin', 'Contributor', 'User'
- `full_name` (TEXT)
- `avatar_url` (TEXT)
- `created_at`, `updated_at` (TIMESTAMP)

#### `subscriptions`
Abonnements utilisateurs (Stripe)
```sql
SELECT * FROM subscriptions;
```

#### `payment_config`
Configuration des paiements
```sql
SELECT * FROM payment_config;
```

### Tables Better-Auth (Nouvelles)

#### `user`
Utilisateurs Better-Auth
```sql
SELECT * FROM "user";
```

Colonnes :
- `id` (TEXT) - Clé primaire
- `name` (TEXT)
- `email` (TEXT) - UNIQUE
- `emailVerified` (BOOLEAN)
- `image` (TEXT)
- `createdAt`, `updatedAt` (TIMESTAMP)

#### `session`
Sessions d'authentification
```sql
SELECT * FROM session;
```

#### `account`
Comptes OAuth (GitHub, Google, Apple)
```sql
SELECT * FROM account;
```

#### `verification`
Tokens de vérification email
```sql
SELECT * FROM verification;
```

## 🔧 Ligne de Commande (psql)

### Connexion
```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

### Commandes Utiles

```sql
-- Liste toutes les tables
\dt

-- Décrit la structure d'une table
\d "user"
\d profiles

-- Liste toutes les bases de données
\l

-- Quitter psql
\q
```

### Requêtes Exemples

```sql
-- Compter les utilisateurs
SELECT COUNT(*) FROM "user";

-- Voir les 10 derniers utilisateurs
SELECT * FROM "user"
ORDER BY "createdAt" DESC
LIMIT 10;

-- Joindre user et profiles
SELECT
  u.email,
  u.name,
  p.role,
  p.full_name
FROM "user" u
LEFT JOIN profiles p ON u.id::uuid = p.id;

-- Sessions actives
SELECT
  s.*,
  u.email
FROM session s
JOIN "user" u ON s."userId" = u.id
WHERE s."expiresAt" > NOW();
```

## 🐘 Via Code (Node.js/TypeScript)

### Connexion directe avec pg

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
  // ou
  // host: '127.0.0.1',
  // port: 54322,
  // user: 'postgres',
  // password: 'postgres',
  // database: 'postgres',
});

// Exemple de requête
async function getUsers() {
  const result = await pool.query('SELECT * FROM "user"');
  return result.rows;
}

// N'oubliez pas de fermer la connexion
await pool.end();
```

### Via Better-Auth API

```typescript
import { auth } from "~/app/utils/auth";

// Utiliser l'API Better-Auth
const users = await auth.api.listUsers();
```

## 🚀 Commandes Supabase CLI

### Gestion de la base

```bash
# Statut de Supabase local
supabase status

# Démarrer
supabase start

# Arrêter
supabase stop

# Restart
supabase stop && supabase start
```

### Migrations

```bash
# Créer une nouvelle migration
supabase migration new add_custom_field

# Appliquer les migrations
supabase db push

# Réinitialiser la DB (⚠️ Efface tout)
supabase db reset

# Générer les types TypeScript
supabase gen types typescript --local > app/types/database.types.ts
```

### Backup & Restore

```bash
# Dump de la base
pg_dump postgresql://postgres:postgres@127.0.0.1:54322/postgres > backup.sql

# Restaurer depuis un dump
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres < backup.sql
```

## 📝 Logs et Debugging

### Voir les logs PostgreSQL

```bash
# Via Supabase
supabase logs db

# Fichiers de logs (macOS avec Homebrew)
tail -f ~/Library/Application\ Support/Supabase/logs/postgres.log
```

### Activer les logs de requêtes

Dans `supabase/config.toml` :
```toml
[db]
# ...autres configs...
# Ajouter pour logger toutes les requêtes
extra_search_path = ["public", "extensions"]
```

## 🔒 Sécurité

### Environnement de Production

⚠️ **Important :** Les identifiants ci-dessus sont pour le développement local uniquement.

Pour la production :
1. Changez les mots de passe
2. Utilisez des variables d'environnement sécurisées
3. Activez SSL/TLS
4. Configurez les règles RLS (Row Level Security)
5. Limitez les accès réseau

### Variables d'Environnement

```env
# Development (local)
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Production (exemple)
DATABASE_URL=postgresql://user:password@your-db-host.com:5432/production_db?sslmode=require
```

## 📚 Ressources Utiles

- [Supabase Local Development](https://supabase.com/docs/guides/local-development)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Better-Auth Database Schema](https://better-auth.com/docs/concepts/database)
- [psql Cheat Sheet](https://postgrescheatsheet.com/)

## 🆘 Dépannage

### Port déjà utilisé
```bash
# Trouver le processus sur le port 54322
lsof -i :54322

# Tuer le processus
kill -9 <PID>

# Ou changer le port dans supabase/config.toml
```

### Connexion refusée
```bash
# Vérifier que Supabase est démarré
supabase status

# Redémarrer si nécessaire
supabase stop && supabase start
```

### Tables Better-Auth manquantes
```bash
# Réexécuter la migration Better-Auth
npx @better-auth/cli migrate
```
