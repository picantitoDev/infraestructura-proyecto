# 📦 Sistema de Inventario Distribuido - Bravo SAC

## 📋 Contexto y Problemática

### ¿Qué es Bravo SAC?

**Bravo SAC** es una empresa distribuidora de consumos y bienes que enfrenta desafíos críticos en su operación diaria:

#### Problemas Identificados

- **Inconsistencias en el inventario**: Actualizaciones desincronizadas que generan discrepancias en los registros
- **Falta de trazabilidad**: Sin auditoría clara de transacciones
- **Seguridad deficiente**: Ausencia de controles robustos para proteger información sensible
- **Pérdidas económicas**: Pedidos erróneos debido a datos incorrectos

### Solución Propuesta: Infraestructura como Código (IaC)

Implementación de una arquitectura basada en **Linux Containers (LXC)** gestionada con **Terraform** y automatizada con **Ansible**.

#### Beneficios Clave

✅ **Reproducibilidad**: Despliegue automatizado de entornos idénticos  
✅ **Versionamiento**: Controlar cambios en la infraestructura mediante código
✅ **Eficiencia de costos**: Ejecución local sin dependencia de nube pública  
✅ **Aislamiento**: Segregación por VLANs y contenedores  
✅ **Confiabilidad**: Sistema de colas para garantizar consistencia de datos

---

## 🏗️ Arquitectura de la Solución

### Vista General

La solución implementa una **arquitectura multinivel segmentada por VLANs**, donde cada capa tiene responsabilidades específicas y aislamiento de red.

### Segmentación por VLANs

#### **VLAN 10 - Capa de Presentación** (`10.10.0.0/24`)

| Componente | IP | Función |
|------------|------------|---------|
| **Nginx Proxy** | `10.10.0.1` | Proxy inverso, terminación SSL|
| **Grafana** | `10.10.0.3` | Dashboard de monitoreo y visualización |
| **Log Sync** | `10.10.0.4` | Centralización de logs para auditoría |

**Propósito**: Punto de entrada seguro y servicios de observabilidad.

#### **VLAN 20 - Capa de Aplicación** (`10.20.0.0/24`)

| Componente | IP | Función |
|------------|------------|---------|
| **RabbitMQ** | `10.20.0.1:8080` | Sistema de colas de mensajes |
| **NodeJS** | `10.20.0.1:8080` | Aplicativo |

**Propósito**: Lógica de negocio y procesamiento asíncrono confiable.

#### **VLAN 30 - Capa de Persistencia** (`10.30.0.0/22`)

| Componente | IP | Función |
|------------|------------|---------|
| **PostgreSQL** | `10.30.0.3` | Base de datos relacional principal |
| **cron-job** | `10.30.0.2:3412` | Gestor de trabajos programados |
| **Redis** | `10.30.0.1:3375` | Sistema de caché en memoria |
| **NTFS Storage** | - | Almacenamiento persistente de 1TB |

**Propósito**: Almacenamiento y persistencia de datos críticos.

#### **VLAN 40 - Red de Gestión** (`10.40.0.0/24`)

| Componente | IP | Función |
|------------|------------|---------|
| **NAT Instance** | `10.40.0.1` | Control de acceso a internet |

**Propósito**: Aislamiento y control de acceso seguro a internet.


**Principios de Seguridad Aplicados**:
- Defensa en profundidad (múltiples capas)
- Principio de mínimo privilegio
- Segregación de red
- Cifrado en tránsito

---

## 🗂️ Estructura del Proyecto

```
bravo-sac-infrastructure/
├── app/                      # Código de aplicación (futuro)
├── config/                   # Configuración de Ansible
│   ├── ansible.cfg           # Configuración principal de Ansible
│   ├── inventory.ini         # Inventario de hosts
│   └── group_vars/           # Variables por grupo
│       ├── all.yml           # Variables globales
│       └── via_proxy.yml     # Configuración de proxy SSH
│
├── iac/                      # Infraestructura como Código (Terraform)
│   ├── main.tf               # Configuración del provider Proxmox
│   ├── variables.tf          # Definición de variables
│   ├── credenciales.auto.tfvars  # Credenciales (NO versionar)
│   ├── vlans.tf              # Definición de VLANs
│   ├── proxy.tf              # Contenedor Nginx Proxy
│   ├── natgateway.tf         # Contenedor NAT Gateway
│   ├── grafana.tf            # Contenedor Grafana
│   └── logsync.tf            # Contenedor Log Sync
│
├── docs/                     # Documentación
│   ├── diagrams/             # Diagramas de arquitectura
│   └── guides/               # Guías de configuración
│
├── .gitignore                # Archivos excluidos de Git
└── README.md                 # Este documento
```

### Templates Requeridos

En Proxmox, debe existir:
```bash
local:vztmpl/devuan-5.0-standard_5.0_amd64.tar.gz
```

---

## 🚀 Instalación y Despliegue

### Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/picantitoDev/infraestructura-proyecto.git
cd iac
```

### Paso 2: Configurar Credenciales
Las credenciales se configuran en jenkins

### Paso 3: Inicializar Terraform

```bash
cd iac/
terraform init
```

### Paso 4: Validar Configuración

```bash
terraform validate
terraform plan
```

### Paso 5: Desplegar Infraestructura

```bash
terraform apply
```

### Paso 6: Ejecutar Playbooks de Ansible

```bash
cd ../config/
ansible-playbook -i inventory.ini nombre-del-playbook.yml
```
