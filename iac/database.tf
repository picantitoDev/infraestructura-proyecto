resource "proxmox_virtual_environment_container" "database" {
  provider  = proxmox.rootpam
  vm_id     = 705
  node_name = "proxmox"

  initialization {
    hostname = "database"

    ip_config {
      ipv4 {
        address = "10.30.0.1/24"
        gateway = "10.30.0.254"
      }
    }

    user_account {
      keys     = [file(var.ansible_key)]
      password = var.lxc_password
    }
  }

  operating_system {
    type             = "debian"
    template_file_id = "local:vztmpl/debian-12-standard_12.12-1_amd64.tar.zst"
  }

  cpu {
    cores = 1
  }

  memory {
    dedicated = 1024
  }

  network_interface {
    name    = "eth0"
    bridge  = "vmbr0"
    vlan_id = 30
  }

  disk {
    datastore_id = "local-lvm"
    size         = 16
  }

  unprivileged = false

  features {
    nesting = true
    keyctl  = true
    fuse    = true
  }

}
