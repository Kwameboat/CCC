#!/usr/bin/env bash
# Set up the church streaming server on a fresh Ubuntu 22.04/24.04 machine
# (e.g. an Oracle Cloud "Always Free" Ampere instance). Run from this folder:
#
#   sudo bash setup.sh
#
# It installs Docker, opens the firewall ports, asks for a broadcast password and a
# web address, then starts MediaMTX + Caddy. Safe to run again.
set -euo pipefail

cd "$(dirname "$0")"

if [[ $EUID -ne 0 ]]; then
  echo "Please run with sudo:  sudo bash setup.sh"
  exit 1
fi

echo "== 1/5 Installing Docker"
if ! command -v docker >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y docker.io docker-compose-v2
  systemctl enable --now docker
fi
docker compose version >/dev/null 2>&1 || apt-get install -y docker-compose-v2

echo "== 2/5 Opening firewall ports 80, 443 (HTTPS) and 1935 (RTMP)"
if command -v iptables >/dev/null 2>&1; then
  for port in 80 443 1935; do
    iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null \
      || iptables -I INPUT -p tcp --dport "$port" -j ACCEPT
  done
  if command -v netfilter-persistent >/dev/null 2>&1; then
    netfilter-persistent save
  else
    apt-get install -y iptables-persistent && netfilter-persistent save
  fi
fi
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 1935/tcp
fi

echo "== 3/5 Broadcast password"
if grep -q "__PUBLISH_PASSWORD__" mediamtx.yml; then
  read -r -s -p "Choose a broadcast password (letters and numbers, 12+ characters): " PW
  echo
  if [[ ! "$PW" =~ ^[A-Za-z0-9]{12,}$ ]]; then
    echo "Use at least 12 letters/numbers only (no spaces or symbols). Run setup again."
    exit 1
  fi
  sed -i "s/__PUBLISH_PASSWORD__/${PW}/" mediamtx.yml
  chmod 600 mediamtx.yml
  echo "Password saved in mediamtx.yml (only readable by root)."
else
  echo "Password already set (edit mediamtx.yml to change it)."
fi

echo "== 4/5 Web address"
if [[ ! -f .env ]]; then
  PUBLIC_IP="$(curl -fsS -4 https://ifconfig.me || true)"
  DEFAULT_DOMAIN=""
  [[ -n "$PUBLIC_IP" ]] && DEFAULT_DOMAIN="${PUBLIC_IP//./-}.sslip.io"
  echo "Enter the address viewers will use, e.g. live.yourchurch.org"
  echo "(first point the DNS A record of that name to ${PUBLIC_IP:-the server IP address}),"
  read -r -p "or press Enter to use the free address ${DEFAULT_DOMAIN}: " DOMAIN
  DOMAIN="${DOMAIN:-$DEFAULT_DOMAIN}"
  if [[ -z "$DOMAIN" ]]; then
    echo "Could not detect the public IP. Run setup again and type an address."
    exit 1
  fi
  echo "STREAM_DOMAIN=${DOMAIN}" > .env
fi
# shellcheck disable=SC1091
source .env
mkdir -p recordings

echo "== 5/5 Starting the streaming server"
docker compose pull
docker compose up -d

cat <<EOF

=====================================================================
 Streaming server is running.

 In the church console → Online Service → Streaming server, enter:
   Server web address : https://${STREAM_DOMAIN}
   Server RTMP address: rtmp://${STREAM_DOMAIN}:1935

 OBS settings (Settings → Stream → Service: Custom):
   Server     : rtmp://${STREAM_DOMAIN}:1935
   Stream Key : live?user=publisher&pass=<your broadcast password>

 Test playback after you start streaming:
   https://${STREAM_DOMAIN}/live/index.m3u8
=====================================================================
EOF
