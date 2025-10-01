variable "proxmox_api_url" {
  description = "Proxmox API URL"
  type        = string
}

variable "proxmox_api_token" {
  description = "Proxmox API Token"
  type        = string
  sensitive   = true
}

variable "ansible_pub_key" {
  description = "Clave pública SSH de Ansible"
  type        = string
}
