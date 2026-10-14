---
title: Migrer vers la version 1.0
description: Les changements à connaître pour passer de Bundlewatch 0.x à 1.0.
---

# Migrer vers la version 1.0 {#migrating-to-1-0}

La plupart des installations ne nécessitent aucune modification, mais les fichiers de configuration trouvés automatiquement peuvent désormais avoir priorité sur `package.json`. Consultez les [fichiers de configuration](#config-files) avant la mise à jour. Les options de la CLI, les variables d’environnement, les noms des statuts GitHub et les codes de sortie restent pris en charge. Cette page liste tous les changements de comportement. [CONTRACT.md](https://github.com/bundlewatch/bundlewatch/blob/main/CONTRACT.md) détaille ce qui reste compatible.

La version 1.0 est une nouvelle version majeure : les plages `^0.x` et `~0.x` ne l’incluent donc pas. Rien ne change tant que vous ne mettez pas à jour. La plupart des indications qui suivent s’appliquent aussi si vous venez de la version 0.3.x.

## Mettre à jour avec un agent IA {#upgrade-with-an-ai-agent}

Copiez ces instructions dans votre agent de programmation pour mettre à jour un projet :

```text:no-line-numbers
Mets à jour bundlewatch vers la version 1.0 dans ce dépôt.

Lis https://bundlewatch.io/guide/migrating-to-v1.md pour les changements et https://bundlewatch.io/llms-full.txt pour toute la documentation. Ensuite :

1. Mets à jour bundlewatch vers la dernière version 1.x avec le gestionnaire de paquets du projet. Node.js 22.17 ou une version ultérieure est nécessaire : mets à jour la version utilisée en CI si elle est plus ancienne.
2. Vérifie la configuration à l’aide de la section "Things to check" du guide de migration. Recherche les fichiers bundlewatch.config.* qui ont désormais priorité sur la clé bundlewatch de package.json et conserve les fichiers et limites vérifiés par chaque commande existante. Un "maxSize" numérique est désormais appliqué : si un fichier dépasse maintenant une limite qui n’était jamais vérifiée auparavant, ne relève pas la limite ; signale-le-moi.
3. Sur GitHub Actions, passe au GITHUB_TOKEN du workflow comme décrit dans le guide et supprime les contournements rendus inutiles par la version 1.0, comme CI_BRANCH_BASE défini uniquement pour éviter la comparaison avec master, ou CI_COMMIT_SHA défini avec le dernier commit de la branche source de la pull request.
4. Supprime la dépendance brotli-size si rien d’autre ne l’utilise.
5. Lance le build, puis exécute `npx bundlewatch` en conservant les motifs glob ou les arguments `--config <chemin>` existants. Vérifie que la commande contrôle les fichiers et limites prévus. Résume les modifications, les changements de comportement et ce qu’il me reste à faire, par exemple supprimer un secret de jeton devenu inutile.
```

## Prérequis {#requirements}

- **Node.js 22.17 ou une version ultérieure.** Node.js 16, 18 et 20 ne sont plus maintenus.
- Les identifiants Basic Auth dans les URL `bundlewatchServiceHost` (`https://user:pass@…`) continuent de fonctionner. Ils n’apparaissent plus dans le lien vers les résultats : la version 0.x les affichait dans le journal CI et les publiait dans le lien details du statut GitHub.
- **Chargement du paquet :**
  - `import bundlewatch, { STATUSES } from 'bundlewatch'` et `require('bundlewatch').default` / `.STATUSES` fonctionnent comme auparavant.
  - Le paquet fournit des versions ES module et CommonJS, avec des types TypeScript.
  - `require('bundlewatch/lib/app')` et l’exécution directe de `node_modules/bundlewatch/lib/bin/index.js` fonctionnent toujours.
  - Les autres imports internes dans `bundlewatch/lib/…` ne fonctionnent plus ; utilisez l’export principal du paquet.

## Points à vérifier {#things-to-check}

- Un fichier `bundlewatch.config.*` trouvé automatiquement a désormais priorité sur la clé `bundlewatch` de `package.json`. Vérifiez les fichiers et limites que chaque commande existante doit utiliser. Si un fichier est réservé à une commande `--config` distincte, donnez-lui un nom absent de la liste de recherche et adaptez cette commande pour qu’une exécution sans argument continue à utiliser `package.json`. Consultez les [fichiers de configuration](#config-files).
- **Un `maxSize` numérique est désormais appliqué.** Une valeur comme `102400` était auparavant ignorée sans avertissement et le contrôle réussissait toujours. Si un fichier dépasse une limite numérique, Bundlewatch le signale désormais et échoue. `0` signifie toujours qu’il n’y a aucune limite.
- **`trackBranches` et `files` remplacent les valeurs par défaut.** Avant la version 1.0, les tableaux de votre configuration étaient fusionnés avec les valeurs par défaut index par index : `trackBranches: ['main']` suivait en réalité `['main', 'develop']`. Votre liste est désormais utilisée telle quelle.
- **La branche de base sur GitHub Actions**, pour les builds qui ne sont pas des pull requests, comme les push, est désormais la branche par défaut du dépôt au lieu de `master` (voir ci-dessous). Si vous avez défini `CI_BRANCH_BASE` uniquement pour contourner la valeur par défaut `master`, vous pouvez la supprimer.
- **Les jetons d’utilisateurs sans droit de push** ne permettront plus d’enregistrer les tailles de référence lorsque service.bundlewatch.io appliquera son contrôle renforcé, quelle que soit la version de la CLI. Consultez les [modifications du service](#service-changes).

## Changements {#what-changed}

### Liens courts vers les résultats {#short-results-links}

- Lorsque le service accepte votre jeton en écriture, les liens vers les résultats ressemblent à `https://service.bundlewatch.io/r/<id>`. Il accepte un jeton appartenant à un utilisateur ayant le droit de push, ou le `GITHUB_TOKEN` du workflow sur GitHub Actions.
- Le service stocke les résultats et génère la page à partir de cette copie.
- Auparavant, les résultats étaient encodés dans l’URL puis raccourcis avec Firebase Dynamic Links, un produit que Google a arrêté. Les projets volumineux produisaient des URL refusées par les navigateurs et les serveurs (tickets [#404](https://github.com/bundlewatch/bundlewatch/issues/404) et [#456](https://github.com/bundlewatch/bundlewatch/issues/456)).
- Sinon, la CLI affiche le lien long `/results?d=…` comme auparavant. C’est le cas sans jeton, avec un jeton que le service n’accepte pas en écriture ou avec un [service auto-hébergé](./using-a-custom-server.md) antérieur à la version 1.0.
- Les liens `/results?d=…` existants continuent de fonctionner, y compris ceux avec un `maxSize` illimité, qui ne s’affichaient pas auparavant. Les anciens liens courts `ja2r7.app.goo.gl` fonctionnent tant que Google assure leur redirection.
- Chaque exécution avec un jeton effectue une requête supplémentaire au service pour créer le lien court. Elle abandonne après 5 secondes et utilise alors le lien long.

### `bundlewatchServiceHost: null` {#bundlewatchservicehost-null}

Lorsque le service est désactivé, aucun lien vers les résultats n’est affiché, le statut GitHub n’a pas de lien details et l’[API Node.js](../reference/nodejs.md#result) renvoie `url: undefined`. Avant la version 1.0, le lien pointait vers `null/results?d=…`.

### Branche de base sur GitHub Actions {#default-branch-detection-on-github-actions}

- Les builds de pull request étaient déjà comparés à la branche cible de la pull request.
- Les autres builds, comme les push, sont désormais comparés à la branche par défaut du dépôt au lieu de `master` (tickets [#423](https://github.com/bundlewatch/bundlewatch/issues/423) et [service #280](https://github.com/bundlewatch/service/issues/280)).
- Définir `CI_BRANCH_BASE` ou `ci.repoBranchBase` permet toujours de remplacer ce comportement. Consultez [Branche de base et branches suivies](./diffing-against-branches-other-than-master.md).

### Statuts des pull requests sur GitHub Actions {#pull-request-statuses-on-github-actions}

- Les statuts sont désormais publiés sur le dernier commit de la branche source de la pull request.
- Auparavant, ils étaient publiés sur `GITHUB_SHA`, un commit de fusion temporaire, et n’apparaissaient donc pas sur la pull request sauf si vous définissiez vous-même `CI_COMMIT_SHA`. Cette variable fonctionne toujours.

### Branches suivies {#tracked-branches}

- La valeur par défaut de `trackBranches` est désormais `['master', 'main', 'develop']`, plus la branche par défaut du dépôt sur GitHub Actions.
- Les tableaux `trackBranches` et `files` de votre configuration **remplacent** désormais les valeurs par défaut. Auparavant, ils étaient fusionnés index par index : `trackBranches: ['main']` suivait en réalité `['main', 'develop']`.

### Noms de branches contenant `/` {#branch-names-containing}

Sur les builds GitHub Actions déclenchés par un push, les noms de branches contenant `/` sont désormais lus correctement. Auparavant, un push sur `feat/foo` était interprété comme `feat` (ticket [#422](https://github.com/bundlewatch/bundlewatch/issues/422)) ; les builds de pull request fonctionnaient déjà correctement.

### Les builds de pull request n’enregistrent plus de tailles de référence {#pull-request-builds-no-longer-save-baselines}

Les builds de pull request sont comparés aux tailles de référence mais n’en enregistrent plus. Auparavant, une pull request dont la branche source portait le nom d’une branche suivie, comme le `master` d’un fork, remplaçait les tailles de référence du véritable `master` par ses propres tailles.

Seuls les builds exécutés par la plateforme de CI spécifiquement pour une pull request sont concernés :

| Plateforme                  | Builds considérés comme des builds de pull request |
| --------------------------- | -------------------------------------------------- |
| GitHub Actions              | Événements `pull_request` et `pull_request_target` |
| GitLab                      | Pipelines de merge request                         |
| Travis                      | Builds de pull request                             |
| Drone                       | Événements `pull_request`                          |
| Netlify                     | Aperçus de déploiement                             |
| CircleCI                    | Builds de pull request provenant de forks          |
| Variables génériques `CI_*` | `CI_EVENT=pull_request`                            |

Les builds de branche continuent d’enregistrer les tailles, même si la branche a une pull request ouverte. Définissez `ci.isPullRequest` dans un fichier de configuration JavaScript pour remplacer la détection automatique.

### Exécutions avec des fichiers manquants {#runs-with-missing-files}

- Une exécution dans laquelle certains fichiers sont absents ou illisibles n’envoie plus de tailles de référence au service.
- Le service refusait déjà ces données, donc rien n’était enregistré auparavant non plus. La CLI journalise désormais la raison au lieu de signaler une requête en échec.

### `maxSize` numérique {#numeric-maxsize}

Un `maxSize` numérique comme `102400` est désormais appliqué. Auparavant, il était ignoré sans avertissement et le contrôle réussissait toujours. Si votre bundle dépasse une limite numérique, Bundlewatch le signale désormais.

`0`, sous forme de nombre ou de chaîne comme `'0'` ou `'0kB'`, signifie toujours qu’il n’y a aucune limite.

### Fichiers vides avec `compression: 'none'` {#empty-files}

Avec `compression: 'none'`, les fichiers vides sont mesurés à 0 B. Avant la version 1.0, ils étaient signalés par « Could not read file », ce qui faisait échouer l’exécution. Avec gzip et brotli, les fichiers vides étaient déjà mesurés (20 B et 1 B).

### Fichiers nommés comme des propriétés d’objet JavaScript {#files-named-after-javascript-object-properties}

Les fichiers supprimés qui figuraient dans les tailles de référence sous le nom `constructor`, `toString` ou celui d’une autre propriété d’`Object.prototype` apparaissent désormais comme supprimés. Auparavant, ils apparaissaient à tort comme des fichiers valides sans taille. Les nouveaux fichiers portant ces noms reçoivent aussi une taille de référence correcte de zéro octet au lieu d’une taille indéfinie. Les totaux de variation de taille reflètent désormais les deux cas.

Un fichier dont le chemin, après `normalizeFilenames`, est exactement `__proto__` est désormais mesuré et vérifié. Avant la version 1.0, il était ignoré sans avertissement : l’exécution réussissait même s’il dépassait son `maxSize` ou était absent.

### Variables de proxy {#proxy-variables}

bundlewatch ne lit plus `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY` ni les variables similaires. La version 0.x les utilisait uniquement par l’intermédiaire de sa bibliothèque HTTP et ne les avait jamais documentées. Derrière un proxy bloquant les connexions directes, les comparaisons et l’enregistrement des tailles de référence échouent et sont journalisés. Si un jeton GitHub est défini, l’exécution échoue avec le code de sortie 1, car elle ne peut pas publier son statut GitHub : comme en 0.x, Bundlewatch s’arrête lorsque GitHub est injoignable. Autorisez les connexions directes à `api.github.com` et au service Bundlewatch, ou supprimez le jeton dans cet environnement pour exécuter uniquement le contrôle de taille.

### Brotli {#brotli}

La compression Brotli fonctionne sans installer `brotli-size`, que vous pouvez supprimer. Le module `zlib` intégré à Node.js produit des tailles identiques.

### Fichiers de configuration {#config-files}

- Bundlewatch recherche désormais les fichiers `bundlewatch.config.*` avant de se rabattre sur `package.json`. Il cherche depuis le répertoire courant jusqu’au répertoire du `package.json` le plus proche inclus, en vérifiant `.mjs`, `.js`, `.cjs`, `.mts`, `.ts`, `.cts` et `.json` dans cet ordre dans chaque répertoire. Le premier fichier est utilisé ; sans paquet, la recherche continue jusqu’à la racine du système de fichiers. Une configuration invalide fait échouer l’exécution sans utiliser une autre source. `--config` remplace la recherche automatique.
- `--config` accepte les chemins absolus.
- Les fichiers `.mjs` et les configurations n’ayant que des exports nommés sont chargés avec `import()`.
- Les fichiers `.ts`, `.mts` et `.cts` fonctionnent sur les versions de Node.js qui exécutent TypeScript nativement (22.18 et ultérieures).

Consultez [Utiliser un fichier de configuration](./using-a-config-file.md).

### Exécution en dehors d’un paquet {#running-outside-a-package}

Exécuter Bundlewatch dans un répertoire sans `package.json` ne provoque plus de plantage (ticket [#434](https://github.com/bundlewatch/bundlewatch/issues/434)).

### `--version` {#version}

`-V` et `--version` affichent la version. Les autres options fonctionnent comme auparavant, y compris `--max-size` sans valeur pour indiquer l’absence de limite. Consultez la [ligne de commande](../reference/cli.md).

### CI générique sans dépôt {#generic-ci-without-a-repository}

Avec `CI` défini mais sans `CI_REPO_OWNER` ni `CI_REPO_NAME`, la version 0.x utilisait le dépôt `undefined/undefined`. La version 1.0 utilise `GIT_URL` en repli : les statuts et les tailles de référence peuvent donc commencer à fonctionner dans ces configurations.

### GitHub Enterprise {#github-enterprise}

- Les statuts de commit sont envoyés à l’API GitHub indiquée par `GITHUB_API_URL` lorsque cette variable est définie ; GitHub Actions sur GitHub Enterprise Server la définit automatiquement.
- `service.bundlewatch.io` accepte uniquement les jetons github.com. Avec GitHub Enterprise, il ne peut ni comparer les tailles aux références, ni enregistrer ces dernières, ni créer de liens courts : chaque exécution journalise des erreurs `401` et affiche un lien long vers les résultats.
- Pour les comparaisons, [hébergez votre propre service](./using-a-custom-server.md) en le configurant avec l’URL de votre API GitHub.
- Sinon, définissez `bundlewatchServiceHost: null` pour que votre jeton et les noms de vos fichiers ne soient pas envoyés à service.bundlewatch.io.

### Mise à jour depuis 0.3.x avec `normalizeFilenames` {#upgrading-from-0-3-x-with-normalizefilenames}

La version 0.3.x enregistrait sous un nom vide tous les fichiers ne correspondant pas au motif. Lors de la première exécution en 1.0, ces fichiers apparaissent comme nouveaux et une entrée au nom vide apparaît comme supprimée, jusqu’à ce qu’une branche suivie enregistre de nouvelles tailles de référence.

## Modifications du service (service.bundlewatch.io) {#service-changes}

<!-- Ancienne ancre de cette section, conservée pour les liens existants. -->

<a id="running-your-own-service"></a>

Ces modifications s’appliquent à toutes les versions de la CLI, y compris 0.x.

- **Nouveaux endpoints pour les liens courts :**
  - `POST /results` crée un lien court et nécessite un accès en écriture (voir ci-dessous).
  - `GET /r/{id}` affiche la page correspondante.
- **Autorisation renforcée pour enregistrer les tailles de référence et créer des liens courts, déployée d’abord en mode journalisation :**
  - Pour enregistrer des données sur un dépôt public, le jeton doit appartenir à un utilisateur ayant le droit de push, ou être un jeton d’installation pour ce dépôt, comme le `GITHUB_TOKEN` de ses propres workflows.
  - Auparavant, n’importe quel jeton GitHub pouvait remplacer les tailles de référence d’un dépôt public.
  - Dans un premier temps, le service journalise uniquement les requêtes que la nouvelle règle refuserait. Avant son application, remplacez les jetons d’utilisateurs sans droit de push, comme celui d’une personne ayant quitté le projet : créez un nouveau jeton sur [`/setup-github`](https://service.bundlewatch.io/setup-github) avec un utilisateur ayant ce droit, ou [utilisez `GITHUB_TOKEN`](#using-the-github-actions-token) sur GitHub Actions. En attendant, la CLI fonctionne comme auparavant.
- **Codes d’erreur :**
  - Les liens de résultats mal formés renvoient `400` au lieu de `500`.
  - Les erreurs de communication avec GitHub renvoient `503` au lieu de `401` ou `500`.
  - Les tailles de référence trop volumineuses pour être stockées renvoient `413` au lieu de `500`.
- **Acceptés en 0.x, désormais refusés :** les tailles de référence et les liens de résultats dont le `maxSize` est une chaîne de taille comme `"100KB"`. Les CLI 0.x envoyaient déjà un `maxSize` numérique, même lorsque la configuration utilisait une chaîne.
- **`/setup-github`** vérifie désormais un `state` OAuth. Une autorisation commencée dans un autre navigateur ou plus de 10 minutes auparavant doit être relancée.
- **Le déploiement** utilise désormais AWS SAM et GitHub Actions avec OIDC, à la place de Serverless Framework v3 et CircleCI. Consultez [`packages/service/README.md`](https://github.com/bundlewatch/bundlewatch/blob/main/packages/service/README.md).

## Utiliser le jeton GitHub Actions {#using-the-github-actions-token}

Si vous exécutez Bundlewatch sur GitHub Actions avec un jeton obtenu sur `service.bundlewatch.io/setup-github`, vous pouvez passer au jeton que GitHub crée pour chaque exécution du workflow : accordez `statuses: write` au workflow, conservez `contents: read` et passez `secrets.GITHUB_TOKEN` à `BUNDLEWATCH_GITHUB_TOKEN`. Le service accepte ce jeton pour enregistrer les tailles de référence et créer des liens courts. Consultez [GitHub Actions](./using-bundlewatch.md#github-actions) pour un workflow complet.
