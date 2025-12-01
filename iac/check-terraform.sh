#!/bin/bash

set -e

echo "Convertir plan a JSON..."
terraform show -json tfplan.binary > tfplan.json

echo ""
echo "Validacion de Open Policy Agent"

RESULT=$(docker run --rm \
  -v "$(pwd)/policy:/policy" \
  -v "$(pwd)/tfplan.json:/tfplan.json" \
  openpolicyagent/opa:edge-static-debug \
  exec --decision terraform/analysis/result \
  --bundle /policy/ \
  /tfplan.json)

echo "$RESULT"
echo ""

if echo "$RESULT" | grep -q '"valid"[[:space:]]*:[[:space:]]*true'; then
    echo "VALIDACION EXITOSA"
    echo "Todos los recursos cumplen con las politicas"
    exit 0
else
    echo "VALIDACION FALLIDA"
    echo "Se detectaron violaciones de politica"
    exit 1
fi
