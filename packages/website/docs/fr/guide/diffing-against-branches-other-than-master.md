---
title: Branche de base et branches suivies
description: Comment Bundlewatch choisit la branche de comparaison et les branches qui enregistrent des tailles de référence.
---

# Branche de base et branches suivies {#base-and-tracked-branches}

Bundlewatch compare chaque build à une référence : les derniers résultats enregistrés pour la branche de base. Deux paramètres contrôlent ce comportement :

- La **branche de base** (`ci.repoBranchBase`) est la branche à laquelle le build actuel est comparé.
- Les **branches suivies** (`ci.trackBranches`) sont les branches dont les builds enregistrent de nouvelles tailles de référence.

## Branche de base {#base-branch}

Bundlewatch utilise la première valeur disponible dans cet ordre :

1. `ci.repoBranchBase` dans votre [configuration](../reference/configuration.md#ci).
2. La variable d’environnement `CI_BRANCH_BASE`.
3. La branche cible de la pull request, si votre CI la fournit. C’est le cas de GitHub Actions, GitLab, Travis et Drone.
4. Sur GitHub Actions, la branche par défaut du dépôt.
5. `master`.

Sur GitHub Actions, les pull requests sont donc comparées à leur branche cible et les autres builds à votre branche par défaut, sans configuration supplémentaire.

Sur les autres plateformes, les builds qui ne sont pas des pull requests sont comparés à `master`. Sur CircleCI, qui ne fournit pas la branche cible, les pull requests le sont aussi. Si votre branche principale porte un autre nom, définissez `CI_BRANCH_BASE` avec ce nom, par exemple `main`. Cette variable s’applique à tous les builds : sur GitLab, Travis et Drone, les pull requests qui ciblent une autre branche seront donc elles aussi comparées à celle-ci.

Pour comparer avec une autre branche (par exemple `develop`), définissez la variable d’environnement `CI_BRANCH_BASE`. Cela s’applique à tous les builds, y compris aux pull requests qui ciblent une autre branche.

::: info Information
Consultez les variables CI détectées automatiquement dans la [référence des variables d’environnement](../reference/configuration.md#environment-variables) et le [code source de la CLI](https://github.com/bundlewatch/bundlewatch/blob/main/packages/bundlewatch/src/ci.ts).
:::

## Branches suivies {#tracked-branches}

Par défaut, Bundlewatch suit `master`, `main` et `develop`, ainsi que la branche par défaut du dépôt lorsqu’elle peut être détectée (sur GitHub Actions). Un build enregistre ses résultats comme référence pour sa branche lorsque :

- sa branche est suivie ;
- il ne s’agit pas d’un build de pull request ;
- tous les fichiers ont été trouvés et ont pu être lus.

Pour suivre d’autres branches (par exemple `staging`), ajoutez l’option `trackBranches` à la configuration Bundlewatch dans `package.json`. Cette liste remplace celle par défaut : incluez donc toutes les branches à suivre.

```json
{
  "bundlewatch": {
    "files": [
      {
        "path": "myfolder/*.js",
        "maxSize": "100kB"
      }
    ],
    "ci": {
      "trackBranches": ["main", "develop", "staging"]
    }
  }
}
```

::: warning Modification en version 1.0
Avant la version 1.0, `trackBranches` était fusionné avec les valeurs par défaut index par index : `["main"]` suivait en réalité `["main", "develop"]`. Votre liste est désormais utilisée telle quelle.
:::

### Builds de pull request {#pull-request-builds}

Les builds de pull request sont comparés aux tailles de référence mais n’en enregistrent jamais, même lorsque la branche source porte le nom d’une branche suivie, comme le `master` d’un fork.

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

Les builds de branche continuent d’enregistrer les tailles, même si la branche a une pull request ouverte. Définissez `ci.isPullRequest` dans un [fichier de configuration JavaScript](./using-a-config-file.md) pour remplacer la détection automatique.

Consultez la [référence de configuration](../reference/configuration.md) pour les autres options.
