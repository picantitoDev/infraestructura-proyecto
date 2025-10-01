const { PrismaClient } = require('@prisma/client')
const { DateTime } = require('luxon')
const prisma = new PrismaClient()

async function obtenerOrdenes() {
  try {
    return await prisma.orden_reabastecimiento.findMany({
      orderBy: { id_order: 'desc' },
      include: {
        proveedor: { 
          select: { 
            id_proveedor: true,
            razon_social: true,
            ruc: true 
          } 
        },
        usuarios: { // Corregido: usuarios en lugar de usuario
          select: { 
            id: true,
            username: true 
          } 
        }
      }
    })
  } catch (error) {
    console.error('Error al obtener órdenes:', error)
    throw error
  }
}

async function crearOrden(id_proveedor, productos, fecha, estado = 'en_curso', id_usuario) {
  try {
    // Validar parámetros requeridos
    const proveedorId = parseInt(id_proveedor)
    if (isNaN(proveedorId)) {
      throw new Error('ID de proveedor debe ser un número válido')
    }

    let usuarioId = null
    if (id_usuario !== null && id_usuario !== undefined) {
      usuarioId = parseInt(id_usuario)
      if (isNaN(usuarioId)) {
        throw new Error('ID de usuario debe ser un número válido')
      }
    }

    // Validar que productos sea un array válido
    if (!Array.isArray(productos)) {
      throw new Error('Los productos deben ser un array')
    }

    // Validar fecha
    const fechaDate = fecha instanceof Date ? fecha : new Date(fecha)
    if (isNaN(fechaDate.getTime())) {
      throw new Error('Fecha inválida')
    }

    // Validar estado
    const estadosValidos = ['en_curso', 'completada', 'cancelada']
    if (!estadosValidos.includes(estado)) {
      throw new Error(`Estado debe ser uno de: ${estadosValidos.join(', ')}`)
    }

    const orden = await prisma.orden_reabastecimiento.create({
      data: {
        id_proveedor: proveedorId,
        products: productos, // JSON field
        fecha: fechaDate,
        estado,
        id_usuario: usuarioId
      },
      include: {
        proveedor: {
          select: { 
            id_proveedor: true,
            razon_social: true 
          }
        },
        usuarios: {
          select: { 
            id: true,
            username: true 
          }
        }
      }
    })
    
    return orden.id_order
  } catch (error) {
    console.error('Error al crear orden:', error)
    throw error
  }
}

async function actualizarEstadoOrden(id_orden, nuevoEstado) {
  try {
    const ordenId = parseInt(id_orden)
    if (isNaN(ordenId)) {
      throw new Error('ID de orden debe ser un número válido')
    }

    // Validar estado
    const estadosValidos = ['en_curso', 'completada', 'cancelada']
    if (!estadosValidos.includes(nuevoEstado)) {
      throw new Error(`Estado debe ser uno de: ${estadosValidos.join(', ')}`)
    }

    return await prisma.orden_reabastecimiento.update({
      where: { id_order: ordenId },
      data: { estado: nuevoEstado },
      include: {
        proveedor: {
          select: { razon_social: true }
        }
      }
    })
  } catch (error) {
    console.error('Error al actualizar estado de orden:', error)
    throw error
  }
}

async function obtenerOrdenPorId(id_order) {
  try {
    const ordenId = parseInt(id_order)
    if (isNaN(ordenId)) {
      throw new Error('ID de orden debe ser un número válido')
    }

    const orden = await prisma.orden_reabastecimiento.findUnique({
      where: { id_order: ordenId },
      include: {
        proveedor: { 
          select: { 
            id_proveedor: true,
            razon_social: true,
            ruc: true,
            numero_telefono: true,
            correo: true,
            direccion: true
          } 
        },
        usuarios: { // Corregido: usuarios en lugar de usuario
          select: { 
            id: true,
            username: true,
            email: true
          } 
        },
        // Incluir incidencias relacionadas
        incidencia: {
          select: {
            id_incidencia: true,
            descripcion_general: true,
            fecha: true
          }
        },
        // Incluir movimientos de entrada relacionados
        movimiento_entrada: {
          select: {
            id_movimiento: true,
            total: true,
            movimiento: {
              select: {
                fecha: true,
                descripcion: true
              }
            }
          }
        }
      }
    })

    if (!orden) return null

    // Asegurar que products sea un array
    return {
      ...orden,
      products: Array.isArray(orden.products) ? orden.products : []
    }
  } catch (error) {
    console.error('Error al obtener orden por ID:', error)
    throw error
  }
}

async function actualizarProductosOrden(id_order, nuevosProductos) {
  try {
    const ordenId = parseInt(id_order)
    if (isNaN(ordenId)) {
      throw new Error('ID de orden debe ser un número válido')
    }

    // Validar que nuevosProductos sea un array
    if (!Array.isArray(nuevosProductos)) {
      throw new Error('Los productos deben ser un array')
    }

    return await prisma.orden_reabastecimiento.update({
      where: { id_order: ordenId },
      data: { products: nuevosProductos },
      include: {
        proveedor: {
          select: { razon_social: true }
        }
      }
    })
  } catch (error) {
    console.error('Error al actualizar productos de orden:', error)
    throw error
  }
}

async function buscarOrdenPorProductoEnCurso(idProducto) {
  try {
    const productoId = parseInt(idProducto)
    if (isNaN(productoId)) {
      throw new Error('ID de producto debe ser un número válido')
    }

    const ordenes = await prisma.orden_reabastecimiento.findMany({
      where: { estado: 'en_curso' },
      include: { 
        proveedor: { 
          select: { 
            id_proveedor: true,
            razon_social: true 
          } 
        } 
      }
    })

    for (const orden of ordenes) {
      const productos = Array.isArray(orden.products) ? orden.products : []
      const contiene = productos.find(p => Number(p.id_producto) === productoId)
      if (contiene) {
        return {
          id_orden: orden.id_order,
          fecha: orden.fecha,
          proveedor: orden.proveedor.razon_social,
          productos,
          estado: orden.estado
        }
      }
    }
    return null
  } catch (error) {
    console.error('Error al buscar orden por producto en curso:', error)
    throw error
  }
}

async function obtenerOrdenesUltimos30Dias() {
  try {
    const limite = new Date()
    limite.setDate(limite.getDate() - 30)

    return await prisma.orden_reabastecimiento.findMany({
      where: { fecha: { gte: limite } },
      select: { 
        id_order: true, 
        fecha: true,
        estado: true,
        proveedor: {
          select: { razon_social: true }
        }
      },
      orderBy: { fecha: 'desc' }
    })
  } catch (error) {
    console.error('Error al obtener órdenes últimos 30 días:', error)
    throw error
  }
}

async function obtenerDetalleOrdenesPorFecha(fechaLimaString) {
  try {
    if (!fechaLimaString) {
      throw new Error('Fecha es requerida')
    }

    const inicioUTC = DateTime.fromISO(fechaLimaString, { zone: 'America/Lima' })
      .startOf('day')
      .toUTC()
      .toJSDate()

    const finUTC = DateTime.fromISO(fechaLimaString, { zone: 'America/Lima' })
      .endOf('day')
      .toUTC()
      .toJSDate()

    return await prisma.orden_reabastecimiento.findMany({
      where: {
        fecha: {
          gte: inicioUTC,
          lte: finUTC
        }
      },
      include: {
        proveedor: { 
          select: { 
            id_proveedor: true,
            razon_social: true,
            ruc: true
          } 
        },
        usuarios: {
          select: {
            id: true,
            username: true
          }
        }
      },
      orderBy: { fecha: 'asc' }
    })
  } catch (error) {
    console.error('Error al obtener detalle órdenes por fecha:', error)
    throw error
  }
}

async function cancelarOrden(idOrden) {
  try {
    const ordenId = parseInt(idOrden)
    if (isNaN(ordenId)) {
      throw new Error('ID de orden debe ser un número válido')
    }

    return await prisma.orden_reabastecimiento.update({
      where: { id_order: ordenId },
      data: { estado: 'cancelada' },
      include: {
        proveedor: {
          select: { razon_social: true }
        }
      }
    })
  } catch (error) {
    console.error('Error al cancelar orden:', error)
    throw error
  }
}

// Función adicional útil: obtener órdenes por proveedor
async function obtenerOrdenesPorProveedor(id_proveedor, estado = null) {
  try {
    const proveedorId = parseInt(id_proveedor)
    if (isNaN(proveedorId)) {
      throw new Error('ID de proveedor debe ser un número válido')
    }

    const whereClause = { id_proveedor: proveedorId }
    if (estado) {
      whereClause.estado = estado
    }

    return await prisma.orden_reabastecimiento.findMany({
      where: whereClause,
      include: {
        proveedor: {
          select: { razon_social: true }
        },
        usuarios: {
          select: { username: true }
        }
      },
      orderBy: { fecha: 'desc' }
    })
  } catch (error) {
    console.error('Error al obtener órdenes por proveedor:', error)
    throw error
  }
}

module.exports = {
  obtenerOrdenes,
  crearOrden,
  obtenerOrdenPorId,
  actualizarEstadoOrden,
  actualizarProductosOrden,
  buscarOrdenPorProductoEnCurso,
  obtenerOrdenesUltimos30Dias,
  obtenerDetalleOrdenesPorFecha,
  cancelarOrden,
  obtenerOrdenesPorProveedor
}
