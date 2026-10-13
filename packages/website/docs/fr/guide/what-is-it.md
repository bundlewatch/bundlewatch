---
title: Qu’est-ce que Bundlewatch ?
description: Découvrez Bundlewatch, son fonctionnement et son utilité pour maîtriser la taille de vos bundles.
---

# Qu’est-ce que Bundlewatch ? {#what-is-bundlewatch}

Bundlewatch vérifie la taille des fichiers générés pour le navigateur, afin qu’ils ne grossissent pas sans que personne ne le remarque. Vous indiquez les fichiers à surveiller et leur taille maximale. Bundlewatch les mesure après chaque build, fait échouer le build si l’un d’eux est trop volumineux et indique sur chaque pull request la variation de taille de chaque fichier.

## Pourquoi utiliser Bundlewatch ? {#why-use-bundlewatch}

Une augmentation soudaine de taille signale souvent un problème :

- une nouvelle dépendance qui alourdit votre bundle ;
- l’importation accidentelle d’une bibliothèque entière ;
- une étape de minification ou de compression manquante ;
- une croissance progressive qui passe inaperçue, pull request après pull request.

## Fonctionnement {#how-it-works}

1. **Mesurer.** Après le build, Bundlewatch mesure chaque fichier tel que le navigateur le télécharge : compressé avec gzip par défaut, avec brotli, ou sans compression.
2. **Vérifier.** Un fichier dépassant son `maxSize`, ou un chemin ne correspondant à aucun fichier, fait échouer l’exécution. La commande renvoie le code de sortie 1, ce qui fait échouer votre tâche de CI.
3. **Comparer.** En CI, Bundlewatch récupère auprès du service Bundlewatch les tailles enregistrées pour la branche de base, généralement celle dans laquelle vous fusionnez vos modifications. Ces _tailles de référence_ permettent de voir la variation de taille de chaque fichier.
4. **Publier.** Le résultat apparaît sous la forme d’un statut `bundlewatch` sur le commit, avec un lien vers une page détaillant les résultats fichier par fichier.
5. **Enregistrer.** Les builds des branches suivies, comme `main`, enregistrent leurs tailles comme nouvelle référence pour les prochaines pull requests.

Le service `service.bundlewatch.io` est gratuit. Bundlewatch lui transmet les noms et les tailles des fichiers, le dépôt, la branche et le commit, ainsi que votre jeton GitHub pour vérifier vos droits d’accès. Il ne transmet jamais les fichiers eux-mêmes. Vous pouvez aussi [héberger votre propre service](./using-a-custom-server.md), ou vous en passer : sans service, Bundlewatch vérifie toujours `maxSize`.

## Bloquer les fusions {#blocking-merges}

Pour empêcher la fusion des pull requests qui rendent un fichier trop volumineux, rendez le contrôle de statut `bundlewatch` obligatoire dans les règles de protection des branches ou les ensembles de règles de votre dépôt. Consultez les [statuts GitHub](./using-bundlewatch.md#github-statuses).

---

Prêt à essayer ? Consultez les [premiers pas](./getting-started.md), ou laissez votre agent de programmation [s’occuper de la configuration](./getting-started.md#set-up-with-an-ai-agent).
