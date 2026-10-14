---
title: Référence de configuration
description: Toutes les options de Bundlewatch, leurs valeurs par défaut et les variables d’environnement utilisées.
---

<a id="configuration-reference"></a>

Seul le tableau `files`, avec au moins un `path`, est obligatoire.
`bundlewatch.config.mjs`

```js
export default {
  files: [
    {
      path: './myfolder/*.js',
      maxSize: '100kB',
      compression: 'none',
    },
  ],
  normalizeFilenames: /^.+?(\..+?)\.\w+$/,
  bundlewatchServiceHost: 'https://service.bundlewatch.io', // Peut être votre propre service
  ci: {
    trackBranches: ['main', 'develop', 'staging'], // Remplace la liste par défaut
  },
  defaultCompression: 'gzip',
}
```

Votre configuration est fusionnée avec les valeurs par défaut ci-dessous. Les tableaux comme `files` et `ci.trackBranches` remplacent la valeur par défaut au lieu d’être fusionnés avec elle.

| Option                   | Valeur par défaut                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| `files`                  | Aucune, obligatoire                                                                                 |
| `defaultCompression`     | `'gzip'`                                                                                            |
| `normalizeFilenames`     | `null`                                                                                              |
| `bundlewatchServiceHost` | `'https://service.bundlewatch.io'` ; `null` désactive le service                                    |
| `ci.repoBranchBase`      | Détectée, avec `'master'` comme valeur de repli                                                     |
| `ci.trackBranches`       | `['master', 'main', 'develop']`, plus la branche par défaut du dépôt lorsqu’elle peut être détectée |
| Autres options `ci`      | Détectées dans votre environnement CI                                                               |

## `files` {#files}

Chaque entrée `file` du tableau se présente ainsi :

```js
{
  path: "./myfolder/*.js", // Obligatoire
  maxSize: "100kB",
  compression: "none",
}
```

- `path` est un motif glob correspondant à un fichier ou à un ensemble de fichiers, relatif au répertoire depuis lequel Bundlewatch s’exécute. Un chemin ne correspondant à aucun fichier fait échouer l’exécution.
- `maxSize` est facultatif. Il s’agit d’une chaîne avec une unité, comme `'100kB'`, ou d’un nombre d’octets, comme `102400`.
  - Les unités sont `B`, `KB`, `MB`, `GB`, `TB` et `PB`. Elles ne sont pas sensibles à la casse et utilisent des multiples de 1024 : `'100kB'` représente donc 102400 octets.
  - Une chaîne avec toute autre unité est interprétée comme un nombre d’octets : `'100k'` et `'100KiB'` signifient tous deux 100 octets.
  - Lorsque `maxSize` est absent, vaut `0` (un nombre ou une chaîne comme `'0'` ou `'0kB'`), ou ne commence pas par un nombre, le fichier n’a pas de limite de taille.
- `compression` est facultatif et prend par défaut la valeur de [`defaultCompression`](#defaultcompression). Cette chaîne doit être `gzip`, `brotli` ou `none`.

## `defaultCompression` {#defaultcompression}

La compression utilisée pour mesurer les fichiers qui ne définissent pas leur propre `compression` : `gzip` (par défaut), `brotli` ou `none`. Brotli utilise le module `zlib` intégré à Node.js ; aucun paquet supplémentaire n’est nécessaire.

## `normalizeFilenames` {#normalizefilenames}

Permet de supprimer des parties des noms de fichiers, par exemple lorsque ceux-ci contiennent des empreintes comme `main.abc134.js`.

Accepte une `RegExp` ou une `string` convertie en RegExp. Toutes les parties correspondant aux groupes de capture de l’expression régulière sont supprimées.

Exemples :

**Supprimer une empreinte :**
Repère les caractères entre un point et l’extension et les supprime.

RegExp : `/^.+?(\..+?)\.\w+$/`

Chaîne : `"^.+?(\\..+?)\\.\\w+$"`

## `ci` {#ci}

Cet objet active les [fonctionnalités principales de Bundlewatch](/fr/guide/using-bundlewatch) : les statuts GitHub, la comparaison aux tailles de référence et leur enregistrement. Chaque valeur est détectée dans votre environnement CI, sauf si vous la définissez.

| Option              | Valeur par défaut                                                                                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `githubAccessToken` | `BUNDLEWATCH_GITHUB_TOKEN`, puis `GITHUB_ACCESS_TOKEN`                                                                                                                                                                   |
| `repoOwner`         | Détecté, par exemple `facebook` dans github.com/facebook/react                                                                                                                                                           |
| `repoName`          | Détecté, par exemple `react` dans github.com/facebook/react                                                                                                                                                              |
| `repoCurrentBranch` | Détectée                                                                                                                                                                                                                 |
| `repoBranchBase`    | Détectée : la branche cible de la pull request ou, sur GitHub Actions, la branche par défaut du dépôt. Valeur de repli : `'master'`.                                                                                     |
| `commitSha`         | Détecté                                                                                                                                                                                                                  |
| `trackBranches`     | `['master', 'main', 'develop']`, plus la branche par défaut du dépôt lorsqu’elle peut être détectée                                                                                                                      |
| `isPullRequest`     | Détecté. Les builds de pull request sont comparés aux tailles de référence mais n’en enregistrent jamais ; consultez [les builds concernés](../guide/diffing-against-branches-other-than-master.md#pull-request-builds). |

Les builds d’une branche listée dans `trackBranches` enregistrent leurs résultats comme référence pour cette branche, sauf s’il s’agit de builds de pull request. Consultez [Branche de base et branches suivies](../guide/diffing-against-branches-other-than-master.md).

### Variables d’environnement {#environment-variables}

Bundlewatch lit les variables d’environnement suivantes. Les variables `CI_*` et `GIT_*` ont priorité sur les valeurs détectées auprès de votre plateforme de CI. Les valeurs de votre configuration ont priorité sur les deux.

| Variable                                               | Valeur définie                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BUNDLEWATCH_GITHUB_TOKEN`, puis `GITHUB_ACCESS_TOKEN` | `ci.githubAccessToken`                                                                                                                                                                                                                                                                          |
| `CI_REPO_OWNER`, `CI_REPO_NAME`                        | `ci.repoOwner`, `ci.repoName`                                                                                                                                                                                                                                                                   |
| `CI_REPO_SLUG` (`owner/name`)                          | `ci.repoOwner` et `ci.repoName`, si les variables ci-dessus ne sont pas définies                                                                                                                                                                                                                |
| `CI_COMMIT_SHA`, puis `GIT_COMMIT`                     | `ci.commitSha`                                                                                                                                                                                                                                                                                  |
| `CI_BRANCH`, puis `GIT_BRANCH`                         | `ci.repoCurrentBranch`                                                                                                                                                                                                                                                                          |
| `CI_BRANCH_BASE`                                       | `ci.repoBranchBase`                                                                                                                                                                                                                                                                             |
| `GITHUB_API_URL`                                       | L’URL de l’API GitHub sur laquelle les statuts de commit sont publiés. Par défaut, `https://api.github.com` ; GitHub Actions la définit automatiquement. GitHub Enterprise nécessite aussi votre propre service ; consultez [GitHub Enterprise](../guide/migrating-to-v1.md#github-enterprise). |
| `CI_EVENT`                                             | `pull_request` signale un [build de pull request](../guide/diffing-against-branches-other-than-master.md#pull-request-builds) lorsqu’aucune plateforme de CI prise en charge n’est détectée                                                                                                     |
| `GIT_URL`                                              | `ci.repoOwner` et `ci.repoName`, à partir d’une URL github.com, si rien d’autre ne les définit                                                                                                                                                                                                  |
| `DEBUG` (n’importe quelle valeur)                      | Active les journaux de débogage                                                                                                                                                                                                                                                                 |
| `NO_COLOR`, `FORCE_COLOR`                              | La sortie n’est colorée que dans un terminal. `NO_COLOR` désactive les couleurs ; `FORCE_COLOR` les active, par exemple dans une visionneuse de journaux CI compatible                                                                                                                          |

Bundlewatch détecte les autres valeurs sur GitHub Actions, GitLab CI, Travis CI, Drone, CircleCI et plusieurs autres plateformes de CI. Consultez les [plateformes de CI prises en charge](../guide/using-bundlewatch.md#supported-ci-providers).

## `bundlewatchServiceHost` {#bundlewatchservicehost}

Le service qui stocke les tailles de référence, crée les liens courts vers les résultats et génère les pages de résultats. La valeur par défaut est `'https://service.bundlewatch.io'`.

Vous pouvez la modifier pour utiliser [votre propre serveur](/fr/guide/using-a-custom-server.md). Définissez-la à `null` pour désactiver le service : Bundlewatch vérifie alors uniquement `maxSize`, sans comparer ni enregistrer de tailles de référence. Aucun lien vers les résultats n’est affiché, le statut GitHub n’a pas de lien details et l’[API Node.js](./nodejs.md#result) renvoie `url: undefined`.
