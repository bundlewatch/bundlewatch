---
title: Utiliser un fichier de configuration
description: Configurez Bundlewatch avec un fichier de configuration ou package.json.
---

# Utiliser un fichier de configuration {#using-a-configuration-file}

Créez `bundlewatch.config.mjs` à la racine du projet, puis exécutez :

```bash
npx bundlewatch
```

Un fichier de configuration dédié est la méthode recommandée. Bundlewatch recherche automatiquement les noms de fichiers ci-dessous ; consultez la [recherche de configuration](#config-discovery) pour connaître leur ordre de priorité.

::: code-group

```js [bundlewatch.config.mjs]
/** @type {import('bundlewatch').BundlewatchConfig} */
export default {
  files: [
    {
      path: './dist/*.js',
      maxSize: '100kB',
    },
  ],
}
```

```ts [bundlewatch.config.mts]
import type { BundlewatchConfig } from 'bundlewatch'

export default {
  files: [
    {
      path: './dist/*.js',
      maxSize: '100kB',
    },
  ],
} satisfies BundlewatchConfig
```

```js [bundlewatch.config.cjs]
module.exports = {
  files: [
    {
      path: './dist/*.js',
      maxSize: '100kB',
    },
  ],
}
```

```json [bundlewatch.config.json]
{
  "files": [
    {
      "path": "./dist/*.js",
      "maxSize": "100kB"
    }
  ]
}
```

:::

- Les fichiers de configuration peuvent être `.json`, `.js`, `.cjs` ou `.mjs`, ainsi que `.ts`, `.mts` ou `.cts` sur Node.js 22.18 et les versions ultérieures, qui exécutent TypeScript nativement. Les chemins de `--config` sont résolus depuis le répertoire courant ; les chemins absolus fonctionnent aussi.
- Le type `BundlewatchConfig` fournit l’autocomplétion et la vérification de chaque option dans votre éditeur.
- En TypeScript, préférez `.mts` : Node.js le charge comme un ES module dans tous les paquets. Un fichier `.ts` fonctionne aussi, mais dans un paquet sans `"type": "module"`, Node.js affiche un avertissement avant de le charger.
- Une configuration JavaScript ou TypeScript peut aussi n’avoir que des exports nommés, comme `export const files = [...]`, au lieu d’un export par défaut.
- Une configuration JavaScript permet de définir des options impossibles à exprimer en JSON, comme une `RegExp` pour [`normalizeFilenames`](../reference/configuration.md#normalizefilenames), ou des valeurs calculées à partir de variables d’environnement.

Votre configuration est fusionnée avec les [valeurs par défaut](../reference/configuration.md). Les tableaux comme `files` et `ci.trackBranches` remplacent la valeur par défaut au lieu d’être fusionnés avec elle.

Vous pouvez aussi fournir directement la configuration à l’[API Node.js](../reference/nodejs.md).

## Recherche de configuration {#config-discovery}

Sans motifs glob en ligne de commande ni `--config`, Bundlewatch cherche dans le répertoire courant, puis dans ses parents. Dans chaque répertoire, il vérifie ces noms dans cet ordre :

1. `bundlewatch.config.mjs`
2. `bundlewatch.config.js`
3. `bundlewatch.config.cjs`
4. `bundlewatch.config.mts`
5. `bundlewatch.config.ts`
6. `bundlewatch.config.cts`
7. `bundlewatch.config.json`

Le premier fichier trouvé est utilisé. La recherche inclut le répertoire du `package.json` le plus proche, puis s’arrête. Si aucun fichier de configuration n’est trouvé, Bundlewatch lit la clé `bundlewatch` de ce paquet. Il ne cherche pas au-delà, même si la clé est absente. Sans `package.json`, la recherche continue jusqu’à la racine du système de fichiers.

Un fichier impossible à charger ou une configuration invalide fait échouer l’exécution ; Bundlewatch ne se rabat pas sur un autre fichier ni sur `package.json`. Les motifs glob restent relatifs au répertoire d’exécution, même si le fichier de configuration se trouve dans un parent.

Pour un nom ou un emplacement personnalisé, utilisez `--config`. Cette option remplace la recherche automatique et permet de sélectionner une configuration partagée en dehors du paquet courant :

```bash
npx bundlewatch --config ../shared/bundlewatch.config.mjs
```

## Autre possibilité : package.json {#package-json}

Vous pouvez aussi conserver la configuration sous la clé `bundlewatch` de `package.json` :

```json [package.json]
{
  "bundlewatch": {
    "files": [
      {
        "path": "./dist/*.js",
        "maxSize": "100kB"
      }
    ]
  }
}
```

Exécutez `npx bundlewatch` pour lire cette configuration lorsqu’aucun fichier de configuration n’est trouvé. Les motifs glob en ligne de commande, `--config` et les fichiers trouvés automatiquement ont priorité sur cette clé. Dans un monorepo, conservez la clé dans le `package.json` du paquet concerné, ou utilisez `--config` pour sélectionner explicitement un fichier partagé.
