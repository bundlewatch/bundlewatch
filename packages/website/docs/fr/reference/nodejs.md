---
title: API Node.js
description: Exécutez Bundlewatch depuis Node.js et découvrez le format des résultats, les types TypeScript et les erreurs.
---

# API Node.js {#node-js-api}

L’API s’utilise comme dans l’exemple ci-dessous. Pour le détail des paramètres, consultez la [configuration](/fr/reference/configuration.md). Elle nécessite Node.js 22.17 ou une version ultérieure. Le paquet fournit des versions ES module et CommonJS, avec des [types TypeScript](#typescript).

```js
import bundlewatch, { STATUSES } from 'bundlewatch'

const results = await bundlewatch({
  files: [
    {
      path: './myfolder/*.js',
      maxSize: '100kb',
    },
  ],
  bundlewatchServiceHost: 'https://service.bundlewatch.io', // Peut être votre propre service
  ci: {
    // Détectées dans votre environnement CI, sauf si vous les définissez
    githubAccessToken: process.env.BUNDLEWATCH_GITHUB_TOKEN,
    repoBranchBase: 'main', // Branche cible de la pull request
    trackBranches: ['main', 'develop'],
  },
  defaultCompression: 'gzip',
})

console.log(results)

// Les chaînes de statut sont aussi accessibles depuis l’API
if (results.status === STATUSES.FAIL) {
  process.exitCode = 1
}
```

Comme la CLI, l’API publie des statuts GitHub, compare les tailles aux références et enregistre ces dernières lorsque les informations `ci` sont disponibles. Elle journalise aussi les mêmes lignes `[INFO]`, `[WARNING]` et `[ERROR]` dans la console, mais n’affiche pas les résultats et ne définit pas le code de sortie : cela vous revient.

## CommonJS {#commonjs}

En CommonJS, utilisez l’export `default` :

```js
const bundlewatch = require('bundlewatch').default
const { STATUSES } = require('bundlewatch')
```

`require()` charge la version CommonJS du paquet.

## Résultat {#result}

`bundlewatch()` renvoie une promesse dont le résultat ressemble à ceci :

```js
{
  status: 'fail',
  fullResults: [
    {
      filePath: './myfolder/test-file-1.jpg',
      message: '30.71KB < 100KB (gzip)',
      status: 'pass',
      size: 31448,
      baseBranchSize: 0,
      maxSize: 102400
    },
    {
      filePath: './myfolder/test-file-2.jpg',
      message: '198.6KB > 100KB (gzip)',
      status: 'fail',
      size: 203368,
      baseBranchSize: 0,
      maxSize: 102400
    }
  ],
  summary: 'maxSize check failed',
  url: 'https://service.bundlewatch.io/r/3fK9xQ2LmP7a'
}
```

| Champ         | Description                                                                                                                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status`      | `'pass'` ou `'fail'`, également disponibles comme `STATUSES.PASS` et `STATUSES.FAIL`. `'warn'` (`STATUSES.WARN`) est réservé : aucun contrôle ne le produit.                                                      |
| `summary`     | Un résumé sur une ligne, par exemple `'maxSize check failed'`                                                                                                                                                     |
| `url`         | La [page de résultats](../guide/using-bundlewatch.md#results-links) : un lien court lorsque le service accepte le jeton en écriture, un lien long sinon. `undefined` lorsque `bundlewatchServiceHost` vaut `null` |
| `fullResults` | Une entrée par fichier                                                                                                                                                                                            |

Chaque entrée de `fullResults` contient :

| Champ            | Description                                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `filePath`       | Le chemin du fichier, après application de `normalizeFilenames`                                                                                              |
| `status`         | `'pass'`, `'fail'` ou `'removed'` pour un fichier présent dans les tailles de référence mais qui n’existe plus                                               |
| `message`        | Le résultat sous forme de texte. Absent des entrées en erreur.                                                                                               |
| `error`          | Uniquement sur les entrées en erreur, par exemple lorsqu’un chemin ne correspond à aucun fichier. Elles n’ont pas de tailles et leur `status` vaut `'fail'`. |
| `size`           | Taille en octets, après compression. `0` pour les fichiers supprimés.                                                                                        |
| `baseBranchSize` | Taille de référence, en octets. `0` en l’absence de référence.                                                                                               |
| `maxSize`        | Limite en octets. `Infinity` si elle n’est pas définie ; `0` pour les fichiers supprimés.                                                                    |

## TypeScript {#typescript}

Les deux versions incluent des déclarations de types. En plus de `bundlewatch` et `STATUSES`, le paquet exporte ces types :

| Type                | Description                                                                             |
| ------------------- | --------------------------------------------------------------------------------------- |
| `BundlewatchConfig` | La configuration passée à `bundlewatch()`                                               |
| `FileConfig`        | Une entrée de `files`                                                                   |
| `CiConfig`          | L’objet `ci`                                                                            |
| `BundlewatchResult` | Le résultat de la promesse renvoyée par `bundlewatch()` ; consultez [Résultat](#result) |
| `FileResult`        | Une entrée de `fullResults`                                                             |
| `Status`            | `'pass'`, `'warn'`, `'fail'` ou `'removed'`                                             |

```ts
import bundlewatch, { type BundlewatchConfig } from 'bundlewatch'

const config: BundlewatchConfig = {
  files: [{ path: './dist/*.js', maxSize: '100kB' }],
}

const results = await bundlewatch(config)
```

## Erreurs {#errors}

Lorsque la configuration est invalide, `bundlewatch()` rejette la promesse avec une `ValidationError`, également exportée par le paquet. Comme en 0.x, son `type` vaut `'ValidationError'`.

```js
import bundlewatch, { ValidationError } from 'bundlewatch'

try {
  await bundlewatch({
    files: [{ path: './dist/*.js' }],
    defaultCompression: 'zip',
  })
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(error.message) // config.compression must be a valid type
  }
}
```

La CLI utilise elle-même cette API ; consultez le [code source de la CLI Bundlewatch](https://github.com/bundlewatch/bundlewatch/tree/main/packages/bundlewatch).
