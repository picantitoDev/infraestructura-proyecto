resource "proxmox_virtual_environment_container" "reverse_proxy" {
  vm_id     = 701 # ID del LXC
  node_name = "proxmox" # El nombre del server en el cluster (solamente tenemos un servidor)

  # Parámetros de lanzamiento
  initialization {
    hostname = "proxy" # Nombre del LXC

    # Para la interfaz pública eth0
    ip_config {
      ipv4 {
        address = "192.168.0.222/24"
      }
    }

    # Para la VLAN 10
    ip_config {
      ipv4 {
        address = "10.10.0.1/24"
        gateway = "10.10.0.2" # porque su única salida a internet será el NAT instance
      }
    }

    user_account {
      keys = [var.ansible_pub_key]
    }
  }

  unprivileged = false # Para poder correr docker
    
  # Configuración del Contenedor
  #Sitema operativo
  operating_system {
    type             = "alpine"
    template_file_id = "local:vztmpl/devuan-5.0-standard_5.0_amd64.tar.gz" # Devuan OS
  }

  cpu { cores = 1 } # Núcleos
  memory { dedicated = 512 } # Memoria RAM
  disk { # Disco
    datastore_id = "local-lvm"
    size         = 2 # 2GB
  }

  # Configuración de Red
  # eth0 (interfaz pública que da a la LAN)
  network_interface {
    name   = "eth0"
    bridge = "vmbr0"
  }

  # eth1 (la interfaz privada del proxy)
  network_interface {
    name    = "eth1"
    bridge  = "vmbr0"
    vlan_id = 10
  }
}
