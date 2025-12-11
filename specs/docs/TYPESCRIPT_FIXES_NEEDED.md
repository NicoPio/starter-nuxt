# TypeScript Fixes Required - Migration nuxt-auth-utils

Ce document liste les erreurs TypeScript détectées lors de l'exécution de `bun run typecheck` et les stratégies de correction.

## Résumé des erreurs

**Total** : ~100+ erreurs TypeScript détectées

### Catégories d'erreurs

1. **Types User nuxt-auth-utils** (18 erreurs) - **CRITIQUE**
2. **Couleurs Nuxt UI invalides** (12 erreurs) - **HAUTE PRIORITÉ**
3. **Types Stripe manquants** (6 erreurs) - **MOYENNE PRIORITÉ**
4. **Tests avec imports obsolètes** (40+ erreurs) - **BASSE PRIORITÉ**
5. **Auto-imports non reconnus** (20+ erreurs) - **CONFIGURATION**

---

## 1. Types User nuxt-auth-utils ✅ FIXÉ

**Problème** : Le type `User` de nuxt-auth-utils ne contient pas les propriétés `role`, `email`, `name`.

**Solution appliquée** : Créé `app/types/auth.d.ts` pour étendre le type User.

```typescript
// app/types/auth.d.ts
declare module '#auth-utils' {
  interface User {
    id: string
    email: string
    role: UserRole
    name?: string
  }
}
```

**Fichiers affectés** :
- app/composables/useRole.ts:8
- app/middleware/admin.ts:16
- app/middleware/contributor.ts:16
- app/layouts/admin.vue:44
- app/layouts/dashboard.vue:41
- app/pages/admin/index.vue:29
- server/api/admin/users/[id]/index.delete.ts:11

**Status** : ✅ Déclaration créée, nécessite redémarrage TypeScript server

---

## 2. Couleurs Nuxt UI invalides 🔴 À CORRIGER

**Problème** : Utilisation de couleurs non-standard ("gray", "green", "yellow", "blue", "red") au lieu des couleurs Nuxt UI officielles.

**Couleurs valides Nuxt UI** :
- `error` (rouge)
- `primary` (bleu)
- `secondary` (violet)
- `success` (vert)
- `info` (bleu clair)
- `warning` (jaune/orange)
- `neutral` (gris)

**Mappings recommandés** :
- `gray` → `neutral`
- `green` → `success`
- `yellow` → `warning`
- `red` → `error`
- `blue` → `primary`

**Fichiers à corriger** :

### app/components/admin/stripe/ConfigurationForm.vue
- Ligne 49 : `color="gray"` → `color="neutral"`
- Ligne 109 : `color="gray"` → `color="neutral"`

### app/components/admin/stripe/ConnectionStatus.vue
- Ligne 41 : Type `"green" | "yellow" | "gray"` → doit être type valide
- Ligne 66 : `color="yellow"` → `color="warning"`
- Ligne 76 : `color="green"` → `color="success"`
- Ligne 86 : `color="blue"` → `color="primary"`

### app/composables/useStripeConfig.ts
- Ligne 53 : `color: "green"` → `color: "success"`
- Ligne 65 : `color: "red"` → `color: "error"`
- Ligne 92 : `color: "green"` → `color: "success"`
- Ligne 98 : `color: "red"` → `color: "error"`
- Ligne 111 : `color: "red"` → `color: "error"`

**Actions** :
```bash
# Recherche globale
grep -r 'color="gray"' app/components/
grep -r 'color="green"' app/
grep -r 'color="red"' app/
grep -r 'color="yellow"' app/
grep -r 'color="blue"' app/

# Remplacement automatique (à valider manuellement)
# find app/ -name "*.vue" -o -name "*.ts" | xargs sed -i '' 's/color="gray"/color="neutral"/g'
```

---

## 3. Types Stripe manquants 🟡 MOYENNE PRIORITÉ

**Problème** : Le fichier `~/app/types/stripe.types` n'existe pas.

**Fichiers affectés** :
- server/api/admin/stripe/config.get.ts:3
- server/api/admin/stripe/test-connection.post.ts:2

**Solution** : Créer le fichier manquant ou utiliser les types de `common.types.ts`.

**Actions** :
```bash
# Option 1: Créer stripe.types.ts
# Option 2: Changer les imports vers common.types.ts
```

**Status** : ⏳ TODO - Feature 004 (Stripe) n'est pas prioritaire pour migration nuxt-auth-utils

---

## 4. Tests avec imports obsolètes 🟠 BASSE PRIORITÉ

**Problème** : Les fichiers de test importent des modules Better Auth obsolètes.

**Fichiers affectés** :
- test/unit/composables/useRole.test.ts (import `~/lib/auth-client`)
- test/utils/auth-helpers.ts
- test/utils/factories.ts
- test/nuxt/components/UserList.spec.ts

**Types manquants** :
- `UserWithRole` n'est plus exporté de `~/types/common.types` (devrait être `~/app/types/common.types`)
- `UserRole` n'est plus exporté

**Solution** :
1. Mettre à jour les chemins d'import : `~/types/` → `~/app/types/`
2. Supprimer les imports Better Auth obsolètes
3. Réécrire les tests pour utiliser nuxt-auth-utils

**Status** : ⏳ TODO - Phase 8 (Polish) - Tests à réécrire après migration complète

---

## 5. Auto-imports non reconnus 🔵 CONFIGURATION

**Problème** : TypeScript ne reconnaît pas les auto-imports Nuxt (composables, utils, etc.).

**Fichiers affectés** :
- app/pages/*.vue (50+ erreurs : `definePageMeta`, `useSeoMeta`, `useHead`, etc.)
- app/plugins/*.ts
- app/composables/*.ts

**Exemples d'erreurs** :
```
error TS2304: Cannot find name 'definePageMeta'.
error TS2304: Cannot find name 'useSeoMeta'.
error TS2304: Cannot find name 'useAuth'.
error TS2304: Cannot find name 'useUserSession'.
```

**Cause probable** :
- `.nuxt/` types non à jour
- TypeScript server cache obsolète

**Solution** :
```bash
# Régénérer les types Nuxt
rm -rf .nuxt
bun run dev  # Régénère .nuxt/

# Ou
npx nuxi prepare

# Redémarrer TypeScript server dans l'IDE
# VSCode: Cmd+Shift+P → "TypeScript: Restart TS Server"
```

**Status** : ⏳ TODO - Configuration TypeScript

---

## Stratégie de correction

### Phase 1 : Corrections critiques (15 min)
1. ✅ Créer `app/types/auth.d.ts` (FAIT)
2. 🔴 Corriger couleurs Nuxt UI (ConfigurationForm, ConnectionStatus, useStripeConfig)
3. 🔴 Régénérer types Nuxt (`rm -rf .nuxt && bun run dev`)

### Phase 2 : Corrections moyennes (30 min)
4. 🟡 Créer ou corriger types Stripe
5. 🟡 Corriger chemins d'import dans tests
6. 🟡 Supprimer références Better Auth obsolètes dans tests

### Phase 3 : Corrections basses priorité (1h+)
7. 🟠 Réécrire tests unitaires pour nuxt-auth-utils
8. 🟠 Réécrire tests E2E
9. 🟠 Validation complète type checking

---

## Commandes de validation

```bash
# Type checking complet
bun run typecheck

# Type checking avec détails
npx nuxi typecheck --verbose

# Linting
bun run lint

# Tests (après corrections)
bun run test:unit
bun run test:e2e
```

---

## Estimation du temps

| Catégorie | Temps estimé | Priorité |
|-----------|--------------|----------|
| Types User (auth.d.ts) | ✅ 5 min | P0 |
| Couleurs Nuxt UI | 🔴 15 min | P1 |
| Régénération types Nuxt | 🔴 5 min | P1 |
| Types Stripe | 🟡 30 min | P2 |
| Imports tests | 🟡 30 min | P2 |
| Réécriture tests | 🟠 2h+ | P3 |

**Total priorité P0-P1** : 25 minutes
**Total priorité P2** : 1 heure
**Total complet** : 3+ heures

---

## Recommandations

### Pour la migration immédiate (MVP)
1. ✅ Appliquer Phase 1 (corrections critiques)
2. ⏭️  Ignorer erreurs Stripe (Feature 004, hors scope migration auth)
3. ⏭️  Ignorer erreurs tests (Phase 8 Polish, non-bloquant)
4. ✅ Valider que l'application compile et démarre

### Pour production
1. ✅ Appliquer toutes corrections Phase 1-2
2. ✅ Réécrire tests Phase 3
3. ✅ Valider `bun run typecheck` passe sans erreurs

---

## Notes

- **Feature flag** : `USE_NUXT_AUTH_UTILS=true` doit être activé avant validation finale
- **Database** : Migrations 006-007 déjà appliquées
- **Cleanup** : Migration 008 (cleanup Better Auth) ne doit PAS être exécutée avant 7 jours de monitoring production

---

## Références

- Tasks.md : `/Volumes/ExternalMac/Dev/starter-nuxt/specs/005-migrate-nuxt-auth-utils/tasks.md`
- Research : `/Volumes/ExternalMac/Dev/starter-nuxt/specs/005-migrate-nuxt-auth-utils/research.md`
- Manual Testing : `/Volumes/ExternalMac/Dev/starter-nuxt/MANUAL_TESTING.md`
