# Mise en ligne (S4) : pas à pas

Objectif : l'app tourne sur une VM Oracle Always Free (Paris), invisible d'internet, accessible uniquement via Tailscale en HTTPS, installée sur l'iPhone comme une app.

**Ce qui est déjà prêt dans le dépôt** : PWA (manifeste, icônes, service worker), bouton « Exporter tout », sauvegarde nocturne PocketBase, `scripts/server-install.sh`, `scripts/deploy.sh`, `scripts/backup-pull.mjs`, `deploy/outil.service`.

**Ce que seul toi peux faire** (comptes, cartes bancaires, choix de sécurité) : les étapes 1, 2, 4, 6, 7 et 9 ci-dessous.

---

## 1. Compte Oracle Cloud (toi)

1. Crée le compte sur cloud.oracle.com. **Région d'origine : France Sud (Paris) / `eu-paris-1`. Ce choix est définitif.**
2. Une carte bancaire est demandée pour vérifier l'identité. Tant que tu restes dans les ressources « Always Free », rien n'est débité.

## 2. Politique de récupération des VM inactives (décision à prendre)

Oracle peut récupérer une instance Always Free jugée **inactive** : sur 7 jours, si le 95e centile du CPU **et** du réseau (et de la mémoire pour les VM Ampere A1) reste sous 20 %. Notre app sera très calme, donc **le risque est réel**.

| Parade | Effet | Contrepartie |
|---|---|---|
| **A. Passer le compte en « Pay As You Go »** (recommandé) | D'après une communication Oracle de 2023, une instance n'est alors plus récupérée ; rien n'est facturé tant que l'usage reste dans les limites Always Free | Compte lié à une carte ; à surveiller (budget alerte à 1 €) |
| B. Rester en Always Free pur | 0 € garanti | Risque de perdre la VM : les sauvegardes (étape 8) permettent de tout restaurer |

La source citée est une reprise tierce d'un avis de 2023 : relis la page officielle « Always Free Resources » avant de choisir. **À noter ensuite en §11 du CLAUDE.md.**

## 3. Créer la VM (toi)

- Image **Ubuntu 24.04**, forme **VM.Standard.A1.Flex** (Ampere, 1 OCPU, 6 Go) ou `VM.Standard.E2.1.Micro` si A1 est indisponible. Les deux suffisent largement.
- Ajoute ta clé SSH publique.
- Note l'IP publique, uniquement pour la première connexion.

## 4. Installer le serveur (toi, 5 minutes)

Depuis le dossier du projet sur le Mac :

```bash
scp scripts/server-install.sh deploy/outil.service ubuntu@<IP-PUBLIQUE>:
ssh ubuntu@<IP-PUBLIQUE> "bash server-install.sh $(cat server/VERSION)"
```

Le script télécharge PocketBase (somme de contrôle vérifiée), crée l'utilisateur système `outil`, installe le service et le démarre sur `127.0.0.1:8090` (non joignable de l'extérieur).

## 5. Tailscale (toi)

1. Compte sur tailscale.com avec un fournisseur d'identité **protégé par la double authentification** (GitHub, Apple ou Microsoft : pas Google, cf. CLAUDE.md §3).
2. Console d'administration → **DNS** : active **MagicDNS** et **HTTPS Certificates**.
3. Sur la VM :
   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up --hostname=outil --ssh
   sudo tailscale serve --bg 8090
   ```
   `tailscale serve` donne l'adresse HTTPS : `https://outil.<ton-tailnet>.ts.net`.
4. Installe l'app Tailscale sur le Mac et sur l'iPhone, connectés au même compte.
5. Vérifie que `ssh ubuntu@outil` fonctionne **via Tailscale**, puis, dans la console Oracle, **supprime la règle d'entrée SSH (port 22)** de la liste de sécurité : plus rien n'est exposé sur internet.

> Sur l'iPhone, l'app n'est joignable que si Tailscale est actif (VPN). Hors ligne ou VPN coupé, l'app s'ouvre quand même avec les données locales ; la synchro reprend au retour du réseau.

## 6. Créer le superuser et ton compte (toi)

```bash
ssh ubuntu@outil
sudo -u outil /opt/outil/pocketbase --dir=/opt/outil/pb_data superuser upsert <ton-email> '<mot-de-passe-long-et-unique>'
```

Ouvre ensuite `https://outil.<ton-tailnet>.ts.net/_/`, connecte-toi, puis crée ton utilisateur dans la collection **users** (c'est lui qui se connecte dans l'app). L'inscription publique est fermée.

## 7. Déployer (Mac)

```bash
cp scripts/deploy.env.example scripts/deploy.env   # puis renseigne DEPLOY_HOST et APP_URL
npm run deploy -- --dry-run                        # simulation
npm run deploy                                     # build + copie + redémarrage
```

## 8. Sauvegardes

- **Nocturne sur le serveur** : déjà configurée par migration (3 h, 14 copies conservées dans `pb_data/backups`).
- **Copie hors serveur sur le Mac** : `scripts/backup-pull.mjs` déclenche une sauvegarde fraîche et télécharge les manquantes dans `~/Backups/outil` (30 conservées).
  ```bash
  PB_URL=https://outil.<ton-tailnet>.ts.net PB_SUPERUSER_EMAIL=… PB_SUPERUSER_PASSWORD=… npm run backup
  ```
  À planifier chaque jour (launchd ou cron) ; garde le mot de passe dans le Trousseau ou un fichier non versionné, jamais dans le dépôt.
- **Export manuel** : bouton **Exporter tout (JSON)** dans l'indicateur de synchro (en haut), format lisible hors de l'app.
- **Restaurer** : arrêter le service, remplacer `pb_data` par le contenu d'un zip de sauvegarde, redémarrer.

## 9. Double authentification (décision à prendre)

PocketBase ne propose pas de code TOTP intégré. Son « MFA » exige un second facteur par **e-mail (OTP)** ou OAuth2 : l'e-mail impose un service SMTP tiers, ce qui s'oppose à la règle « aucun service tiers » du CLAUDE.md.

**Proposition** : le second facteur est **Tailscale**. Le serveur n'est visible que des appareils autorisés sur ton tailnet, dont le compte est protégé par la double authentification du fournisseur d'identité (étape 5). Ajoute un mot de passe long et unique pour l'utilisateur et le superuser. Si tu préfères le MFA e-mail de PocketBase, il faudra choisir un fournisseur SMTP.

## 10. Installer sur l'iPhone et vérifier

1. Tailscale actif sur l'iPhone, ouvre l'adresse `https://outil.<ton-tailnet>.ts.net` dans **Safari**.
2. Connecte-toi, puis **Partager → Sur l'écran d'accueil**.
3. Lance l'app depuis l'icône, passe en mode avion, crée une session, rallume le réseau : l'indicateur doit passer de « Hors ligne » à « Synchronisé ».
4. Vérifie en 4G (Tailscale actif) et la synchro avec le Mac.
