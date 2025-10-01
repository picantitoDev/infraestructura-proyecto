terraform {
  required_providers {
    proxmox = {
      source  = "bpg/proxmox"
      version = "0.83.2"
    }
  }
}

provider "proxmox" {
  endpoint  = var.proxmox_api_url # URL de la API de Proxmox
  api_token = var.proxmox_api_token # El token de seguridad

  insecure = true
}
