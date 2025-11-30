resource "proxmox_virtual_environment_container" "rabbit" {
  provider   = proxmox.rootpam
  vm_id      = 710
  node_name  = "proxmox"

  initialization {
    hostname = "rabbit"

    ip_config {
      ipv4 {
        address = "10.20.0.2/24"
        gateway = "10.20.0.254"
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
  memory { dedicated = 512 }

  network_interface {
    name    = "eth0"
    bridge  = "vmbr0"
    vlan_id = 20
  }

  disk {
    datastore_id = "local-lvm"
    size         = 8
  }

  unprivileged = false

  features {
    nesting = true
    keyctl  = true
    fuse    = true
  }
}
