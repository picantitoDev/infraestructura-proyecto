resource "proxmox_virtual_environment_container" "nat_gateway" {
  vm_id     = 704
  node_name = "proxmox"

  initialization {
    hostname = "nat-gateway"

    ip_config {
      ipv4 {
        address = "192.168.0.220/24"
        gateway = "192.168.0.1"
      }
    }

    ip_config {
      ipv4 {
        address = "10.10.0.2/24"
      }
    }

    ip_config {
      ipv4 {
        address = "10.40.0.1/24"
      }
    }

    user_account {
      keys = [var.ansible_pub_key]
    }
  }
  
  operating_system {
    type             = "alpine"
    template_file_id = "local:vztmpl/devuan-5.0-standard_5.0_amd64.tar.gz"
  }

  cpu {
    cores = 1
  }

  memory {
    dedicated = 512
  }

  # eth0 = public
  network_interface {
    name   = "eth0"
    bridge = "vmbr0"
  }

  # eth1 = vlan10
  network_interface {
    name    = "eth1"
    bridge  = "vmbr0"
    vlan_id = 10
  }

  # eth2 = vlan40
  network_interface {
    name    = "eth2"
    bridge  = "vmbr0"
    vlan_id = 40
  }

  disk {
    datastore_id = "local-lvm"
    size         = 8
  }

  unprivileged = false
}
