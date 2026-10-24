#!/usr/bin/env bash
# À lancer SUR LA VM (Ubuntu), une fois, puis à chaque changement de version PocketBase :
#   bash server-install.sh <version PocketBase>     (ex. 0.40.6, voir server/VERSION)
# Il installe le binaire (somme de contrôle vérifiée), le service système et les dossiers.
set -euo pipefail

VERSION="${1:?Usage : server-install.sh <version PocketBase>}"
APP=/opt/outil
case "$(uname -m)" in
  x86_64) ARCH=amd64 ;;
  aarch64) ARCH=arm64 ;;
  *) echo "Architecture non gérée : $(uname -m)" >&2; exit 1 ;;
esac

sudo apt-get update -qq
sudo apt-get install -y -qq unzip curl rsync

id outil >/dev/null 2>&1 || sudo useradd --system --home "$APP" --shell /usr/sbin/nologin outil
sudo mkdir -p "$APP/pb_data" "$APP/pb_public" "$APP/pb_migrations"

tmp="$(mktemp -d)"
base="https://github.com/pocketbase/pocketbase/releases/download/v${VERSION}"
zip="pocketbase_${VERSION}_linux_${ARCH}.zip"
curl -fsSL -o "$tmp/$zip" "$base/$zip"
curl -fsSL -o "$tmp/checksums.txt" "$base/checksums.txt"
(cd "$tmp" && grep " $zip\$" checksums.txt | sha256sum -c -)
unzip -oq "$tmp/$zip" pocketbase -d "$tmp"

sudo systemctl stop outil 2>/dev/null || true
sudo install -m 0755 "$tmp/pocketbase" "$APP/pocketbase"
rm -rf "$tmp"

# L'utilisateur de connexion peut déposer le front et les migrations (groupe « outil »), sans être propriétaire des données.
sudo usermod -aG outil "$USER"
sudo chown -R outil:outil "$APP"
sudo chmod -R g+rwX "$APP/pb_public" "$APP/pb_migrations"
sudo chmod g+s "$APP/pb_public" "$APP/pb_migrations"

sudo install -m 0644 "$(dirname "$0")/outil.service" /etc/systemd/system/outil.service 2>/dev/null \
  || sudo install -m 0644 ./outil.service /etc/systemd/system/outil.service
sudo systemctl daemon-reload
sudo systemctl enable --now outil
sudo systemctl --no-pager status outil | head -5
echo "PocketBase ${VERSION} installé. Première fois : créer le superuser (voir docs/MISE_EN_LIGNE.md, étape 6)."
