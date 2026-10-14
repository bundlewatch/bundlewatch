---
layout: home
title: BundleWatch — Contrôle de la taille des bundles JavaScript en CI
titleTemplate: false
description: Vérifiez la taille des bundles JavaScript et CSS en CI, fixez des limites gzip ou Brotli et comparez les changements sur les pull requests GitHub. Gratuit et open source.

hero:
  image:
    src: /logo-large.svg
    alt: BundleWatch
  name: BundleWatch
  text: Repérez les bundles qui grossissent avant la fusion
  tagline: BundleWatch vérifie en CI que vos fichiers JavaScript et CSS générés respectent vos limites de taille, les compare à une branche de référence et affiche les changements sur les pull requests GitHub. Gratuit et open source.
  actions:
    - theme: brand
      text: Configurer BundleWatch
      link: /fr/guide/getting-started
    - theme: alt
      text: Qu’est-ce que BundleWatch ?
      link: /fr/guide/what-is-it
    - theme: alt
      text: Configurer avec un agent IA
      link: /fr/guide/getting-started#set-up-with-an-ai-agent

features:
  - icon: 🚫
    title: Limites de taille
    details: Définissez un maxSize par fichier, mesuré avec gzip, Brotli ou sans compression. Un fichier qui dépasse sa limite fait échouer le build.
    link: /fr/reference/configuration#files
    linkText: Définir des limites personnalisées
  - icon: 📊
    title: Page de résultats
    details: Consultez la taille de chaque fichier, sa limite et son écart avec la taille de référence.
    link: /fr/guide/using-bundlewatch#viewing-the-results-breakdown
    linkText: Consulter les résultats détaillés
  - icon: ✨
    title: Intégration continue
    details: Utilisez GitHub Actions avec son jeton intégré, ou exécutez BundleWatch sur GitLab CI, CircleCI, Travis CI, Drone et d’autres plateformes.
    link: /fr/guide/using-bundlewatch#github-actions
    linkText: Configurer l’intégration continue
  - icon: 🔀
    title: Branches
    details: Les pull requests sont comparées à leur branche cible lorsque votre CI la fournit. Vous choisissez les branches qui enregistrent une taille de référence.
    link: /fr/guide/diffing-against-branches-other-than-master
    linkText: Comparer les branches
  - icon: 🚨
    title: Statuts des pull requests
    details: Publie un statut de commit bundlewatch si le jeton CI peut écrire des statuts. Rendez ce contrôle obligatoire pour bloquer la fusion lorsqu’un fichier dépasse sa limite.
    link: /fr/guide/using-bundlewatch#github-statuses
    linkText: Comprendre les statuts GitHub
  - icon: 🗄️
    title: Votre propre serveur
    details: Hébergez vous-même le service qui stocke les tailles de référence, ou vérifiez les limites sans service.
    link: /fr/guide/using-a-custom-server
    linkText: Utiliser son propre serveur
---
