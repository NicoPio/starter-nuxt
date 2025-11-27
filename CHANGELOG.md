# CHANGELOG

## [En cours] - 2025-11-27

### Ajouté
- Adaptation complète du formulaire d'inscription (SignupForm) pour utiliser Better Auth
  - Intégration de `authClient.signUp.email()` à la place de l'ancien endpoint `/api/auth/signup`
  - Ajout des boutons OAuth (GitHub, Google, Apple) avec le même design que la page de connexion
  - Champ "Nom complet" rendu obligatoire avec validation Zod
  - Support du paramètre de redirection `?redirect=` dans l'URL
  - Gestion améliorée des erreurs avec messages toast

### Modifié
- Traductions i18n:
  - `auth.validation.nameRequired` ajouté (EN: "Full name is required" / FR: "Le nom complet est requis")
  - `auth.signup.fullName` mis à jour (EN: "Full Name" / FR: "Nom complet") - suppression de "(Optional)"

### Supprimé
- **Migration Supabase 001_initial_schema.sql** - Tables personnalisées inutilisées supprimées
  - Table `profiles` - Redondante avec la table `user` de Better-Auth
  - Table `subscriptions` - Non implémentée dans l'application
  - Table `payment_config` - Configuration Stripe gérée via variables d'environnement
- Nettoyage des types et schémas:
  - Types TypeScript `Database.profiles` et `Database.subscriptions` supprimés de `app/types/database.types.ts`
  - Schémas Zod `ProfileSchema`, `SubscriptionSchema`, `StripeConfigSchema` supprimés de `server/utils/schemas.ts`
  - Schémas Zod `UserRoleSchema`, `SubscriptionStatusSchema`, `UpdateRoleSchema`, `CancelSubscriptionSchema` supprimés
  - Commentaire obsolète dans `server/api/users/me.get.ts` mis à jour

### Technique
- Conformité complète avec l'API Better Auth v1.4.2
- Structure du formulaire alignée sur LoginForm pour cohérence UX
- Validation TypeScript stricte maintenue
- Base de données PostgreSQL simplifiée - Seules les tables Better-Auth sont utilisées
