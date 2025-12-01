#!/usr/bin/env bash

# Script idempotente para configurar /etc/hosts
# No usa dnsmasq, solo modifica /etc/hosts.

set -e

# Entradas deseadas
HOSTS=(
"192.168.0.250 harbor.local"
"192.168.0.222 app.local"
"192.168.0.212 grafana.local"
)

# Archivo hosts
HOSTS_FILE="/etc/hosts"

echo "[+] Aplicando configuración de /etc/hosts..."

# Por cada entrada, eliminamos si existe y después agregamos de nuevo
for entry in "${HOSTS[@]}"; do
    IP=$(echo "$entry" | awk '{print $1}')
    NAME=$(echo "$entry" | awk '{print $2}')

    # Borrar entradas previas
    sudo sed -i "/$NAME/d" "$HOSTS_FILE"
    sudo sed -i "/$IP/d" "$HOSTS_FILE"

    # Añadir entrada limpia
    echo "$entry" | sudo tee -a "$HOSTS_FILE" >/dev/null

    echo "   - Configurado: $IP  $NAME"
done

echo "[+] Hosts configurados correctamente."
