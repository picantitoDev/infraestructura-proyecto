resource "proxmox_virtual_environment_container" "backups" {
  provider  = proxmox.rootpam
  vm_id     = 725
  node_name = "proxmox"

  description  = "LXC dedicado a cronjobs de backup (PostgreSQL → disco sólido /mnt/pve/backups)"
  unprivileged = false

  features {
    nesting = true
    keyctl  = true
    fuse    = true
  }

  initialization {
    hostname = "backups"

    ip_config {
      ipv4 {
        address = "10.30.0.3/24"
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
    size         = 8
  }

  mount_point {
    volume = "/mnt/solid"
    path   = "/mnt/solid"
    acl    = false
    quota  = false
    backup = false
  }
  start_on_boot = true
}
