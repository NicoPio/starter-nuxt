# Feature Specification: Stripe Subscription Management with Simplified Admin Configuration

**Feature Branch**: `004-stripe-subscription-management`
**Created**: 2025-12-08
**Status**: Draft
**Input**: User description: "j'aimerai implémenter la partie stripe. Le panel d'administrateur propose de saisir les clés API de stripe pour configurer un environnement de paiment complet de type saas (abonnement). L'utilisateur peut alors créer son offre d'abonnement depuis l'admin et le tout est branché à stripe. ajoute une possibilité de configuration de stripe simplifiée"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Configuration initiale de Stripe (Priority: P1)

L'administrateur configure les clés API Stripe pour activer le système de paiement sur la plateforme SaaS. Cette configuration est la base fondamentale sans laquelle aucun paiement ne peut être traité.

**Why this priority**: Sans cette fonctionnalité, aucun autre aspect du système de paiement ne peut fonctionner. C'est le point d'entrée obligatoire pour tout administrateur souhaitant monétiser sa plateforme.

**Independent Test**: Peut être testé en accédant au panel d'administration, en saisissant des clés API Stripe (mode test), et en vérifiant que la connexion est établie avec succès. La valeur délivrée est un système de paiement opérationnel.

**Acceptance Scenarios**:

1. **Given** l'administrateur est connecté au panel d'administration, **When** il accède à la section "Configuration Stripe", **Then** il voit un formulaire demandant les clés API publique et secrète avec des champs clairement identifiés
2. **Given** l'administrateur saisit des clés API Stripe valides (mode test ou production), **When** il soumet le formulaire, **Then** le système valide la connexion avec Stripe et affiche un message de succès
3. **Given** l'administrateur saisit des clés API invalides, **When** il soumet le formulaire, **Then** le système affiche un message d'erreur clair indiquant que les clés sont invalides
4. **Given** les clés API ont été configurées avec succès, **When** l'administrateur revient sur la page de configuration, **Then** il voit l'état actuel de la configuration (mode test/production, date de dernière mise à jour) sans voir les clés complètes (masquées partiellement)
5. **Given** l'administrateur souhaite passer du mode test au mode production, **When** il met à jour les clés API, **Then** le système applique les nouvelles clés et indique le changement de mode

---

### User Story 2 - Création d'offres d'abonnement (Priority: P2)

L'administrateur crée et gère les offres d'abonnement (plans tarifaires) qui seront proposées aux utilisateurs de la plateforme. Il définit le nom, le prix, la périodicité et les caractéristiques de chaque offre.

**Why this priority**: Une fois Stripe configuré, cette fonctionnalité permet de définir l'offre commerciale. Sans elle, aucun abonnement ne peut être souscrit par les utilisateurs finaux.

**Independent Test**: Peut être testé en créant une nouvelle offre d'abonnement avec un nom, un prix mensuel, et en vérifiant que l'offre est correctement synchronisée avec Stripe et apparaît dans la liste des offres disponibles.

**Acceptance Scenarios**:

1. **Given** l'administrateur a configuré Stripe avec succès, **When** il accède à la section "Offres d'abonnement", **Then** il voit une liste vide ou les offres existantes avec un bouton "Créer une offre"
2. **Given** l'administrateur clique sur "Créer une offre", **When** il remplit le formulaire (nom de l'offre, description, prix, devise, périodicité), **Then** le système crée l'offre dans Stripe et l'affiche dans la liste locale
3. **Given** une offre existe déjà dans Stripe, **When** l'administrateur synchronise les offres, **Then** le système importe automatiquement les offres existantes depuis Stripe
4. **Given** l'administrateur souhaite modifier une offre, **When** il édite le nom ou la description, **Then** le système met à jour l'offre localement et dans Stripe
5. **Given** l'administrateur souhaite désactiver une offre, **When** il la désactive, **Then** l'offre n'est plus visible pour les nouveaux abonnements mais reste active pour les abonnements existants
6. **Given** l'administrateur crée une offre avec un prix de 0, **When** il soumet le formulaire, **Then** le système accepte et crée une offre gratuite

---

### User Story 3 - Souscription utilisateur à un abonnement (Priority: P1)

Un utilisateur authentifié peut parcourir les offres d'abonnement disponibles, sélectionner celle qui lui convient, et finaliser le paiement via Stripe pour activer son abonnement.

**Why this priority**: C'est le parcours utilisateur principal qui génère du revenu. Sans cette fonctionnalité, la configuration de Stripe et la création d'offres n'ont aucune valeur business.

**Independent Test**: Peut être testé en tant qu'utilisateur authentifié en sélectionnant une offre, en complétant le paiement avec une carte de test Stripe, et en vérifiant que l'abonnement est activé dans le profil utilisateur.

**Acceptance Scenarios**:

1. **Given** un utilisateur est connecté et n'a pas d'abonnement actif, **When** il accède à la page "Abonnements", **Then** il voit toutes les offres actives avec leurs prix, descriptions et fonctionnalités
2. **Given** l'utilisateur sélectionne une offre payante, **When** il clique sur "S'abonner", **Then** il est redirigé vers une page de paiement Stripe sécurisée (Checkout)
3. **Given** l'utilisateur complète le paiement avec succès, **When** Stripe confirme le paiement, **Then** le système active l'abonnement, met à jour le statut utilisateur, et redirige vers une page de confirmation
4. **Given** l'utilisateur annule le paiement sur la page Stripe, **When** il revient sur la plateforme, **Then** il est redirigé vers la page des offres avec un message indiquant que le paiement n'a pas été effectué
5. **Given** l'utilisateur a déjà un abonnement actif, **When** il accède à la page "Abonnements", **Then** il voit son abonnement actuel avec les détails (prochaine facturation, montant) et des options pour le gérer

---

### User Story 4 - Gestion d'abonnement utilisateur (Priority: P2)

Un utilisateur avec un abonnement actif peut consulter les détails de son abonnement, voir l'historique des paiements, et annuler son abonnement si souhaité.

**Why this priority**: Cette fonctionnalité améliore l'expérience utilisateur en donnant de la transparence et du contrôle sur l'abonnement. Elle réduit aussi les demandes de support.

**Independent Test**: Peut être testé en tant qu'utilisateur avec un abonnement actif en consultant les détails, en téléchargeant une facture, et en testant la procédure d'annulation.

**Acceptance Scenarios**:

1. **Given** l'utilisateur a un abonnement actif, **When** il accède à son tableau de bord, **Then** il voit un résumé de son abonnement (offre souscrite, date de renouvellement, montant)
2. **Given** l'utilisateur consulte les détails de son abonnement, **When** il clique sur "Voir l'historique", **Then** il voit la liste de toutes les factures passées avec dates et montants
3. **Given** l'utilisateur souhaite télécharger une facture, **When** il clique sur le lien de téléchargement, **Then** il reçoit le PDF de la facture générée par Stripe
4. **Given** l'utilisateur souhaite annuler son abonnement, **When** il clique sur "Annuler l'abonnement", **Then** il voit une confirmation demandant de confirmer l'annulation avec les conséquences expliquées
5. **Given** l'utilisateur confirme l'annulation, **When** le système traite la demande, **Then** l'abonnement est marqué comme "annulé à la fin de la période" et l'utilisateur conserve l'accès jusqu'à la date de fin
6. **Given** l'utilisateur a annulé son abonnement, **When** la période se termine, **Then** le système désactive automatiquement les fonctionnalités premium et notifie l'utilisateur

---

### User Story 5 - Configuration simplifiée guidée (Priority: P3)

L'administrateur qui découvre Stripe pour la première fois bénéficie d'un assistant de configuration simplifié qui le guide étape par étape pour configurer le système de paiement sans connaissances techniques avancées.

**Why this priority**: Cette fonctionnalité améliore l'accessibilité pour les administrateurs non techniques et réduit la barrière à l'entrée, mais elle n'est pas bloquante car la configuration manuelle reste possible.

**Independent Test**: Peut être testé en simulant un nouvel administrateur qui accède au panel pour la première fois et suit l'assistant de configuration jusqu'à la création de sa première offre.

**Acceptance Scenarios**:

1. **Given** l'administrateur se connecte pour la première fois et Stripe n'est pas configuré, **When** il accède au tableau de bord admin, **Then** il voit un assistant de bienvenue proposant de configurer Stripe en mode simplifié
2. **Given** l'administrateur démarre l'assistant simplifié, **When** il avance dans les étapes, **Then** il est guidé à travers : (1) Explication de Stripe, (2) Création d'un compte Stripe (lien externe), (3) Récupération des clés API, (4) Saisie des clés dans le formulaire
3. **Given** l'administrateur saisit les clés dans l'assistant, **When** il valide, **Then** le système teste la connexion et passe automatiquement à l'étape suivante (création de la première offre)
4. **Given** l'administrateur crée sa première offre via l'assistant, **When** il finalise, **Then** l'offre est créée et l'assistant affiche un récapitulatif avec les prochaines étapes suggérées
5. **Given** l'administrateur souhaite passer du mode test au mode production, **When** il consulte l'assistant de configuration, **Then** il voit une checklist de migration avec les étapes nécessaires

---

### User Story 6 - Gestion des webhooks Stripe (Priority: P1)

Le système écoute les événements Stripe (paiements réussis, échecs, annulations, renouvellements) via webhooks pour synchroniser automatiquement les statuts d'abonnement sans intervention manuelle.

**Why this priority**: Les webhooks sont critiques pour garantir la cohérence des données entre Stripe et la plateforme. Sans eux, les abonnements peuvent être dans un état incohérent après un paiement ou une annulation.

**Independent Test**: Peut être testé en simulant des événements Stripe (via le tableau de bord Stripe test) et en vérifiant que le système met à jour correctement les statuts d'abonnement.

**Acceptance Scenarios**:

1. **Given** un paiement est confirmé par Stripe, **When** Stripe envoie l'événement `invoice.payment_succeeded`, **Then** le système met à jour le statut d'abonnement de l'utilisateur à "actif" et enregistre le paiement
2. **Given** un paiement échoue, **When** Stripe envoie l'événement `invoice.payment_failed`, **Then** le système marque l'abonnement comme "impayé" et envoie une notification à l'utilisateur
3. **Given** un utilisateur annule son abonnement via Stripe directement, **When** Stripe envoie l'événement `customer.subscription.deleted`, **Then** le système met à jour le statut local et désactive l'accès premium
4. **Given** un abonnement se renouvelle automatiquement, **When** Stripe envoie l'événement `customer.subscription.updated`, **Then** le système met à jour la date de prochaine facturation
5. **Given** le système reçoit un événement webhook invalide ou corrompu, **When** il traite l'événement, **Then** il enregistre l'erreur dans les logs et renvoie une erreur à Stripe pour retry

---

### Edge Cases

- **Que se passe-t-il si l'administrateur change les clés API Stripe alors que des utilisateurs ont des abonnements actifs ?**
  - Le système doit afficher un avertissement indiquant les risques de perte de connexion avec les abonnements existants
  - Les abonnements existants doivent être migrés ou marqués comme nécessitant une attention

- **Que se passe-t-il si un utilisateur tente de s'abonner deux fois à la même offre ?**
  - Le système doit détecter l'abonnement actif existant et empêcher la double souscription
  - Message clair indiquant que l'utilisateur a déjà un abonnement actif à cette offre

- **Comment le système gère-t-il un utilisateur qui change de carte bancaire en cours d'abonnement ?**
  - L'utilisateur doit pouvoir accéder à son portail de gestion Stripe (Stripe Customer Portal)
  - Le système synchronise automatiquement les changements de méthode de paiement via webhooks

- **Que se passe-t-il si Stripe est en maintenance ou inaccessible lors d'un paiement ?**
  - Le système affiche un message d'erreur clair à l'utilisateur
  - Le processus de paiement peut être réessayé plus tard
  - Les webhooks de Stripe seront envoyés une fois le service restauré

- **Comment le système gère-t-il les remboursements initiés depuis Stripe ?**
  - Le webhook `charge.refunded` met à jour le statut de paiement
  - Le système notifie l'utilisateur du remboursement
  - L'abonnement peut être maintenu ou annulé selon la politique définie

- **Que se passe-t-il si un utilisateur supprime son compte alors qu'il a un abonnement actif ?**
  - Le système doit annuler automatiquement l'abonnement Stripe
  - L'utilisateur doit être averti que l'abonnement sera annulé immédiatement
  - Le nettoyage des données Stripe doit être effectué conformément au RGPD

- **Comment gérer les différences de devises entre la plateforme et Stripe ?**
  - Le système doit supporter uniquement les devises configurées dans Stripe
  - Les prix des offres doivent être cohérents avec la devise du compte Stripe
  - Affichage clair de la devise dans toutes les interfaces utilisateur

- **Que se passe-t-il si l'administrateur supprime une offre alors que des utilisateurs y sont abonnés ?**
  - Le système doit empêcher la suppression d'offres avec des abonnements actifs
  - Alternative : permettre la désactivation (masquée pour nouveaux abonnements) mais maintenue pour abonnés existants

## Requirements _(mandatory)_

### Functional Requirements

#### Configuration Administrateur

- **FR-001**: Le système DOIT permettre à l'administrateur de saisir et sauvegarder les clés API Stripe (clé publique et clé secrète) de manière sécurisée
- **FR-002**: Le système DOIT valider les clés API Stripe en établissant une connexion de test avant d'accepter la configuration
- **FR-003**: Le système DOIT distinguer et permettre la configuration séparée pour le mode test et le mode production Stripe
- **FR-004**: Le système DOIT masquer partiellement les clés API lors de l'affichage (ex: "sk_live_***************xyz")
- **FR-005**: Le système DOIT permettre à l'administrateur de mettre à jour ou remplacer les clés API à tout moment
- **FR-006**: Le système DOIT afficher l'état actuel de la connexion Stripe (connecté/déconnecté, mode test/production)

#### Gestion des Offres d'Abonnement

- **FR-007**: Le système DOIT permettre à l'administrateur de créer une offre d'abonnement avec les propriétés suivantes : nom, description, prix, devise, périodicité (mensuel/annuel)
- **FR-008**: Le système DOIT synchroniser automatiquement chaque offre créée avec Stripe en créant un Product et un Price correspondants
- **FR-009**: Le système DOIT permettre à l'administrateur d'importer les offres existantes depuis son compte Stripe
- **FR-010**: Le système DOIT permettre à l'administrateur de modifier le nom et la description d'une offre existante
- **FR-011**: Le système DOIT permettre à l'administrateur de désactiver une offre (la masquer pour les nouveaux abonnements tout en maintenant les abonnements existants)
- **FR-012**: Le système DOIT empêcher la suppression d'une offre si des abonnements actifs y sont liés
- **FR-013**: Le système DOIT afficher pour chaque offre le nombre d'abonnements actifs et le revenu mensuel récurrent (MRR) associé
- **FR-014**: Le système DOIT supporter les offres gratuites (prix = 0) pour les périodes d'essai ou offres freemium

#### Souscription Utilisateur

- **FR-015**: Le système DOIT permettre aux utilisateurs authentifiés de consulter la liste des offres d'abonnement disponibles
- **FR-016**: Le système DOIT rediriger l'utilisateur vers Stripe Checkout pour finaliser le paiement lors de la souscription à une offre payante
- **FR-017**: Le système DOIT activer automatiquement l'abonnement de l'utilisateur après confirmation du paiement par Stripe
- **FR-018**: Le système DOIT empêcher un utilisateur de souscrire à plusieurs abonnements simultanément pour la même offre
- **FR-019**: Le système DOIT stocker et associer l'identifiant Stripe Customer et Subscription à chaque utilisateur abonné
- **FR-020**: Le système DOIT permettre la souscription immédiate aux offres gratuites sans passer par Stripe Checkout

#### Gestion Utilisateur de l'Abonnement

- **FR-021**: Le système DOIT afficher dans le tableau de bord utilisateur les détails de l'abonnement actif (offre, date de renouvellement, montant)
- **FR-022**: Le système DOIT permettre à l'utilisateur de consulter l'historique complet de ses paiements avec dates et montants
- **FR-023**: Le système DOIT permettre à l'utilisateur de télécharger les factures PDF générées par Stripe
- **FR-024**: Le système DOIT permettre à l'utilisateur d'annuler son abonnement avec une confirmation explicite
- **FR-025**: Le système DOIT maintenir l'accès premium jusqu'à la fin de la période payée après une annulation
- **FR-026**: Le système DOIT désactiver automatiquement les fonctionnalités premium à la fin de la période après annulation
- **FR-027**: Le système DOIT permettre à l'utilisateur de réactiver un abonnement annulé avant la fin de la période
- **FR-028**: Le système DOIT rediriger l'utilisateur vers le Stripe Customer Portal pour gérer sa méthode de paiement

#### Webhooks et Synchronisation

- **FR-029**: Le système DOIT exposer un endpoint webhook sécurisé pour recevoir les événements Stripe
- **FR-030**: Le système DOIT vérifier la signature des webhooks Stripe pour garantir l'authenticité des événements
- **FR-031**: Le système DOIT traiter l'événement `invoice.payment_succeeded` en activant ou renouvelant l'abonnement utilisateur
- **FR-032**: Le système DOIT traiter l'événement `invoice.payment_failed` en marquant l'abonnement comme impayé et notifier l'utilisateur
- **FR-033**: Le système DOIT traiter l'événement `customer.subscription.updated` en mettant à jour les détails de l'abonnement (date de renouvellement, statut)
- **FR-034**: Le système DOIT traiter l'événement `customer.subscription.deleted` en désactivant l'abonnement et l'accès premium
- **FR-035**: Le système DOIT logger tous les événements webhook reçus avec leur statut de traitement (succès/échec)
- **FR-036**: Le système DOIT renvoyer une erreur à Stripe en cas d'échec de traitement pour déclencher un retry automatique

#### Configuration Simplifiée (Assistant)

- **FR-037**: Le système DOIT détecter si Stripe n'est pas encore configuré et proposer l'assistant de configuration au premier accès admin
- **FR-038**: L'assistant DOIT guider l'administrateur à travers 4 étapes : (1) Introduction à Stripe, (2) Création de compte, (3) Récupération des clés API, (4) Configuration des clés
- **FR-039**: L'assistant DOIT valider la connexion Stripe avant de passer à l'étape de création d'offre
- **FR-040**: L'assistant DOIT permettre de créer la première offre d'abonnement de manière simplifiée
- **FR-041**: L'assistant DOIT afficher un récapitulatif final avec les prochaines étapes suggérées (ajouter plus d'offres, tester un paiement)
- **FR-042**: L'assistant DOIT être accessible à tout moment via un lien "Reconfigurer Stripe" dans les paramètres admin

#### Sécurité et Conformité

- **FR-043**: Le système DOIT stocker les clés API Stripe de manière chiffrée dans la base de données ou variables d'environnement sécurisées
- **FR-044**: Le système DOIT utiliser HTTPS pour toutes les communications avec Stripe
- **FR-045**: Le système DOIT respecter les webhooks timeout de Stripe (réponse en moins de 5 secondes)
- **FR-046**: Le système DOIT implémenter une idempotence sur le traitement des webhooks pour éviter les doublons en cas de retry
- **FR-047**: Le système DOIT permettre l'annulation d'un abonnement côté Stripe en cas de suppression de compte utilisateur (conformité RGPD)

### Key Entities

- **StripeConfiguration**: Représente la configuration globale de Stripe pour la plateforme
  - Clés API (publique, secrète)
  - Mode (test/production)
  - Date de configuration
  - État de la connexion

- **SubscriptionPlan (Offre d'abonnement)**: Représente un plan tarifaire proposé aux utilisateurs
  - Nom de l'offre
  - Description
  - Prix et devise
  - Périodicité (mensuel/annuel)
  - Identifiant Stripe Product et Price
  - Statut (actif/désactivé)
  - Nombre d'abonnements actifs

- **UserSubscription**: Représente l'abonnement d'un utilisateur à une offre
  - Référence utilisateur
  - Référence offre d'abonnement
  - Identifiant Stripe Customer
  - Identifiant Stripe Subscription
  - Statut (actif, annulé, impayé, expiré)
  - Date de début
  - Date de fin/renouvellement
  - Date d'annulation (si applicable)

- **PaymentHistory**: Représente l'historique des paiements d'un utilisateur
  - Référence utilisateur
  - Référence abonnement
  - Identifiant Stripe Invoice
  - Montant
  - Date de paiement
  - Statut (réussi, échoué, remboursé)
  - Lien vers la facture PDF

- **WebhookLog**: Représente un événement webhook reçu de Stripe
  - Type d'événement (invoice.payment_succeeded, etc.)
  - Identifiant événement Stripe
  - Date de réception
  - Statut de traitement (succès, échec, en attente)
  - Message d'erreur (si échec)
  - Payload brut de l'événement

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: L'administrateur peut configurer complètement Stripe et créer sa première offre d'abonnement en moins de 10 minutes
- **SC-002**: Les utilisateurs peuvent s'abonner à une offre et finaliser le paiement en moins de 3 minutes
- **SC-003**: Le système synchronise les statuts d'abonnement avec Stripe via webhooks en moins de 10 secondes après chaque événement
- **SC-004**: 95% des paiements sont traités avec succès sans erreur technique (hors refus bancaire)
- **SC-005**: Les utilisateurs peuvent consulter leur historique de paiements et télécharger leurs factures en moins de 30 secondes
- **SC-006**: Le système peut gérer au moins 1000 abonnements actifs simultanément sans dégradation de performance
- **SC-007**: 100% des webhooks Stripe sont traités avec succès ou enregistrés pour retry automatique en cas d'échec temporaire
- **SC-008**: Les administrateurs non techniques peuvent configurer Stripe via l'assistant simplifié sans consulter de documentation externe dans 90% des cas
- **SC-009**: Le taux d'abandon lors du processus de souscription est inférieur à 20% (hors abandon volontaire sur la page Stripe)
- **SC-010**: Les erreurs de synchronisation entre Stripe et la plateforme représentent moins de 0.1% des transactions
- **SC-011**: Les utilisateurs peuvent annuler leur abonnement en moins de 2 minutes avec un parcours clair
- **SC-012**: Le système maintient une disponibilité de 99.9% pour les opérations critiques (webhooks, souscriptions)

## Assumptions

- Les administrateurs ont déjà créé un compte Stripe (ou sont guidés pour le faire)
- La plateforme utilise le module Better Auth déjà configuré pour l'authentification des utilisateurs
- Les utilisateurs acceptent les termes de service incluant les conditions de paiement
- Les webhooks Stripe peuvent être configurés via le tableau de bord Stripe par l'administrateur
- La devise par défaut est l'Euro (EUR) mais peut être configurée selon le compte Stripe
- Le système suit les standards PCI DSS via l'utilisation de Stripe Checkout (pas de gestion directe des cartes bancaires)
- Les abonnements sont récurrents (renouvellement automatique) sauf annulation explicite
- Les factures sont générées et hébergées par Stripe (pas de génération locale)
- Le système supporte uniquement les paiements par carte bancaire via Stripe (pas de PayPal, virements, etc.)
- Les offres d'abonnement ne supportent pas les fonctionnalités avancées (coupons, essais gratuits, metered billing) dans cette première version - ces fonctionnalités peuvent être ajoutées ultérieurement
- Le système n'implémente pas de gestion de taxes automatique - les taxes doivent être configurées dans Stripe directement
- La rétention des données de paiement suit la politique de conservation de Stripe (7 ans par défaut pour conformité fiscale)
