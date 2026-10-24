# Mise en ligne (S4) : GitHub Pages + dépôt privé

L'app est servie par **GitHub Pages** (le code). Tes données ne sont **pas** dans ce dépôt : elles vivent dans un second dépôt, **privé**, que l'app lit et écrit avec un jeton d'accès. Aucun serveur à gérer.

Ce qui est déjà prêt : l'app, la PWA, le workflow de déploiement (`.github/workflows/pages.yml`), l'export JSON.
Ce que seul toi peux faire : créer les dépôts, le jeton, activer Pages. Compte une quinzaine de minutes.

## ⚠️ À savoir avant de publier le code

Pour que Pages soit gratuit, **le dépôt du code doit être public** (Pages sur dépôt privé demande un abonnement payant). Donc :

- Le code est lisible par tous, **y compris `CLAUDE.md`** (plan, décisions, ta section « Notes d'Enzo ») et tout l'historique git.
- Les commits portent l'adresse e-mail de l'auteur. Pour la masquer : GitHub → Settings → Emails → « Keep my email addresses private », puis `git config user.email "<id>+<pseudo>@users.noreply.github.com"`.
- Tes **données** restent privées (dépôt séparé). Ne mets jamais de jeton ni de données dans le dépôt public.

Si tu préfères que `CLAUDE.md` reste privé, dis-le-moi : je le sors du dépôt public.

## 1. Créer les deux dépôts (toi)

Sur github.com → New repository :

| Dépôt | Visibilité | Contenu |
|---|---|---|
| `outil` | **Public** | le code de l'app (créé vide : ni README ni licence) |
| `outil-data` | **Privé** | tes données. **Coche « Add a README »** (le dépôt ne doit pas être vide) |

## 2. Envoyer le code (toi, depuis le dossier du projet)

```bash
git remote add origin https://github.com/<ton-pseudo>/outil.git
git push -u origin main
```

## 3. Activer Pages (toi)

Dépôt `outil` → **Settings → Pages → Source : GitHub Actions**. Le workflow se lance au push (onglet Actions) ; l'adresse apparaît à la fin : `https://<ton-pseudo>.github.io/outil/`.

## 4. Créer le jeton (toi)

github.com → Settings → Developer settings → **Fine-grained personal access tokens → Generate** :

- *Repository access* : **Only select repositories → `outil-data`** uniquement.
- *Permissions → Repository → Contents : Read and write*.
- Expiration : 1 an maximum (note la date : à l'expiration, l'app te redemande un jeton ; tes données locales sont conservées).
- **Active la double authentification sur ton compte GitHub** (Settings → Password and authentication) : c'est ton second facteur.

## 5. Se connecter (toi, sur chaque appareil)

Ouvre `https://<ton-pseudo>.github.io/outil/`, saisis `<ton-pseudo>/outil-data` et le jeton. L'app refuse un dépôt public.

**iPhone** : Safari → Partager → **Sur l'écran d'accueil**. Mode avion → crée une session → réseau rétabli : l'indicateur passe de « Hors ligne » à « Synchronisé ».

## Sauvegardes

- L'**historique git** de `outil-data` est ta sauvegarde : chaque synchro est un commit, rien n'est supprimé définitivement.
- Copie locale sur le Mac : `git clone --mirror https://github.com/<ton-pseudo>/outil-data.git ~/Backups/outil-data.git` (puis `git remote update` dans ce dossier pour la rafraîchir).
- Export manuel : bouton **Exporter tout (JSON)** dans l'indicateur de synchro en haut de l'app.

## Limites à connaître

- Pas de temps réel : la synchro se fait à l'ouverture, après chaque écriture (2 s), toutes les minutes et au retour au premier plan.
- Fichiers joints : 25 Mo maximum chacun.
- Le jeton est stocké dans le navigateur de chaque appareil. Il est limité à `outil-data` (Contents seulement). N'héberge pas d'autres sites non fiables sur `<ton-pseudo>.github.io` : ils partagent la même origine.
- Si tu modifies une même session sur deux appareils hors ligne, la version modifiée en dernier gagne.
