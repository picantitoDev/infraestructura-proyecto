#!/bin/bash

set -e

echo "Generando plan de Terraform..."

terraform init -upgrade

terraform plan -out=tfplan.binary



echo " Convertir plan a JSON..."

terraform show -json tfplan.binary > tfplan.json

echo ""
echo "Validacion de Open Policy Agent (OPA local)"

# Verificar que OPA esté instalado
if ! command -v opa &> /dev/null; then
    echo "ERROR: OPA no está instalado o no está en el PATH."
    echo "Instálalo con:"
    echo "  curl -L -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64"
    echo "  chmod +x opa && sudo mv opa /usr/local/bin/"
    exit 1
fi

# Ejecutar OPA usando el bundle y el tfplan
RESULT=$(opa exec \
  --decision terraform/analysis/result \
  --bundle policy/ \
  tfplan.json)

echo "$RESULT"
echo ""

# Validación del resultado
if echo "$RESULT" | grep -q '"valid"[[:space:]]*:[[:space:]]*true'; then
    echo "VALIDACION EXITOSA"
    echo "Todos los recursos cumplen con las politicas"
    exit 0
else
    echo "VALIDACION FALLIDA"
    echo "Se detectaron violaciones de politica"
    exit 1
fi
