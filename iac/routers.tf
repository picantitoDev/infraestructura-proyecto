  resource "proxmox_virtual_environment_container" "router_10_20" {
    vm_id     = 702
    node_name = "proxmox"

    initialization {
      hostname = "router-10-20"

      # eth0 → VLAN 10
      ip_config {
        ipv4 {
          address = "10.10.0.254/24"
          gateway = "10.10.0.100" 
        }
      }

      # eth1 → VLAN 20
      ip_config {
        ipv4 {
          address = "10.20.0.254/24"
          #gateway = "10.20.0.254" 
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
      vlan_id = 10
    }

    network_interface {
      name    = "eth1"
      bridge  = "vmbr0"
      vlan_id = 20
    }

    disk {
      datastore_id = "local-lvm"
      size         = 8
    }
  }

  resource "proxmox_virtual_environment_container" "router_20_30" {
    vm_id     = 703
    node_name = "proxmox"

    initialization {
      hostname = "router-20-30"

      # eth0 → VLAN 20
      ip_config {
        ipv4 {
          address = "10.20.0.253/24"
        }
      }

      # eth1 → VLAN 30
      ip_config {
        ipv4 {
          address = "10.30.0.254/24"
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

    network_interface {
      name    = "eth1"
      bridge  = "vmbr0"
      vlan_id = 30
    }

    disk {
      datastore_id = "local-lvm"
      size         = 8
    }
  }
