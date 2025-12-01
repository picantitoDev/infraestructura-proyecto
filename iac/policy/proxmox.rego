package terraform.analysis

import input as tfplan

# Límites mínimos permitidos
min_cpu := 1
min_memory := 512         # en MB
min_disk := 4             # en GB

result := res if {
    count(deny) == 0
    res := {
        "valid": true,
        "errors": []
    }
}

result := res if {
    count(deny) > 0
    res := {
        "valid": false,
        "errors": deny
    }
}

# REGLAS 

deny contains msg if {
    some r in tfplan.resource_changes
    r.type == "proxmox_virtual_environment_container"
    after := r.change.after
    
    cores := after.cpu[0].cores
    
    cores < min_cpu
    msg := sprintf("El LXC '%s' tiene muy pocos núcleos de CPU: %v (mínimo %v)",
        [try_hostname(after), cores, min_cpu])
}

deny contains msg if {
    some r in tfplan.resource_changes
    r.type == "proxmox_virtual_environment_container"
    after := r.change.after

    mem := after.memory[0].dedicated
    
    mem < min_memory
    msg := sprintf("El LXC '%s' tiene memoria insuficiente: %v MB (mínimo %v MB)",
        [try_hostname(after), mem, min_memory])
}

deny contains msg if {
    some r in tfplan.resource_changes
    r.type == "proxmox_virtual_environment_container"
    after := r.change.after
    
    disk_size := after.disk[0].size
    
    disk_size < min_disk
    msg := sprintf("El LXC '%s' tiene muy poco tamaño de disco: %v GB (mínimo %v GB)",
        [try_hostname(after), disk_size, min_disk])
}

# Helper para evitar que falle si initialization no existe
try_hostname(after) := hostname if {
    hostname := after.initialization[0].hostname
} else := "unknown-hostname"
