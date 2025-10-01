resource "proxmox_virtual_environment_container" "logsynch" {
  vm_id     = 703
  node_name = "proxmox"

  initialization {
    hostname = "logsynch"

    ip_config {
      ipv4 {
        address = "10.10.0.4/24"
        gateway = "10.10.0.2"
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

  cpu { cores = 1 }
  memory { dedicated = 512 }

  network_interface {
    name   = "eth0"
    bridge = "vmbr0"
    vlan_id = 10
  }

  disk {
    datastore_id = "local-lvm"
    size         = 8
  }
  
  unprivileged = false
}
