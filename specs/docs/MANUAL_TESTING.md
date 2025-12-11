# Manual Testing Guide - Migration nuxt-auth-utils

Ce document décrit les tests manuels à effectuer pour valider la migration Better Auth → nuxt-auth-utils.

## Tests Administratifs (T047-T048)

### T047: Admin Panel Access

**Objectif** : Vérifier qu'un utilisateur avec le rôle Admin peut accéder au panel d'administration.

**Étapes** :

1. **Créer un utilisateur Admin** :
   ```bash
   # Option 1: Via l'endpoint promote-first-user
   curl -X POST http://localhost:3000/api/admin/promote-first-user

   # Option 2: Via la database directement
   # Se connecter à Supabase et exécuter :
   # UPDATE users SET role = 'Admin' WHERE email = 'votre@email.com';
   ```

2. **Se connecter** :
   - Aller sur http://localhost:3000/login
   - Entrer les identifiants de l'utilisateur Admin
   - Cliquer sur "Se connecter"

3. **Accéder au panel admin** :
   - Aller sur http://localhost:3000/admin
   - Vérifier que la page se charge sans redirection vers /login
   - Vérifier que la liste des utilisateurs s'affiche

**Résultat attendu** : ✅ L'utilisateur Admin peut accéder au panel et voir la liste des utilisateurs

**Statut** : ⚠️  À tester manuellement

---

### T048: Role Change Functionality

**Objectif** : Vérifier qu'un Admin peut changer le rôle d'un utilisateur.

**Prérequis** : T047 complété (être connecté en tant qu'Admin)

**Étapes** :

1. **Créer un utilisateur test** :
   - Aller sur http://localhost:3000/signup
   - Créer un compte avec email: test-role@example.com

2. **Retourner au panel admin** :
   - Aller sur http://localhost:3000/admin/users
   - Rechercher l'utilisateur test-role@example.com

3. **Changer le rôle** :
   - Localiser le dropdown ou bouton "Change Role"
   - Changer le rôle de "User" à "Contributor"
   - Valider le changement

4. **Vérifier le changement** :
   - Rafraîchir la page
   - Vérifier que le rôle affiché est "Contributor"
   - (Optionnel) Se connecter avec le compte test et vérifier les permissions

**Résultat attendu** : ✅ Le rôle de l'utilisateur est changé avec succès et visible dans l'interface

**Statut** : ⚠️  À tester manuellement

---

## Tests Stripe Integration (T055-T056)

### T055: Stripe Webhook avec User Lookup

**Objectif** : Vérifier que les webhooks Stripe fonctionnent avec le nouveau schéma `users`.

**Prérequis** :
- Stripe CLI installé : `brew install stripe/stripe-cli/stripe`
- Clés Stripe configurées dans .env

**Étapes** :

1. **Démarrer le tunnel Stripe** :
   ```bash
   stripe listen --forward-to localhost:3000/api/subscriptions/webhook
   ```

2. **Créer un webhook test** :
   ```bash
   stripe trigger customer.subscription.created
   ```

3. **Vérifier les logs** :
   - Consulter les logs du serveur Nuxt
   - Vérifier qu'aucune erreur "user not found" n'apparaît
   - Vérifier que le webhook est traité avec succès

**Résultat attendu** : ✅ Webhook traité sans erreur, user_id correctement résolu

**Statut** : ⚠️  À tester manuellement avec Stripe CLI

---

### T056: Subscription Status Display

**Objectif** : Vérifier que l'affichage du statut d'abonnement fonctionne.

**Prérequis** : Un utilisateur avec un abonnement Stripe actif

**Étapes** :

1. **Se connecter avec un compte ayant un abonnement** :
   - Aller sur http://localhost:3000/login
   - Se connecter

2. **Accéder à la page Dashboard** :
   - Aller sur http://localhost:3000/dashboard
   - Vérifier que la carte d'abonnement s'affiche

3. **Vérifier les informations** :
   - Plan d'abonnement affiché
   - Statut (Active, Cancelled, etc.)
   - Date de renouvellement
   - Bouton "Cancel Subscription" visible

**Résultat attendu** : ✅ Les informations d'abonnement sont correctement affichées

**Statut** : ⚠️  À tester manuellement

---

## Tests Authentication Flow (Validation Générale)

### Login Email/Password

**Étapes** :
1. Aller sur http://localhost:3000/login
2. Entrer email et password d'un utilisateur existant
3. Cliquer "Se connecter"
4. Vérifier redirection vers /dashboard

**Résultat attendu** : ✅ Login réussi, session créée

---

### Signup Email/Password

**Étapes** :
1. Aller sur http://localhost:3000/signup
2. Entrer nouvel email, password, nom
3. Cliquer "S'inscrire"
4. Vérifier auto-login et redirection vers /dashboard

**Résultat attendu** : ✅ Compte créé, auto-login réussi

---

### Logout

**Étapes** :
1. Être connecté
2. Cliquer sur le bouton "Logout"
3. Vérifier redirection vers /

**Résultat attendu** : ✅ Déconnexion réussie, session effacée

---

### OAuth GitHub

**Prérequis** : GitHub OAuth configuré dans .env

**Étapes** :
1. Aller sur http://localhost:3000/login
2. Cliquer "Sign in with GitHub"
3. Autoriser l'application GitHub
4. Vérifier redirection vers /dashboard

**Résultat attendu** : ✅ Login OAuth réussi, compte créé/lié

---

## Type Checking & Linting (T075-T076)

### T075: Type Checking

```bash
bun run typecheck
```

**Résultat attendu** : ✅ No type errors (ou erreurs non-bloquantes acceptables)

---

### T076: Linting

```bash
bun run lint
```

**Résultat attendu** : ✅ No linting errors (warnings acceptables)

---

## Database Cleanup Validation (T066-T067)

### T066: Verify No Better Auth Tables

**Étapes** :

```bash
# Via Supabase Studio
# Aller sur http://localhost:54323

# Ou via SQL
docker exec -it supabase_db_starter-nuxt psql -U postgres -c "
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('session', 'verification', 'password', 'account', 'user');
"
```

**Résultat attendu** : ✅ Aucune table Better Auth (ou toutes les tables existent si cleanup pas encore exécuté)

**Statut** : ⏳ Pending cleanup migration execution (MANUAL - Production only)

---

### T067: Verify No Better Auth Imports

**Étapes** :

```bash
grep -r "better-auth" app/ server/ --include="*.ts" --include="*.vue" --include="*.js"
grep -r "lib/auth-client" app/ server/ --include="*.ts" --include="*.vue"
```

**Résultat attendu** : ✅ No Better Auth references found (sauf migrations SQL et docs)

---

## Summary

| Test | Status | Priority |
|------|--------|----------|
| T047: Admin panel access | ⚠️  Manual | P2 |
| T048: Role change | ⚠️  Manual | P2 |
| T055: Stripe webhook | ⚠️  Manual | P2 |
| T056: Subscription display | ⚠️  Manual | P2 |
| T066: DB cleanup validation | ⏳ Pending | P3 |
| T067: Code cleanup validation | ✅ Done | P3 |
| T075: Type checking | ⏳ To run | P1 |
| T076: Linting | ⏳ To run | P1 |

---

## Notes

- Les tests T047-T048 et T055-T056 nécessitent un environnement de développement actif
- Les tests Stripe nécessitent Stripe CLI et des clés API configurées
- Le cleanup (T066) ne doit être exécuté qu'après 7 jours de monitoring en production
- Ces tests manuels complètent les tests automatisés (unit + E2E) qui seront implémentés dans la Phase 8 (Polish)

---

## Automatisation Future

Pour automatiser ces tests :

1. **Playwright E2E** : Créer des tests dans `test/e2e/`
2. **API Tests** : Créer des tests d'intégration dans `test/integration/`
3. **CI/CD** : Ajouter ces tests au pipeline CI (GitHub Actions, etc.)

Référence : `tasks.md` Phase 8 (T068-T072)
