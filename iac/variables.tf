variable "proxmox_api_url" {
  description = "Proxmox API URL"
  type        = string
}

variable "proxmox_api_token" {
  description = "Proxmox API Token"
  type        = string
  sensitive   = true
}

variable "root_password" {
  description = "Password for root@pam"
  type        = string
  sensitive   = true
}

variable "ansible_key" {
  description = "Ruta al archivo de clave pública de Ansible"
  type        = string
  default     = "../config/ansible.pub"
}

variable "proxmox_host" {
  description = "IP o hostname del servidor Proxmox"
  type        = string
}

variable "lxc_password" {
  type      = string
  sensitive = true
}
