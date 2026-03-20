Voici une description détaillée du projet pour vous guider dans la refonte de son design, basée sur les documents de conception originaux :

**Nom du projet :** Idle Realms

**Concept Principal :**
Il s'agit d'un jeu de rôle (RPG) de type "Idle" (incrémental) jouable directement sur navigateur web et conçu pour être mobile-friendly. Inspiré de jeux comme FarmRPG et Melvor Idle, le cœur du gameplay tourne autour de plusieurs actions automatisables : Collecter, Crafter, Améliorer, Explorer et Combattre. Le joueur progresse aussi bien en étant actif sur le jeu qu'en laissant son personnage travailler de manière passive hors-ligne.

**Univers et Direction Artistique :**
* **Thème :** L'univers est ancré dans une fantasy médiévale sombre et mystérieuse ("dark & mystérieux").
* **Palette de couleurs :** Le design doit utiliser des tons sombres tels que le bleu nuit, le brun et le gris ardoise, tout en les rehaussant avec des accents dorés.
* **Typographie :** L'interface doit mélanger une police Serif de style médiéval pour les titres, afin d'accentuer l'immersion, et une police Sans-serif très lisible pour les innombrables données, statistiques et logs du jeu.
* **Graphismes & Assets :** Le jeu repose majoritairement sur son interface utilisateur (UI) plutôt que sur des graphiques animés complexes. Actuellement, les ressources sont représentées par des emojis natifs avec un code couleur CSS pour définir leur rareté. Les ennemis majeurs (boss) sont illustrés sous forme d'images 2D imitant le style des "gravures à l'encre médiévale sombre", en noir et blanc avec un fort contraste.

**Structure de l'Interface (UI/UX) à repenser :**
La structure globale nécessite un design "responsive". Sur ordinateur (desktop), la navigation principale se fait via une barre latérale, tandis que sur les téléphones mobiles, elle bascule sur un menu en bas de l'écran.

Voici les différents écrans et modules clés à maquetter :
* **Exploration & Combat :** Une section comprenant la carte des zones à débloquer, le butin, et un historique textuel des combats défilant en temps réel. Ce "log" utilise un code couleur précis : rouge pour les dégâts subis, vert pour les soins, or pour les coups critiques.
* **Métiers & Progression :** Des panneaux de sélection d'actions de récolte (minage, pêche, bûcheronnage, etc.) accompagnés de barres de progression fluides s'actualisant en temps réel.
* **Craft (Artisanat) :** Une interface affichant des files d'attente de production, des listes de recettes et une vue détaillée pour les objets complexes. Cette vue doit comporter des indicateurs visuels (vert, jaune, rouge) pour faire comprendre au joueur s'il possède les composants requis.
* **Inventaire et Personnage :** Une grille d'inventaire classique où les objets affichent des infobulles riches au survol (statistiques, prix, effets). Un écran dédié à l'équipement actif, aux statistiques du personnage, et à son arbre de talents.
* **Écrans Événementiels et Modales :**
    * *Écran de récupération hors-ligne :* Un résumé très gratifiant apparaissant à la connexion, listant toute l'XP, les butins et l'or récoltés pendant l'absence du joueur.
    * *Mini-jeux intégrés :* De petites interfaces réactives par-dessus l'action, comme une jauge à cliquer au bon moment pour la pêche ou des zones lumineuses à sélectionner lors du minage.
    * *Quêtes d'urgence :* Des notifications flottantes dotées d'un compte à rebours visuel.

**Contraintes d'intégration technique :**
Pour orienter vos maquettes, sachez que l'application utilise Next.js et Tailwind CSS, combinés à la librairie Framer Motion pour apporter des animations légères à l'UI sans dégrader les performances.