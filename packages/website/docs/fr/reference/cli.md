---
title: Ligne de commande
description: Les options de la CLI Bundlewatch, les sources de configuration et les codes de sortie.
---

# Ligne de commande {#command-line}

```
Usage: bundlewatch [options] <filePathGlobs ...>
```

Exécutez-la avec `npx bundlewatch` (ou l’équivalent de votre gestionnaire de paquets) après l’[installation](../guide/getting-started.md#installation).

## Options {#options}

| Option                        | Description                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--config [configFilePath]`   | Fichier dont lire la configuration : `.json`, `.js`, `.cjs` ou `.mjs`, ainsi que `.ts`, `.mts` ou `.cts` sur Node.js 22.18 et les versions ultérieures. Toute autre extension est lue comme du JSON. Les chemins relatifs sont résolus depuis le répertoire courant. Consultez [Utiliser un fichier de configuration](../guide/using-a-config-file.md). |
| `--max-size [maxSize]`        | Taille maximale des fichiers indiqués en ligne de commande (par exemple `3kb`). Consultez [`maxSize`](./configuration.md#files) pour les unités. Sans valeur, aucune limite.                                                                                                                                                                            |
| `--compression [compression]` | Algorithme de compression : `gzip` (par défaut), `brotli` ou `none`                                                                                                                                                                                                                                                                                     |
| `--normalize [regex]`         | Normalise les noms de fichiers avec une expression régulière ; les parties capturées sont supprimées. Consultez [`normalizeFilenames`](./configuration.md#normalizefilenames).                                                                                                                                                                          |
| `-V, --version`               | Affiche le numéro de version                                                                                                                                                                                                                                                                                                                            |
| `-h, --help`                  | Affiche l’aide                                                                                                                                                                                                                                                                                                                                          |

`--max-size`, `--compression` et `--normalize` ne s’appliquent qu’aux motifs glob fournis en ligne de commande. Avec un fichier trouvé automatiquement, `--config` ou la clé `bundlewatch` de package.json, ces options sont ignorées sans avertissement.

Les options fonctionnent comme en 0.x, qui utilisait commander : une option prend l’argument suivant comme valeur, sauf s’il commence par `-`. `--max-size=3kb` fonctionne aussi. Un `--max-size` sans valeur, par exemple en fin de commande, signifie qu’il n’y a aucune limite. Les options inconnues affichent une erreur et renvoient le code de sortie 1.

## Exemples {#examples}

Rechercher automatiquement un fichier de configuration (recommandé) :

```bash
npx bundlewatch
```

Si aucun fichier de configuration n’est trouvé, la même commande lit la clé `bundlewatch` de `package.json`. Pour utiliser un fichier précis :

```bash
npx bundlewatch --config internals/bundlewatch.config.mjs
```

Utiliser la ligne de commande :

```bash
bundlewatch --max-size 100KB ./src/*.js ./lib/*.js
```

## Sources de configuration {#where-configuration-comes-from}

Bundlewatch utilise la première source disponible dans cet ordre :

1. Les motifs glob de fichiers en ligne de commande, avec `--max-size`, `--compression` et `--normalize`.
2. Le fichier indiqué par `--config`.
3. Un fichier `bundlewatch.config.*` trouvé automatiquement. La recherche part du répertoire courant et inclut ses parents jusqu’au `package.json` le plus proche ; consultez les [noms et limites de recherche](../guide/using-a-config-file.md#config-discovery).
4. La clé `bundlewatch` du `package.json` le plus proche. Il peut s’agir d’un objet de configuration ou d’un tableau utilisé comme `files`.

Une option `--config` ou une configuration `package.json` inutilisée déclenche un avertissement. La recherche automatique n’a pas lieu si des motifs glob ou `--config` sont fournis. Un fichier sélectionné impossible à charger ou une configuration invalide fait échouer l’exécution sans utiliser une autre source. S’il n’en trouve aucune, il affiche « Configuration missing » et renvoie le code de sortie 1.

## Codes de sortie {#exit-codes}

| Code | Situation                                                                                                                                                |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0`  | Tous les fichiers passent les contrôles (`bundlewatch PASS`).                                                                                            |
| `1`  | Un fichier échoue au contrôle (`bundlewatch FAIL`), la configuration est invalide ou absente, une option est inconnue ou une erreur inattendue survient. |

Un fichier échoue lorsqu’il dépasse son `maxSize` ou qu’un chemin ne correspond à aucun fichier. Les erreurs du service Bundlewatch et les réponses d’erreur de GitHub sont journalisées sans modifier le code de sortie. Si GitHub est totalement injoignable alors qu’un jeton est défini, l’exécution échoue avec le code 1, comme en 0.x.
