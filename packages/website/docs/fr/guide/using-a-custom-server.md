---
title: Utiliser son propre serveur
description: Exécutez votre propre service Bundlewatch et configurez votre projet pour l’utiliser.
---

# Utiliser son propre serveur avec Bundlewatch {#using-a-custom-server-with-bundlewatch}

Le service Bundlewatch stocke les tailles de référence utilisées pour comparer vos builds, crée des liens courts vers les résultats et génère les pages de résultats. Vous pouvez exécuter votre propre instance au lieu d’utiliser `https://service.bundlewatch.io`.

Le service se trouve dans le dépôt Bundlewatch, sous [`packages/service`](https://github.com/bundlewatch/bundlewatch/tree/main/packages/service). Il s’exécute sur AWS Lambda, stocke ses données dans DynamoDB et se déploie avec AWS SAM à partir de [`template.yaml`](https://github.com/bundlewatch/bundlewatch/blob/main/packages/service/template.yaml).

Déployez d’abord [`infra/bootstrap.yaml`](https://github.com/bundlewatch/bundlewatch/blob/main/packages/service/infra/bootstrap.yaml) dans le même compte AWS et la même région, en suivant la [configuration initiale](https://github.com/bundlewatch/bundlewatch/blob/main/packages/service/README.md#one-time-setup). Le modèle de l’application nécessite son export `bundlewatch-service-function-role-arn`. Définissez `GitHubRepository` avec le `owner/repo` de votre fork et donnez les mêmes valeurs à `StoreTableName` et `ResultsTableName` dans les deux stacks, afin que le rôle de la fonction puisse accéder à vos tables. Définissez le paramètre `ServiceStackName` de bootstrap avec le nom de la stack de l’application. Si un fournisseur OIDC GitHub existe déjà, indiquez `ExistingOidcProviderArn`.

Déployez ensuite le modèle de l’application en remplaçant ces paramètres :

- `PublicUrl` : l’URL de votre service. Sinon, les liens courts pointent vers service.bundlewatch.io, où ils n’existent pas.
- `GitHubClientId` et `GitHubClientSecret` : votre propre application OAuth GitHub, pour `/setup-github`. Son URL de rappel est `<votre service>/setup-github`.
- `ResultsTableName` : le nom de votre table de liens courts, identique à celui de bootstrap. Le modèle de l’application la crée.
- `StoreTableName` : votre table de tailles de référence. Le modèle ne la crée pas : réutilisez la table de votre déploiement 0.x ou créez-en une avec la clé de partition `repo` (S) et la clé de tri `repoBranch` (S).
- `GitHubApiUrl` : pour GitHub Enterprise, l’URL de votre API, par exemple `https://github.example.com/api/v3`. Consultez [GitHub Enterprise](./migrating-to-v1.md#github-enterprise).
- `WriteAuthorization` : `enforce` pour appliquer dès le départ le contrôle renforcé d’enregistrement des tailles de référence et de création des liens courts. La valeur par défaut, `report`, autorise les requêtes comme en 0.x et journalise uniquement les cas où le contrôle renforcé aurait pris une autre décision. Consultez les [modifications du service](./migrating-to-v1.md#service-changes).
- `ResultsRetentionDays` : le nombre de jours de conservation des liens courts. La valeur par défaut, `0`, les conserve indéfiniment.

Consultez [Running your own service](https://github.com/bundlewatch/bundlewatch/blob/main/packages/service/README.md#running-your-own-service) dans le README du service pour plus de détails.

Modifiez ensuite votre configuration Bundlewatch pour utiliser votre serveur :

```js
module.exports = {
  files: [
    {
      path: './dist/*.js',
      maxSize: '100kB',
    },
  ],
  bundlewatchServiceHost: 'https://my-bundlewatch-service.example.com',
}
```

Définissez `bundlewatchServiceHost` à `null` pour fonctionner sans service. Bundlewatch vérifie alors uniquement `maxSize`, sans comparer ni enregistrer de tailles de référence, et n’affiche aucun lien vers les résultats.

## Services antérieurs à la version 1.0 {#services-from-before-1-0}

Un service issu de l’ancien dépôt `bundlewatch/service` continue de fonctionner avec la CLI 1.0. Il ne prend pas en charge les liens courts : la CLI affiche donc des liens longs `/results?d=…`. Consultez [Migrer vers la version 1.0](./migrating-to-v1.md#service-changes) pour les modifications du service.

Consultez la [référence de configuration](../reference/configuration.md) pour les autres options.
