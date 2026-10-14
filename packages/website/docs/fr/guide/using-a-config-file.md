---
title: Utiliser un fichier de configuration
description: Configurez Bundlewatch avec un fichier de configuration ou package.json.
---

# Utiliser un fichier de configuration {#using-a-configuration-file}

La [CLI Bundlewatch](../reference/cli.md) peut lire la configuration depuis un fichier `.json`, `.js`, `.cjs` ou `.mjs`, ou depuis votre `package.json`. Sur Node.js 22.18 et les versions ultérieures, qui exécutent TypeScript nativement, elle peut aussi lire un fichier `.ts`, `.mts` ou `.cts`.

- Pour utiliser un fichier de configuration personnalisé, indiquez-le en ligne de commande :
  ```bash
  bundlewatch --config .bundlewatch.config.js
  ```
  Les chemins relatifs sont résolus depuis le répertoire courant. Les chemins absolus fonctionnent aussi.
- Si vous omettez l’option `--config`, Bundlewatch lit la clé `bundlewatch` du `package.json` le plus proche, en cherchant dans le répertoire courant puis dans ses parents. Il ne recherche pas automatiquement les fichiers `bundlewatch.config.*`.

Exemple de configuration dans `package.json` :

```json
{
  "name": "my package name",
  "version": "0.0.1",
  "bundlewatch": {
    "files": [
      {
        "path": "myfolder/*.js",
        "maxSize": "100kB"
      }
    ]
  }
}
```

Exemples de fichiers de configuration :

::: code-group

```js [bundlewatch.config.mjs]
/** @type {import('bundlewatch').BundlewatchConfig} */
export default {
  files: [
    {
      path: 'myfolder/*.js',
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
      path: 'myfolder/*.js',
      maxSize: '100kB',
    },
  ],
} satisfies BundlewatchConfig
```

```js [bundlewatch.config.cjs]
module.exports = {
  files: [
    {
      path: 'myfolder/*.js',
      maxSize: '100kB',
    },
  ],
}
```

```json [bundlewatch.config.json]
{
  "files": [
    {
      "path": "myfolder/*.js",
      "maxSize": "100kB"
    }
  ]
}
```

:::

- Le type `BundlewatchConfig` fournit l’autocomplétion et la vérification de chaque option dans votre éditeur.
- En TypeScript, préférez `.mts` : Node.js le charge comme un ES module dans tous les paquets. Un fichier `.ts` fonctionne aussi, mais dans un paquet sans `"type": "module"`, Node.js affiche un avertissement avant de le charger.
- Une configuration JavaScript ou TypeScript peut aussi n’avoir que des exports nommés, comme `export const files = [...]`, au lieu d’un export par défaut.
- Une configuration JavaScript permet de définir des options impossibles à exprimer en JSON, comme une `RegExp` pour [`normalizeFilenames`](../reference/configuration.md#normalizefilenames), ou des valeurs calculées à partir de variables d’environnement.

Votre configuration est fusionnée avec les [valeurs par défaut](../reference/configuration.md). Les tableaux comme `files` et `ci.trackBranches` remplacent la valeur par défaut au lieu d’être fusionnés avec elle.

Vous pouvez aussi fournir directement la configuration à l’[API Node.js](../reference/nodejs.md).
