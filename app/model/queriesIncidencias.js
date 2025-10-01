const { PrismaClient } = require('@prisma/client')
const { DateTime } = require('luxon')
const prisma = new PrismaClient()

/**
 * Registra una incidencia asociada a un movimiento.
 */
async function registrarIncidencia({
  id_movimiento,
  descripcion_general,
  detalle_productos,
  id_orden = null,
  fecha = new Date(),
}) {
  try {
    // Validar que id_movimiento sea un número válido
    const movimientoId = parseInt(id_movimiento)
    if (isNaN(movimientoId)) {
      throw new Error('ID de movimiento debe ser un número válido')
    }

    // Validar id_orden si se proporciona
    let ordenId = null
    if (id_orden !== null && id_orden !== undefined) {
      ordenId = parseInt(id_orden)
      if (isNaN(ordenId)) {
        throw new Error('ID de orden debe ser un número válido')
      }
    }

    // Validar fecha
    const fechaDate = fecha instanceof Date ? fecha : new Date(fecha)
    if (isNaN(fechaDate.getTime())) {
      throw new Error('Fecha inválida')
    }

    const dataToInsert = {
      id_movimiento: movimientoId,
      descripcion_general: descripcion_general || null,
      detalle_productos: detalle_productos || null, // JSON field
      id_orden: ordenId,
      fecha: fechaDate,
    }

    return await prisma.incidencia.create({
      data: dataToInsert,
      include: {
        movimiento: {
          select: {
            id_movimiento: true,
            fecha: true,
            descripcion: true,
            usuarios: { // Corregido: usuarios en lugar de usuario
              select: { id: true, username: true }
            }
          }
        },
        orden_reabastecimiento: { // Relación con orden si existe
          select: {
            id_order: true,
            estado: true
          }
        }
      }
    })
  } catch (error) {
    console.error('Error al registrar incidencia:', error)
    throw error
  }
}

async function obtenerIncidencias() {
  try {
    return await prisma.incidencia.findMany({
      orderBy: { fecha_registro: 'desc' },
      include: {
        movimiento: {
          select: {
            id_movimiento: true,
            fecha: true,
            descripcion: true,
            usuarios: { // Corregido: usuarios en lugar de usuario
              select: { id: true, username: true }
            }
          }
        },
        orden_reabastecimiento: { // Agregado para completar la info
          select: {
            id_order: true,
            estado: true,
            proveedor: {
              select: { id_proveedor: true, razon_social: true }
            }
          }
        }
      }
    })
  } catch (error) {
    console.error('Error al obtener incidencias:', error)
    throw error
  }
}

async function obtenerIncidenciasPorOrden(id_orden) {
  try {
    const ordenId = parseInt(id_orden)
    if (isNaN(ordenId)) {
      throw new Error('ID de orden debe ser un número válido')
    }

    const incidencias = await prisma.incidencia.findMany({
      where: { id_orden: ordenId },
      orderBy: { id_incidencia: 'asc' },
      select: {
        id_incidencia: true,
        id_movimiento: true,
        descripcion_general: true,
        detalle_productos: true,
        fecha: true,
        fecha_registro: true
      }
    })

    return incidencias.map(row => ({
      id_incidencia: row.id_incidencia,
      id_movimiento: row.id_movimiento,
      descripcion_general: row.descripcion_general,
      detalle_productos: row.detalle_productos ?? [], // seguridad para JSON
      fecha: row.fecha,
      fecha_registro: row.fecha_registro
    }))
  } catch (error) {
    console.error('Error al obtener incidencias por orden:', error)
    throw error
  }
}

async function obtenerIncidenciaPorId(id_incidencia) {
  try {
    const incidenciaId = parseInt(id_incidencia)
    if (isNaN(incidenciaId)) {
      throw new Error('ID de incidencia debe ser un número válido')
    }

    const incidencia = await prisma.incidencia.findUnique({
      where: { id_incidencia: incidenciaId },
      include: {
        movimiento: {
          select: {
            id_movimiento: true,
            fecha: true,
            descripcion: true,
            tipo: true,
            usuarios: {
              select: { id: true, username: true }
            }
          }
        },
        orden_reabastecimiento: {
          select: {
            id_order: true,
            estado: true,
            fecha: true,
            proveedor: {
              select: { id_proveedor: true, razon_social: true }
            }
          }
        }
      }
    })

    if (!incidencia) return null

    // Asegurar que detalle_productos sea un array
    return {
      ...incidencia,
      detalle_productos: Array.isArray(incidencia.detalle_productos)
        ? incidencia.detalle_productos
        : []
    }
  } catch (error) {
    console.error('Error al obtener incidencia por ID:', error)
    throw error
  }
}

async function obtenerIncidenciasUltimos30Dias() {
  try {
    const limite = new Date()
    limite.setDate(limite.getDate() - 30)

    return await prisma.incidencia.findMany({
      where: {
        fecha: { gte: limite }
      },
      select: {
        id_incidencia: true,
        fecha: true,
        fecha_registro: true,
        descripcion_general: true
      },
      orderBy: { fecha: 'desc' }
    })
  } catch (error) {
    console.error('Error al obtener incidencias últimos 30 días:', error)
    throw error
  }
}

async function obtenerIncidenciasPorFecha(fechaLima) {
  try {
    if (!fechaLima) {
      throw new Error('Fecha es requerida')
    }

    const inicioUTC = DateTime.fromISO(fechaLima, { zone: 'America/Lima' })
      .startOf('day')
      .toUTC()
      .toJSDate()

    const finUTC = DateTime.fromISO(fechaLima, { zone: 'America/Lima' })
      .endOf('day')
      .toUTC()
      .toJSDate()

    return await prisma.incidencia.findMany({
      where: {
        fecha: {
          gte: inicioUTC,
          lte: finUTC
        }
      },
      include: {
        movimiento: {
          select: {
            id_movimiento: true,
            tipo: true,
            fecha: true,
            usuarios: {
              select: { id: true, username: true }
            }
          }
        }
      },
      orderBy: { fecha: 'asc' }
    })
  } catch (error) {
    console.error('Error al obtener incidencias por fecha:', error)
    throw error
  }
}

// Función adicional útil: obtener incidencias por movimiento
async function obtenerIncidenciasPorMovimiento(id_movimiento) {
  try {
    const movimientoId = parseInt(id_movimiento)
    if (isNaN(movimientoId)) {
      throw new Error('ID de movimiento debe ser un número válido')
    }

    return await prisma.incidencia.findMany({
      where: { id_movimiento: movimientoId },
      orderBy: { fecha_registro: 'desc' },
      include: {
        movimiento: {
          select: {
            id_movimiento: true,
            tipo: true,
            fecha: true,
            usuarios: {
              select: { id: true, username: true }
            }
          }
        }
      }
    })
  } catch (error) {
    console.error('Error al obtener incidencias por movimiento:', error)
    throw error
  }
}

module.exports = {
  registrarIncidencia,
  obtenerIncidencias,
  obtenerIncidenciasPorOrden,
  obtenerIncidenciaPorId,
  obtenerIncidenciasUltimos30Dias,
  obtenerIncidenciasPorFecha,
  obtenerIncidenciasPorMovimiento
}
