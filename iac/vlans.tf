# VLAN 10 - Presentación
resource "proxmox_virtual_environment_network_linux_vlan" "vlan10" {
  node_name = "proxmox"
  name      = "vmbr0.10"
  comment   = "VLAN 10 - Capa de Presentación"
  autostart = true
}

# VLAN 20 - Aplicación
resource "proxmox_virtual_environment_network_linux_vlan" "vlan20" {
  node_name = "proxmox"
  name      = "vmbr0.20"
  comment   = "VLAN 20 - Capa de Aplicación"
  autostart = true
}

# VLAN 30 - Persistencia
resource "proxmox_virtual_environment_network_linux_vlan" "vlan30" {
  node_name = "proxmox"
  name      = "vmbr0.30"
  comment   = "VLAN 30 - Capa de Persistencia"
  autostart = true
}

# VLAN 40 - Aislamiento de la instancia NAT
resource "proxmox_virtual_environment_network_linux_vlan" "vlan40" {
  node_name = "proxmox"
  name      = "vmbr0.40"
  comment   = "VLAN 40 - Para aislar la instancia NAT"
  autostart = true
}
