terraform {
  required_providers {
    proxmox = {
      source  = "bpg/proxmox"
      version = "0.83.2"
    }
  }
}

provider "proxmox" {
  endpoint  = var.proxmox_api_url
  api_token = var.proxmox_api_token
  insecure  = true
}

provider "proxmox" {
  alias    = "rootpam"
  endpoint = var.proxmox_api_url
  username = "root@pam"
  password = var.root_password
  insecure = true
}

terraform {
  backend "remote" {
    hostname     = "app.terraform.io"
    organization = "infraestructure-as-code"

    workspaces {
      prefix = "iac-"
    }
  }
}
