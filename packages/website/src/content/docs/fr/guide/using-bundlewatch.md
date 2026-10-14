---
title: Utiliser Bundlewatch
description: Exécutez Bundlewatch, configurez l’intégration continue et consultez les résultats.
---

<a id="using-bundlewatch"></a>

Exécutez Bundlewatch sur les fichiers générés par votre build pour vérifier leur taille :

```bash
npx bundlewatch --max-size 100kb ./webpack-build/*.js
```

Exemple de sortie :

```
Result breakdown at: https://service.bundlewatch.io/results?d=...

PASS ./webpack-build/app.js: 30.71KB < 100KB (gzip)
FAIL ./webpack-build/vendor.js: 198.6KB > 100KB (gzip)

bundlewatch FAIL
maxSize check failed
```

Cette commande affiche immédiatement les résultats dans votre terminal et renvoie le code de sortie 1 lorsqu’un contrôle échoue. Pour publier les résultats sur vos pull requests GitHub et les comparer à votre branche principale, exécutez-la en CI comme indiqué ci-dessous. Votre dépôt doit être hébergé sur GitHub ; la CI peut être exécutée ailleurs.

## Ajouter le statut du build aux pull requests GitHub {#adding-build-status-to-github-prs}

Bundlewatch peut publier son statut directement sur vos pull requests GitHub.

<div align="center">
    <img alt="Aperçu du statut du build" data-zoomable src="/build-status-preview.png" width="700px">
</div>

## GitHub Actions (recommandé) {#github-actions}

Sur GitHub Actions, Bundlewatch peut utiliser le jeton que GitHub crée pour chaque exécution du workflow : aucun jeton à générer ni à stocker. Ajoutez un workflow tel que `.github/workflows/bundlewatch.yml` :

```yaml
name: bundlewatch

on:
  push:
    branches: [main] # les branches que vous suivez
  pull_request:

permissions:
  contents: read
  statuses: write

jobs:
  bundlewatch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
      - run: npm ci
      - run: npm run build
      - run: npx bundlewatch
        env:
          BUNDLEWATCH_GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- `statuses: write` permet à Bundlewatch de publier le statut de commit `bundlewatch` avec le jeton du workflow. Conservez aussi `contents: read` : un bloc `permissions` supprime toutes les permissions qu’il ne liste pas.
- Le service accepte le jeton du workflow pour enregistrer les tailles de référence et créer des liens courts vers les résultats.
- Le déclencheur `push` ne liste que les branches suivies. Sinon, un push sur une branche ayant une pull request ouverte lancerait le workflow deux fois, et les deux exécutions publieraient le même statut sur un même commit.
- Le dépôt, le commit, la branche et la branche cible de la pull request sont détectés automatiquement, tout comme la branche par défaut du dépôt. Pour les pull requests, le statut est publié sur le dernier commit de la branche source.
- Les push sur une branche suivie (`master`, `main`, `develop` et votre branche par défaut) enregistrent leurs résultats comme nouvelle référence. Les pull requests sont comparées aux tailles de référence de leur branche cible. Consultez [Branche de base et branches suivies](./diffing-against-branches-other-than-master.md).

:::note[Pull requests provenant de forks]
GitHub fournit aux pull requests provenant de forks un jeton en lecture seule. Bundlewatch ne peut donc pas y publier de statut et journalise à la place une erreur `403` de GitHub. La tâche échoue tout de même lorsqu’un fichier dépasse son `maxSize`.
:::

## Autres plateformes de CI {#other-ci-providers}

Exécutez `npx bundlewatch` après l’étape de build, avec un jeton dans `BUNDLEWATCH_GITHUB_TOKEN`.

### Configurer l’authentification en CI {#setting-up-ci-authentication}

Bundlewatch a besoin d’un jeton GitHub dans `BUNDLEWATCH_GITHUB_TOKEN` pour publier le statut de votre pull request, comparer les tailles aux références et enregistrer ces dernières. Sans jeton, il vérifie uniquement `maxSize`. Obtenez votre jeton à cette adresse :

https://service.bundlewatch.io/setup-github

Créez-le avec un compte ayant le droit de pousser des commits vers le dépôt, afin que le service l’accepte pour enregistrer les tailles de référence et créer des liens courts vers les résultats. Stockez ce jeton dans une variable d’environnement secrète de votre CI et ne le commitez jamais.

### Plateformes de CI prises en charge {#supported-ci-providers}

Bundlewatch lit le dépôt, le commit et la branche dans les variables d’environnement propres à ces plateformes :

| Plateforme     | Branche de base des pull requests                                                               |
| -------------- | ----------------------------------------------------------------------------------------------- |
| GitHub Actions | Détectée. Les autres builds utilisent la branche par défaut du dépôt.                           |
| GitLab CI      | Détectée dans les pipelines de merge request                                                    |
| Travis CI      | Détectée                                                                                        |
| Drone          | Détectée                                                                                        |
| CircleCI       | Non disponible : définissez `CI_BRANCH_BASE`, sinon les pull requests sont comparées à `master` |

Il lit aussi les variables de Netlify, Cloudflare Pages, Buddy, Codefresh, Codeship et Wercker, mais certaines de ces plateformes ne fournissent pas le dépôt ou la branche cible. Définissez les variables ci-dessous pour toute valeur non détectée.

### Variables d’environnement CI requises {#required-ci-environment-variables}

Sur les autres plateformes de CI, ou pour les valeurs qui ne sont pas détectées, définissez ces variables d’environnement :

- `CI_REPO_OWNER` (par exemple `facebook` dans github.com/facebook/react)
- `CI_REPO_NAME` (par exemple `react` dans github.com/facebook/react)
- `CI_COMMIT_SHA`
- `CI_BRANCH`
- `CI_BRANCH_BASE`, la branche à utiliser pour la comparaison si ce n’est pas `master`

Consultez la [référence des variables d’environnement](../reference/configuration.md#environment-variables) pour toutes les variables lues par Bundlewatch.

## Statuts GitHub {#github-statuses}

Bundlewatch publie ses résultats sur le commit vérifié, sous forme de statuts de commit GitHub :

- **`bundlewatch`** : _pending_ (« Checking bundlewatch... ») pendant l’exécution, puis _success_ avec un résumé tel que `Everything is in check (+1.2KB, -0B, +0.4%)`, ou _failure_ avec `maxSize check failed`. Le résumé additionne les octets gagnés et perdus par rapport à la branche de base et indique la variation de taille totale. Son lien _details_ ouvre la [page de résultats](#results-links).
- **`bundlewatch <file path>`** : un statut _failure_ supplémentaire pour chaque fichier en échec, avec sa taille et sa limite. Les chemins longs sont réduits à leurs 37 derniers caractères.
- Au maximum cinq statuts par exécution : le statut `bundlewatch` et quatre fichiers. Les autres fichiers en échec sont uniquement listés dans le journal et sur la page de résultats.
- Si Bundlewatch rencontre une erreur inattendue après avoir publié _pending_, le statut `bundlewatch` devient _error_ (« Unable to analyze, check logs. »). Une configuration invalide est signalée avant toute publication de statut.

Les statuts nécessitent un jeton, le dépôt et le commit. Sans ces informations, Bundlewatch se contente d’afficher les résultats et de définir le code de sortie.

Pour bloquer les pull requests qui rendent un fichier trop volumineux, rendez le contrôle de statut `bundlewatch` obligatoire dans une règle de protection de branche ou un ensemble de règles de votre dépôt. Rendez uniquement `bundlewatch` obligatoire : les statuts par fichier n’apparaissent qu’en cas d’échec.

## Liens vers les résultats {#results-links}

Chaque exécution affiche un lien vers sa page de résultats (`Result breakdown at: …`) et l’utilise comme lien _details_ du statut GitHub.

- Lorsque le service accepte votre jeton en écriture, le lien est court, par exemple `https://service.bundlewatch.io/r/3fK9xQ2LmP7a`. Il accepte un jeton appartenant à un utilisateur ayant le droit de pousser vers le dépôt, ou le `GITHUB_TOKEN` du workflow sur GitHub Actions. Le service stocke les résultats et génère la page à partir de cette copie.
- Sinon, sans jeton ou avec un jeton que le service n’accepte pas en écriture, les résultats sont encodés dans le lien lui-même : `https://service.bundlewatch.io/results?d=…`. Pour les projets volumineux, ces liens peuvent devenir trop longs pour certains navigateurs et serveurs.
- Avec `bundlewatchServiceHost: null`, aucun lien n’est affiché et le statut GitHub n’a pas de lien _details_.
- Les liens `/results?d=…` existants continuent de fonctionner. Les anciens liens courts `ja2r7.app.goo.gl` fonctionnent tant que Google assure leur redirection.

## Consulter les résultats détaillés {#viewing-the-results-breakdown}

Une fois configuré, Bundlewatch publie le statut du build sur vos pull requests. Cliquez sur le lien _details_ pour consulter les résultats détaillés.

<div align="center">
    <img alt="Aperçu des résultats du build" data-zoomable src="/build-results-preview.png" width="700px">
</div>

## Résoudre les problèmes {#troubleshooting}

- `[ERROR] Unable to fetch fileDetails … code=404` : aucune taille de référence n’a encore été enregistrée pour la branche de base, par exemple lors de la première exécution. L’erreur disparaît lorsqu’un build de cette branche en a enregistré. Sinon, vérifiez que la branche de base est correcte (voir [Branche de base et branches suivies](./diffing-against-branches-other-than-master.md)) et qu’elle est suivie.
- `[ERROR] GitHubService HTTP_403 :: …` sur les pull requests provenant de forks : leur jeton ne permet pas de publier de statuts. Consultez [Pull requests provenant de forks](#github-actions).
- `[WARNING] Some CI configuration options were not found (…)` : il manque à Bundlewatch les valeurs listées ; il vérifie donc uniquement `maxSize`. C’est normal en local. En CI, définissez le jeton ou les [variables](#required-ci-environment-variables) indiquées.
- `[ERROR] There is no matching file for ./dist/*.js` : le chemin ne correspond à aucun fichier, ce qui fait échouer l’exécution. Vérifiez que le build a été lancé et que les chemins sont relatifs au répertoire depuis lequel vous exécutez Bundlewatch.
- `[WARNING] Max reported statuses reached …` : plus de quatre fichiers ont échoué. Consultez les [statuts GitHub](#github-statuses).
- Définissez la variable d’environnement `DEBUG` à n’importe quelle valeur pour journaliser les détails des requêtes en échec.

---

- [Utiliser un fichier de configuration](./using-a-config-file.md)
- [Branche de base et branches suivies](./diffing-against-branches-other-than-master.md)
- [Référence de configuration](../reference/configuration.md)
