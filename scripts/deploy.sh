#!/usr/bin/env bash
# Depuis le Mac : build + copie sur la VM + redémarrage.   npm run deploy   (ou -- --dry-run pour simuler)
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f scripts/deploy.env ] || { echo "Crée scripts/deploy.env (modèle : scripts/deploy.env.example)." >&2; exit 1; }
# shellcheck disable=SC1091
source scripts/deploy.env
: "${DEPLOY_HOST:?DEPLOY_HOST manquant dans scripts/deploy.env}"
: "${APP_URL:?APP_URL manquant dans scripts/deploy.env}"

DRY=""
[ "${1:-}" = "--dry-run" ] && DRY="-n"

npm run build

# Même version de PocketBase en local et sur la VM ? (projet en 0.x : changements cassants possibles)
LOCAL_VERSION="$(tr -d '[:space:]' < server/VERSION)"
REMOTE_VERSION="$(ssh "$DEPLOY_HOST" '/opt/outil/pocketbase --version' | awk '{print $NF}')"
if [ "$LOCAL_VERSION" != "$REMOTE_VERSION" ]; then
  echo "Attention : server/VERSION = $LOCAL_VERSION mais la VM exécute $REMOTE_VERSION." >&2
  echo "Lis les notes de version PocketBase, puis relance server-install.sh sur la VM." >&2
  exit 1
fi

# -rlt : pas de propriétaire/groupe (ils restent « outil » grâce au bit setgid des dossiers).
RSYNC=(rsync -rlt $DRY --delete --chmod=Dg+rwx,Fg+rw)
"${RSYNC[@]}" dist/ "$DEPLOY_HOST:/opt/outil/pb_public/"
"${RSYNC[@]}" server/pb_migrations/ "$DEPLOY_HOST:/opt/outil/pb_migrations/"

if [ -n "$DRY" ]; then echo "Simulation terminée : rien n'a été modifié sur la VM."; exit 0; fi

ssh "$DEPLOY_HOST" 'sudo systemctl restart outil'
sleep 3
curl -fsS "$APP_URL/api/health" && echo && echo "Déployé : $APP_URL"
