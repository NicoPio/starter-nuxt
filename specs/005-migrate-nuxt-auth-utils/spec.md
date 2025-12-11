# Feature Specification: Migration vers nuxt-auth-utils

**Feature Branch**: `005-migrate-nuxt-auth-utils`
**Created**: 2025-12-10
**Status**: Draft
**Input**: User description: "i want to remove betterauth and migrate to nuxt-auth-utils. clean or delete or migrate the tables to the new auth module"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Existing Users Can Continue Authenticating (Priority: P1)

Les utilisateurs existants doivent pouvoir continuer à se connecter avec leurs identifiants actuels sans interruption de service. Leurs sessions actives doivent être préservées ou gracieusement migrées.

**Why this priority**: Cette fonctionnalité est critique car elle garantit la continuité du service. Sans elle, tous les utilisateurs existants seraient déconnectés et pourraient perdre l'accès à leurs comptes.

**Independent Test**: Peut être testé en vérifiant qu'un utilisateur créé avant la migration peut se connecter avec succès après la migration et accéder à son profil avec toutes ses données intactes.

**Acceptance Scenarios**:

1. **Given** un utilisateur existant avec un compte email/password, **When** il soumet ses identifiants valides, **Then** il est authentifié avec succès et redirigé vers son tableau de bord
2. **Given** un utilisateur avec un compte OAuth (GitHub/Google/Apple), **When** il initie le flux OAuth, **Then** il est authentifié avec succès en utilisant son compte externe existant
3. **Given** un utilisateur avec une session active, **When** la migration est effectuée, **Then** sa session reste valide ou il est invité à se reconnecter une seule fois
4. **Given** un utilisateur existant, **When** il accède à son profil après migration, **Then** toutes ses données (nom, email, rôle, abonnement) sont présentes et correctes

---

### User Story 2 - New Users Can Create Accounts (Priority: P1)

Les nouveaux utilisateurs doivent pouvoir créer des comptes en utilisant les mêmes méthodes d'authentification qu'auparavant (email/password et OAuth).

**Why this priority**: Essentiel pour la croissance de l'application. Sans inscription fonctionnelle, aucun nouveau client ne peut rejoindre la plateforme.

**Independent Test**: Créer un nouveau compte avec email/password, se déconnecter, puis se reconnecter pour vérifier la persistance.

**Acceptance Scenarios**:

1. **Given** un nouveau visiteur, **When** il soumet le formulaire d'inscription avec email et mot de passe valide, **Then** son compte est créé et il est connecté automatiquement
2. **Given** un nouveau visiteur, **When** il choisit "Sign in with GitHub/Google/Apple", **Then** il est redirigé vers le provider OAuth et son compte est créé après autorisation
3. **Given** un nouveau compte créé, **When** l'utilisateur se déconnecte puis se reconnecte, **Then** l'authentification fonctionne avec les mêmes identifiants

---

### User Story 3 - Administrators Can Manage User Access (Priority: P2)

Les administrateurs doivent pouvoir continuer à gérer les rôles utilisateurs et supprimer des comptes via l'interface admin existante.

**Why this priority**: Fonctionnalité importante pour la gouvernance mais non bloquante pour l'utilisation normale de l'application.

**Independent Test**: Un admin peut changer le rôle d'un utilisateur de "User" à "Contributor" et vérifier que les permissions de cet utilisateur changent en conséquence.

**Acceptance Scenarios**:

1. **Given** un administrateur connecté, **When** il accède à la page de gestion des utilisateurs, **Then** il voit la liste complète des utilisateurs avec leurs rôles actuels
2. **Given** un administrateur, **When** il modifie le rôle d'un utilisateur, **Then** le changement est persisté et l'utilisateur cible voit ses permissions mises à jour
3. **Given** un administrateur, **When** il supprime un utilisateur, **Then** le compte est supprimé et l'utilisateur ne peut plus se connecter

---

### User Story 4 - Subscription Status is Preserved (Priority: P2)

Les utilisateurs avec des abonnements Stripe actifs doivent conserver leur statut d'abonnement et leurs permissions associées après la migration.

**Why this priority**: Important pour les revenus et la confiance des clients payants, mais moins critique que l'authentification de base.

**Independent Test**: Vérifier qu'un utilisateur avec un abonnement actif avant migration peut toujours accéder aux fonctionnalités premium après migration.

**Acceptance Scenarios**:

1. **Given** un utilisateur avec un abonnement actif, **When** il se connecte après migration, **Then** son statut d'abonnement est visible et correct
2. **Given** un utilisateur abonné, **When** il accède à une fonctionnalité premium, **Then** l'accès est autorisé
3. **Given** un webhook Stripe reçu après migration, **When** le statut d'abonnement change, **Then** les données utilisateur sont mises à jour correctement

---

### User Story 5 - Database Cleanup is Complete (Priority: P3)

Le système ne doit plus contenir de tables, colonnes ou données obsolètes liées à Better Auth après la migration.

**Why this priority**: Maintenance et propreté du code, mais n'affecte pas directement l'expérience utilisateur.

**Independent Test**: Inspecter le schéma de base de données et vérifier qu'aucune table Better Auth (`session`, `account`, `verification`) n'existe.

**Acceptance Scenarios**:

1. **Given** la migration terminée, **When** on inspecte le schéma de base de données, **Then** aucune table Better Auth n'est présente
2. **Given** la migration terminée, **When** on recherche les références à Better Auth dans le code, **Then** aucune référence n'est trouvée (sauf dans l'historique git)
3. **Given** la migration terminée, **When** on vérifie les dépendances npm, **Then** le package `better-auth` n'est plus listé

---

### Edge Cases

- Que se passe-t-il si un utilisateur tente de se connecter pendant la migration ?
- Comment gérer les sessions actives qui deviennent invalides après migration ?
- Que faire avec les tokens de vérification email en attente dans les anciennes tables ?
- Comment traiter les utilisateurs avec plusieurs comptes OAuth liés au même email ?
- Que se passe-t-il si la migration échoue à mi-chemin (rollback) ?
- Comment préserver les dates de création de compte pour les statistiques ?
- Que faire avec les invitations utilisateur en attente ?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Le système DOIT migrer tous les utilisateurs existants de Better Auth vers nuxt-auth-utils sans perte de données
- **FR-002**: Le système DOIT préserver les identifiants de connexion existants (email/password hash)
- **FR-003**: Le système DOIT maintenir les associations OAuth existantes (GitHub, Google, Apple)
- **FR-004**: Le système DOIT conserver les rôles utilisateurs (User, Contributor, Admin) après migration
- **FR-005**: Le système DOIT préserver les liens entre utilisateurs et abonnements Stripe
- **FR-006**: Le système DOIT supprimer les tables obsolètes de Better Auth après vérification de la migration
- **FR-007**: Le système DOIT gérer les sessions actives pendant la transition (invalidation gracieuse ou migration)
- **FR-008**: Les utilisateurs DOIVENT pouvoir se connecter avec les mêmes méthodes qu'avant (email/password, OAuth)
- **FR-009**: Les administrateurs DOIVENT pouvoir continuer à gérer les utilisateurs via l'interface existante
- **FR-010**: Le système DOIT maintenir la compatibilité avec les webhooks Stripe existants
- **FR-011**: Le système DOIT créer un backup de toutes les données d'authentification avant migration
- **FR-012**: Le système DOIT valider l'intégrité des données migrées avant suppression des anciennes tables

### Key Entities

- **User**: Représente un utilisateur du système avec attributs essentiels (id, email, nom, rôle, dates de création/mise à jour)
- **OAuth Account**: Représente une connexion OAuth externe (provider, providerId, association avec User)
- **Session**: Représente une session d'authentification active (token, expiration, association avec User)
- **Subscription**: Représente un abonnement Stripe (statut, plan, association avec User)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% des utilisateurs existants peuvent se connecter avec succès après migration sans réinitialisation de mot de passe
- **SC-002**: Aucune perte de données utilisateur (email, nom, rôle, dates) après migration
- **SC-003**: Les sessions utilisateur sont maintenues ou l'interruption est inférieure à 5 minutes
- **SC-004**: Aucune table ou dépendance Better Auth ne subsiste dans le projet après migration
- **SC-005**: Le temps de migration est inférieur à 30 minutes pour 10,000 utilisateurs
- **SC-006**: Les nouveaux utilisateurs peuvent créer des comptes immédiatement après migration
- **SC-007**: Les webhooks Stripe continuent de fonctionner sans modification après migration
- **SC-008**: Aucune augmentation des erreurs d'authentification (taux d'erreur < 0.1%)
