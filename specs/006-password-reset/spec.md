# Feature Specification: Réinitialisation de Mot de Passe

**Feature Branch**: `006-password-reset`
**Created**: 2025-12-12
**Status**: Draft
**Input**: User description: "j'aimerai implémenter un parcours de "mot de passe oublié" pour permettre aux utilisateurs de réinitialiser leur mot de passe. quand l'utilisateur clique sur "mot de passe oublié", on lui demande de saisir son email. si l'email est présent dans la bdd, on lui envoit un email avec un lien qui va le rediriger vers une page dans laquelle il va pouvoir saisir un nouveau mot de passe. ne pas oublier les validations, le toast etc."

## User Scenarios & Testing

### User Story 1 - Demande de Réinitialisation (Priority: P1)

Un utilisateur qui a oublié son mot de passe peut demander un lien de réinitialisation en fournissant son adresse email. Le système envoie un email contenant un lien sécurisé pour créer un nouveau mot de passe.

**Why this priority**: C'est le flux principal qui permet aux utilisateurs de récupérer l'accès à leur compte. Sans cette fonctionnalité de base, un utilisateur qui oublie son mot de passe est bloqué définitivement.

**Independent Test**: Peut être testé en soumettant un email valide sur la page "mot de passe oublié" et en vérifiant que l'email contenant le lien de réinitialisation est envoyé.

**Acceptance Scenarios**:

1. **Given** un utilisateur sur la page de connexion, **When** l'utilisateur clique sur "Mot de passe oublié", **Then** il est redirigé vers la page de demande de réinitialisation
2. **Given** un utilisateur sur la page de demande de réinitialisation, **When** il saisit un email enregistré dans le système, **Then** un email avec un lien de réinitialisation est envoyé à cette adresse
3. **Given** un utilisateur ayant soumis un email valide, **When** la demande est traitée, **Then** un message de confirmation s'affiche indiquant qu'un email a été envoyé (sans révéler si l'email existe ou non dans le système)

---

### User Story 2 - Création du Nouveau Mot de Passe (Priority: P1)

Un utilisateur qui a reçu un lien de réinitialisation peut cliquer dessus pour accéder à un formulaire sécurisé où il peut définir un nouveau mot de passe. Le lien doit être valide et non expiré.

**Why this priority**: Cette fonctionnalité complète le processus de réinitialisation. Sans elle, la Story 1 n'a aucune valeur.

**Independent Test**: Peut être testé en accédant à un lien de réinitialisation valide, en saisissant un nouveau mot de passe conforme aux règles de sécurité, et en vérifiant que l'utilisateur peut se connecter avec ce nouveau mot de passe.

**Acceptance Scenarios**:

1. **Given** un utilisateur clique sur un lien de réinitialisation valide, **When** la page se charge, **Then** un formulaire de création de nouveau mot de passe s'affiche
2. **Given** un utilisateur sur la page de réinitialisation, **When** il saisit un nouveau mot de passe valide (minimum 8 caractères) et le confirme correctement, **Then** le mot de passe est mis à jour dans le système
3. **Given** un utilisateur ayant réinitialisé son mot de passe avec succès, **When** la mise à jour est confirmée, **Then** il est redirigé vers la page de connexion avec un message de succès
4. **Given** un utilisateur connecté avec son nouveau mot de passe, **When** il se connecte, **Then** l'authentification réussit

---

### User Story 3 - Gestion des Erreurs et Validations (Priority: P2)

Le système valide toutes les entrées utilisateur et gère élégamment les cas d'erreur (email invalide, lien expiré, mot de passe faible, etc.) avec des messages clairs et des notifications visuelles.

**Why this priority**: Améliore l'expérience utilisateur et la sécurité en guidant l'utilisateur et en prévenant les erreurs courantes. Peut être implémenté après les flux principaux.

**Independent Test**: Peut être testé en soumettant des données invalides à chaque étape et en vérifiant que les messages d'erreur appropriés s'affichent.

**Acceptance Scenarios**:

1. **Given** un utilisateur saisit un email invalide (format incorrect), **When** il soumet le formulaire, **Then** un message d'erreur s'affiche indiquant que le format d'email est invalide
2. **Given** un utilisateur clique sur un lien de réinitialisation expiré, **When** la page se charge, **Then** un message d'erreur s'affiche indiquant que le lien n'est plus valide
3. **Given** un utilisateur saisit un nouveau mot de passe trop court (moins de 8 caractères), **When** il soumet le formulaire, **Then** un message d'erreur indique les exigences du mot de passe
4. **Given** un utilisateur saisit deux mots de passe qui ne correspondent pas, **When** il soumet le formulaire, **Then** un message d'erreur indique que les mots de passe doivent être identiques
5. **Given** une erreur ou un succès survient lors de n'importe quelle action, **When** l'opération se termine, **Then** une notification toast s'affiche avec un message approprié

---

### Edge Cases

- Que se passe-t-il si un utilisateur demande plusieurs réinitialisations successives ? Tous les anciens liens de réinitialisation sont automatiquement invalidés dès qu'une nouvelle demande est créée. Seul le lien le plus récent reste actif.
- Que se passe-t-il si un utilisateur saisit un email qui n'existe pas dans la base de données ? (Le système doit afficher le même message de confirmation pour éviter l'énumération des emails)
- Que se passe-t-il si un utilisateur tente de réutiliser un lien de réinitialisation déjà utilisé ?
- Que se passe-t-il si le lien de réinitialisation est malformé ou manipulé ?
- Que se passe-t-il si l'envoi de l'email échoue (service email indisponible) ?

## Requirements

### Functional Requirements

- **FR-001**: Le système DOIT afficher un lien "Mot de passe oublié" sur la page de connexion
- **FR-002**: Le système DOIT fournir une page dédiée avec un formulaire de demande de réinitialisation contenant un champ email
- **FR-003**: Le système DOIT valider le format de l'adresse email saisie avant traitement
- **FR-004**: Le système DOIT générer un token de réinitialisation unique et sécurisé pour chaque demande
- **FR-005**: Le système DOIT envoyer un email contenant un lien de réinitialisation avec le token à l'adresse fournie (si elle existe dans le système)
- **FR-006**: Le système DOIT afficher le même message de confirmation que l'email existe ou non (pour éviter l'énumération des comptes)
- **FR-007**: Les liens de réinitialisation DOIVENT expirer après 1 heure
- **FR-007b**: Le système DOIT invalider automatiquement tous les anciens tokens de réinitialisation d'un utilisateur lorsqu'une nouvelle demande est créée
- **FR-008**: Le système DOIT fournir une page de réinitialisation accessible via le lien avec token
- **FR-009**: Le système DOIT valider le token de réinitialisation (existence, validité, non-expiration, non-utilisation)
- **FR-010**: Le système DOIT afficher un formulaire avec deux champs : "Nouveau mot de passe" et "Confirmer mot de passe"
- **FR-011**: Le système DOIT valider que le nouveau mot de passe respecte les règles de sécurité (minimum 8 caractères)
- **FR-012**: Le système DOIT vérifier que les deux mots de passe saisis sont identiques
- **FR-013**: Le système DOIT hacher le nouveau mot de passe de manière sécurisée avant de le stocker (en utilisant l'algorithme de hachage actuellement en place dans le système)
- **FR-014**: Le système DOIT invalider le token de réinitialisation après utilisation réussie
- **FR-015**: Le système DOIT afficher des messages d'erreur clairs pour chaque type de validation échouée
- **FR-016**: Le système DOIT afficher des notifications toast pour les succès et les erreurs
- **FR-017**: Le système DOIT rediriger l'utilisateur vers la page de connexion après une réinitialisation réussie
- **FR-018**: Le système DOIT désactiver les boutons de soumission pendant le traitement pour éviter les doubles soumissions

### Key Entities

- **Reset Token**: Représente une demande de réinitialisation de mot de passe. Attributs : token unique, identifiant utilisateur, date de création, date d'expiration, statut (utilisé/non utilisé)
- **User**: Entité existante. La réinitialisation modifie l'attribut mot de passe (hashé)

## Success Criteria

### Measurable Outcomes

- **SC-001**: Un utilisateur peut compléter le processus de réinitialisation de mot de passe (de la demande à la connexion avec le nouveau mot de passe) en moins de 5 minutes
- **SC-002**: Le taux de réussite des réinitialisations de mot de passe (tentatives abouties) est supérieur à 95%
- **SC-003**: Aucun token de réinitialisation expiré ou utilisé ne peut être réutilisé
- **SC-004**: 100% des erreurs de validation affichent un message clair et compréhensible
- **SC-005**: Les nouveaux mots de passe respectent les mêmes règles de sécurité que lors de l'inscription (minimum 8 caractères, hachage sécurisé)
- **SC-006**: Le système ne révèle jamais si une adresse email existe ou non dans la base de données (protection contre l'énumération)

## Dependencies & Assumptions

### Dependencies

- **Service d'envoi d'emails** : Le système dépend d'un service d'envoi d'emails fonctionnel pour envoyer les liens de réinitialisation
- **Base de données existante** : La table `users` avec les champs email et password existe déjà dans le système
- **Système d'authentification** : Un système d'authentification existant gère le hachage des mots de passe

### Assumptions

- Les utilisateurs ont accès à leur boîte email pour recevoir le lien de réinitialisation
- Le système d'authentification actuel utilise un algorithme de hachage sécurisé compatible avec les bonnes pratiques
- Les emails envoyés ne finissent pas systématiquement dans les spams (configuration DNS/SPF/DKIM appropriée)
- Le format d'email standard (RFC 5322) est suffisant pour la validation
- La langue de l'interface suit la configuration i18n existante du système
