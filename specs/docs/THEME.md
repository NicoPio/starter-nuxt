# Guide de Personnalisation du Thème 🎨

Ce guide explique comment personnaliser le thème NuxtUI moderne de votre application.

## Vue d'ensemble

Le thème actuel utilise :
- **Couleurs vives** : Bleu, violet, émeraude, ambre, rose
- **Typographies agrandies** : 18px par défaut (au lieu de 16px)
- **Design moderne** : Bordures arrondies, ombres prononcées, effets de transition

## Fichiers de Configuration

### 1. `app.config.ts` - Configuration NuxtUI Runtime

Ce fichier configure les composants NuxtUI :

```typescript
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',      // Couleur principale
      secondary: 'violet',  // Couleur secondaire
      success: 'emerald',   // Succès
      warning: 'amber',     // Avertissement
      error: 'rose'         // Erreur
    },

    // Personnalisation des composants
    button: {
      slots: {
        base: 'font-semibold text-base transition-all duration-200 hover:scale-105'
      }
    }
  }
})
```

### 2. `app/assets/css/main.css` - Variables CSS & Styles Globaux

Ce fichier contient les variables CSS Tailwind et NuxtUI :

```css
@theme {
  /* Tailles de police */
  --font-size-base: 1.125rem;   /* 18px */
  --font-size-lg: 1.375rem;     /* 22px */

  /* Couleurs primaires */
  --color-blue-500: #3b82f6;

  /* Radius */
  --radius-lg: 1rem;
}
```

## Personnalisation Courante

### Changer la Couleur Primaire

**Option 1 : Utiliser une couleur Tailwind existante**

Dans `app.config.ts` :
```typescript
ui: {
  colors: {
    primary: 'indigo'  // ou 'purple', 'green', 'red', etc.
  }
}
```

**Option 2 : Définir une couleur personnalisée**

Dans `app/assets/css/main.css` :
```css
@theme {
  --color-brand-500: #ff6b6b;  /* Votre couleur */
}

:root {
  --ui-color-primary-500: var(--color-brand-500);
  --ui-primary: var(--ui-color-primary-500);
}
```

### Ajuster les Tailles de Police

Dans `app/assets/css/main.css` :

```css
@theme {
  /* Plus petit */
  --font-size-base: 1rem;       /* 16px */

  /* Plus gros */
  --font-size-base: 1.25rem;    /* 20px */
}
```

### Modifier les Bordures Arrondies

Dans `app/assets/css/main.css` :

```css
:root {
  --ui-radius: var(--radius-sm);   /* Moins arrondi (0.5rem) */
  --ui-radius: var(--radius-xl);   /* Plus arrondi (1.5rem) */
  --ui-radius: var(--radius-full); /* Complètement arrondi */
}
```

### Personnaliser un Composant Spécifique

Dans `app.config.ts` :

```typescript
ui: {
  card: {
    slots: {
      root: 'rounded-2xl shadow-2xl',  /* Très arrondi et ombré */
      header: 'px-8 py-6 font-black text-2xl'
    }
  },

  button: {
    variants: {
      size: {
        lg: 'text-2xl px-8 py-4'  /* Boutons très gros */
      }
    }
  }
}
```

## Mode Sombre

Le mode sombre est géré automatiquement. Les couleurs s'ajustent via CSS :

```css
.dark {
  --ui-primary: var(--ui-color-primary-400);  /* Plus clair en mode sombre */
  --ui-bg: #0f172a;
  --ui-text: #f1f5f9;
}
```

Pour personnaliser les couleurs dark mode :

```css
.dark {
  --ui-primary: #60a5fa;  /* Votre couleur en mode sombre */
}
```

## Classes Utilitaires Personnalisées

Le thème inclut des classes utilitaires :

### Glassmorphism
```vue
<div class="glass-effect">
  Contenu avec effet de verre
</div>
```

### Ombres Modernes
```vue
<div class="shadow-modern">
  Ombre prononcée
</div>

<div class="shadow-modern-lg">
  Ombre très prononcée
</div>
```

## Exemples de Personnalisation

### Thème Vert Nature
```typescript
// app.config.ts
ui: {
  colors: {
    primary: 'green',
    secondary: 'teal'
  }
}
```

```css
/* app/assets/css/main.css */
:root {
  --ui-color-primary-500: #10b981;
  --ui-primary: var(--ui-color-primary-500);
}
```

### Thème Corporate Sombre
```typescript
// app.config.ts
ui: {
  colors: {
    primary: 'slate',
    secondary: 'zinc'
  }
}
```

```css
/* app/assets/css/main.css */
:root {
  --ui-bg: #1e293b;
  --ui-text: #f1f5f9;
}
```

### Typographie Minimaliste
```css
/* app/assets/css/main.css */
@theme {
  --font-size-base: 0.875rem;  /* 14px - Plus petit */
  --line-height-normal: 1.5;
}

h1, h2, h3 {
  font-weight: 400;  /* Titres légers */
}
```

## Documentation Officielle

- [NuxtUI Documentation](https://ui.nuxt.com)
- [NuxtUI Theming](https://ui.nuxt.com/getting-started/theming)
- [Tailwind CSS](https://tailwindcss.com)

## Conseils

1. **Testez en Light & Dark** : Vérifiez toujours vos changements dans les deux modes
2. **Contraste** : Assurez-vous que le contraste texte/background est suffisant (WCAG AA minimum)
3. **Cohérence** : Utilisez les couleurs sémantiques (`primary`, `success`, etc.) plutôt que des couleurs hardcodées
4. **Performance** : Les variables CSS sont compilées au build-time, c'est très performant
5. **Hot Reload** : Les changements dans `app.config.ts` et `main.css` sont pris en compte immédiatement en dev

## Support

Pour toute question sur la personnalisation du thème, consultez :
- La documentation NuxtUI : https://ui.nuxt.com
- Le CHANGELOG.md pour voir l'historique des changements
