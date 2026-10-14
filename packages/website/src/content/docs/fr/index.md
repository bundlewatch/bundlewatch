---
title: BundleWatch
description: Gardez un œil sur la taille de vos bundles
template: splash
editUrl: false
hero:
  title: <span class="name">BundleWatch</span> <span class="text">Gardez un œil sur la taille de vos bundles</span>
  tagline: Repérez les fichiers dont la taille augmente fortement. Évitez de servir des fichiers trop volumineux à vos utilisateurs. Faites échouer les builds lorsque les fichiers deviennent trop gros.
  image:
    alt: BundleWatch
    file: ../../../assets/logo-large.svg
  actions:
    - text: Qu’est-ce que BundleWatch ?
      link: /fr/guide/what-is-it/
      variant: primary
      icon: right-arrow
    - text: Premiers pas
      link: /fr/guide/getting-started/
      variant: secondary
    - text: Configurer avec un agent IA
      link: /fr/guide/getting-started/#set-up-with-an-ai-agent
      variant: secondary
features:
  - icon: 🚫
    details: Définissez des limites pour ne jamais servir par inadvertance des fichiers trop volumineux à vos utilisateurs.
    link: /fr/reference/configuration/#files
    linkText: Définir des limites personnalisées
  - icon: 📊
    details: Consultez une analyse claire et détaillée de vos bundles pour repérer facilement les problèmes et les améliorations.
    link: /fr/guide/using-bundlewatch/#viewing-the-results-breakdown
    linkText: Consulter les résultats détaillés
  - icon: ✨
    details: Fonctionne sur GitHub Actions sans jeton à gérer, ainsi que sur GitLab CI, CircleCI, Travis CI, Drone et d’autres plateformes.
    link: /fr/guide/using-bundlewatch/#github-actions
    linkText: Configurer l’intégration continue
  - icon: 🔀
    details: Comparez la taille de vos bundles entre toutes vos branches, pas seulement main, pour suivre tous vos développements.
    link: /fr/guide/diffing-against-branches-other-than-master/
    linkText: Comparer les branches
  - icon: 🚨
    details: Publie un statut sur chaque pull request et bloque la fusion lorsqu’un fichier devient trop volumineux.
    link: /fr/guide/using-bundlewatch/#github-statuses
    linkText: Comprendre les statuts GitHub
  - icon: 🗄️
    details: Utilisez votre propre serveur pour stocker et récupérer les données de vos bundles et en garder le contrôle.
    link: /fr/guide/using-a-custom-server/
    linkText: Utiliser son propre serveur
---
