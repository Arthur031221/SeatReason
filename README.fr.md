[Démo en ligne](https://arthur031221.github.io/SeatReason/) | [English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Português (Brasil)](README.pt-BR.md)

<img src="assets/logo.svg" width="56" height="56" alt="SeatReason logo">

# SeatReason

Des règles de placement qui disent pourquoi elles ne peuvent pas toutes tenir.

Médiane de 18 à 32 ms, et 0,38 s au pire, pour trouver un conflit minimal qui demande le solveur SAT. Les aperçus de réparation des mêmes cas prennent une médiane de 0,26 à 0,49 s. 51 cas, cinq exécutions, méthode dans [Mesures](#mesures).

Les demandes d'un enseignant peuvent être impossibles ensemble, et la plupart des outils de placement répondent seulement "pas de solution". SeatReason désigne les quelques demandes qui s'opposent, vous laisse essayer d'abandonner chacune, et vérifie tout le reste avant que le plan change.

![Un conflit dans la classe d'exemple, un plan réparé avec les places modifiées entourées, puis un déplacement manuel qui brise une place fixe et qu'on annule](assets/demo.gif)

C'est une application web statique. Les noms restent dans le navigateur et rien n'est envoyé.

## Avant et après

L'exemple "Premier rang trop étroit" : 24 élèves, une salle de 5 sur 6 avec deux tables manquantes, 10 demandes.

|                    | Avant                                                    | Après avoir choisi "Noor s'assoit au premier rang"          |
| ------------------ | -------------------------------------------------------- | ----------------------------------------------------------- |
| Résultat           | "Ces 6 demandes ne peuvent pas être respectées ensemble" | "Le plan peut respecter toutes les demandes (9 activées)"   |
| Ce que dit la page | Les 6 demandes, numérotées, en langage simple            | Les places qui bougent sont entourées dans la salle         |
| Places modifiées   | Aucune                                                   | 4                                                           |
| Plan remplacé      | Non                                                      | Seulement après "Utiliser ce plan et désactiver la demande" |

## Comment un plan est fait

1. **Décrire la classe.** Collez des noms ou une colonne CSV, jusqu'à 40 élèves. Les noms identiques sont distingués par des ids internes. Réglez le nombre de rangs et de places par rang, puis marquez les tables absentes. La salle compte au plus 48 places.
2. **Ajouter des demandes.** Il y en a quatre sortes : une place fixe, une place dans les N premiers rangs, deux élèves qui ne doivent pas être voisins et deux élèves qui doivent l'être (à gauche, à droite, devant ou derrière). Chacune peut être désactivée sans être supprimée.
3. **Lire le verdict.** Peu après chaque changement, la vérification se lance seule dans un worker, avec un bouton d'annulation. Elle se termine par résolu, impossible ou non concluant. Impossible vient avec un ensemble minimal de demandes : désactivez n'importe laquelle et le reste tient. SeatReason ne le dit qu'après avoir testé chaque demande de l'ensemble.
4. **Essayer une réparation.** Chaque demande du conflit dont le retrait permet au reste de tenir a un bouton "Voir ce plan". L'aperçu replanifie sans cette demande et garde les places actuelles quand il le peut. Les places modifiées sont entourées. Le plan n'est remplacé que si vous appuyez sur le bouton qui le dit.
5. **Ajuster et garder.** Faites glisser des élèves ou cliquez sur deux places pour les échanger, et fixez un élève à sa place actuelle d'un seul bouton. Un déplacement qui brise une demande s'affiche avec sa raison et peut être annulé. La classe est enregistrée dans le navigateur, exportée dans un fichier `.seatreason.json` et imprimée comme plan avec un résumé des demandes.

## Fichiers

| Chemin                        | Rôle                                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| `src/core/sat.ts`             | Solveur SAT à apprentissage de conflits avec hypothèses, budget de conflits et rappel d'arrêt |
| `src/core/encode.ts`          | Transforme les règles de placement en clauses, un sélecteur par demande                       |
| `src/core/hall.ts`            | Appariement et violateurs de Hall pour les places fixes et les premiers rangs                 |
| `src/core/analyze.ts`         | Planification, extraction du conflit minimal et aperçus de réparation                         |
| `src/core/validate.ts`        | Vérificateur de plan indépendant, utilisé par l'application et les tests                      |
| `src/core/oracle.ts`          | Recherche exhaustive utilisée seulement par les tests                                         |
| `src/core/project.ts`         | Modèle de projet, actions d'historique, import et export de fichiers                          |
| `src/worker.ts`, `src/hooks/` | Worker, annulation et limite de temps, historique d'annulation                                |
| `src/ui/`, `src/style.css`    | Interface, plan de la salle, feuille d'impression, thèmes clair et sombre                     |
| `src/locales/`                | Neuf fichiers de langue et un test vérifiant qu'ils ont les mêmes clés                        |
| `tests/e2e/`                  | Tests de navigateur sur l'application compilée                                                |
| `scripts/`                    | Mesures de performance, enregistrement de la démo, rendu de la carte sociale                  |
| `docs/`                       | Notes d'installation, d'usage, de configuration et d'architecture                             |

## Installation

```sh
git clone https://github.com/Arthur031221/SeatReason && cd SeatReason && npm ci && npm start
```

La page est ensuite à l'adresse `http://127.0.0.1:4173/`.

<details>
<summary>Linux et macOS</summary>

Installez Node.js 22.12 ou plus récent, puis lancez la commande ci-dessus dans un terminal.

</details>

<details>
<summary>Windows</summary>

Installez Node.js 22.12 ou plus récent. Dans PowerShell, lancez ces commandes l'une après l'autre :

```powershell
git clone https://github.com/Arthur031221/SeatReason
cd SeatReason
npm ci
npm start
```

</details>

<details>
<summary>N'importe quel hébergement statique</summary>

Lancez `npm ci && npm run build` et téléversez le dossier `dist/`. Tous les chemins sont relatifs, donc cela fonctionne depuis un sous-dossier. Il n'y a pas de code serveur ni de requête réseau après le chargement de la page.

</details>

## Utilisation

La page s'ouvre sur l'exemple "Premier rang trop étroit" : la liste du conflit est déjà là, avec une réparation sous chaque demande. Les autres exemples sont dans Classe d'exemple.

Pour utiliser votre propre classe :

1. Collez la liste et appuyez sur "Mettre à jour la classe".
2. Réglez la taille de la salle et marquez les tables absentes.
3. Ajoutez des demandes. La vérification redémarre toute seule.
4. Sous une demande en conflit, appuyez sur "Voir ce plan", puis sur "Utiliser ce plan et désactiver la demande" si vous l'acceptez.
5. Appuyez sur "Imprimer" pour le plan et le résumé des demandes, ou sur "Enregistrer le fichier" pour une sauvegarde.

Les réglages, les fichiers et les limites sont dans [docs/config.md](docs/config.md). Le détail des étapes est dans [docs/usage.md](docs/usage.md).

## Mesures

`npm run bench` exécute deux ensembles de classes aléatoires avec des graines fixes, puis un cas fixe. Les deux ensembles sont dans le tableau.

- **Classes aléatoires.** 40 classes de 40 élèves dans une salle de 6 sur 8, chacune avec 12 à 31 demandes aléatoires des trois sortes. Chaque cas impossible de cet ensemble se trouve par le seul appariement, car les places fixes et les rangs avant aléatoires se heurtent bien avant que les paires à séparer comptent.
- **Paires à séparer.** 80 classes où 8 élèves doivent occuper les 8 places de devant, avec 14 à 26 paires aléatoires à séparer. Les places fixes et les rangs avant seuls peuvent toujours être respectés, donc chaque conflit de cet ensemble vient du solveur SAT.

| Ensemble           | Résultat                            | Cas | Médiane      | Le plus lent   |
| ------------------ | ----------------------------------- | --- | ------------ | -------------- |
| Classes aléatoires | Résolu                              | 19  | 8 à 16 ms    | 17 à 44 ms     |
| Classes aléatoires | Impossible, ensemble minimal trouvé | 21  | 8 à 22 ms    | 20 à 45 ms     |
| Classes aléatoires | Aperçus de réparation de ces cas    | 21  | 20 à 43 ms   | 26 à 71 ms     |
| Paires à séparer   | Résolu                              | 29  | 3 à 5 ms     | 10 à 22 ms     |
| Paires à séparer   | Impossible, ensemble minimal trouvé | 51  | 18 à 32 ms   | 327 à 382 ms   |
| Paires à séparer   | Aperçus de réparation de ces cas    | 51  | 262 à 492 ms | 1234 à 2133 ms |

Chaque cellule est la plage de cinq exécutions de `npm run bench`, sur un AMD Ryzen 5 7500F avec Node 24.21, un seul thread, en ligne de commande sans navigateur. La machine faisait d'autres travaux pendant ce temps, d'où les écarts. Les cas sont les mêmes à chaque fois. Ce sont des classes aléatoires. Une vraie classe avec beaucoup de paires à séparer peut être plus difficile. La mesure autorise 20 secondes pour planifier et ne limite pas les aperçus, alors que la page partage 8 secondes. Le cas le plus lent ici a pris 2,1 secondes.

La mesure se termine par un cas fixe : neuf élèves qui veulent tous les huit places de devant. L'appariement le tranche en 2 à 5 ms.

Les tests comparent le solveur à une recherche exhaustive sur de petites salles. Ils vérifient aussi que chaque conflit annoncé est minimal et que chaque plan réparé passe le vérificateur indépendant.

## Limites

- Un grand nombre de paires à séparer entre elles dans une salle étroite peut être trop difficile pour la limite de 8 secondes. La page affiche alors "non concluant" et ne prétend pas que les règles sont impossibles. Neuf élèves à séparer tous les uns des autres dans une salle de 4 sur 4 en sont un exemple.
- Séparer veut dire voisins orthogonaux. Les places en diagonale sont permises. Placer ensemble demande le même genre de voisin, une place en diagonale ne compte donc pas.
- L'aperçu de réparation essaie une demande à la fois. Il ne cherche pas la réparation qui change le moins de places.
- Il n'existe que quatre sortes de demandes. Il n'y a ni équilibre filles-garçons, ni placement en groupes, ni rotation.

## Principes de conception

- Une vérification échouée est signalée comme échouée. Manquer de temps n'est jamais signalé comme impossible.
- Un plan est vérifié par du code qui ne partage pas l'encodage du solveur. Dans les tests, chaque conflit est comparé à une recherche exhaustive.
- Un plan arrangé à la main par l'enseignant n'est remplacé que par son choix. Après une modification de la classe ou des demandes, un plan qui enfreint une demande est replanifié, et Annuler le rétablit.
- Les noms restent sur l'appareil. Les classes d'exemple sont fictives.

## Développement

`npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build` et `npm run test:e2e` sont les vérifications que lance la CI. Voir [CONTRIBUTING.md](CONTRIBUTING.md) et [docs/architecture.md](docs/architecture.md).

Licence MIT.

Assisted by Claude/Codex.
