resource "proxmox_virtual_environment_container" "grafana" {
  provider  = proxmox.rootpam
  vm_id     = 708
  node_name = "proxmox"

  initialization {
    hostname = "grafana"

    # eth0: public LAN
    ip_config {
      ipv4 {
        address = "192.168.0.212/24"
      }
    }

    # eth1: VLAN 10 private network
    ip_config {
      ipv4 {
        address = "10.10.0.2/24"
        gateway = "10.10.0.254"
      }
    }

    user_account {
      keys     = [file(var.ansible_key)]
      password = "12345"
    }
  }

  operating_system {
    type             = "debian"
    template_file_id = "local:vztmpl/debian-12-standard_12.12-1_amd64.tar.zst"
  }

  cpu { cores = 1 }
  memory { dedicated = 1024 }

  disk {
    datastore_id = "local-lvm"
    size         = 10
  }

  # network interfaces
  network_interface {
    name   = "eth0"
    bridge = "vmbr0"
  }

  network_interface {
    name    = "eth1"
    bridge  = "vmbr0"
    vlan_id = 10
  }

  unprivileged = false

  features {
    nesting = true
    keyctl  = true
    fuse    = true
  }
}
