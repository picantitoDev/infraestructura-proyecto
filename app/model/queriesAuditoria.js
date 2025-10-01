const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Registrar una auditoría de producto
async function registrarAuditoriaProducto({ id_producto, id_usuario, accion, campos_modificados, fecha }) {
  try {
    // Validar que los IDs sean números
    const productoId = parseInt(id_producto)
    const usuarioId = parseInt(id_usuario)
    
    if (isNaN(productoId) || isNaN(usuarioId)) {
      throw new Error('IDs de producto y usuario deben ser números válidos')
    }

    // Validar que la acción sea proporcionada
    if (!accion || typeof accion !== 'string') {
      throw new Error('La acción es requerida y debe ser un string')
    }

    // Preparar datos para insertar
    const dataToInsert = {
      id_producto: productoId,
      id_usuario: usuarioId,
      accion,
      campos_modificados: campos_modificados || {}, // JSON field
    }

    // Solo agregar fecha si se proporciona, sino Prisma usará el default (now())
    if (fecha) {
      const fechaDate = fecha instanceof Date ? fecha : new Date(fecha)
      if (isNaN(fechaDate.getTime())) {
        throw new Error('Fecha inválida')
      }
      dataToInsert.fecha = fechaDate
    }

    return await prisma.auditoria_producto.create({
      data: dataToInsert,
      include: {
        usuarios: {
          select: { id: true, username: true }
        },
        producto: {
          select: { id_producto: true, nombre: true }
        }
      }
    })
  } catch (error) {
    console.error('Error al registrar auditoría de producto:', error)
    throw error
  }
}

// Obtener auditorías con datos de usuario y producto
async function obtenerAuditoriasConUsuarios() {
  try {
    const result = await prisma.auditoria_producto.findMany({
      include: {
        usuarios: {  // Nombre correcto según schema: usuarios (no usuario)
          select: { id: true, username: true }
        },
        producto: {  // Nombre correcto según schema: producto
          select: { id_producto: true, nombre: true }
        }
      },
      orderBy: { fecha: 'desc' }
    })

    // Mapear al formato esperado
    return result.map(a => ({
      id_auditoria: a.id_auditoria,
      id_producto: a.id_producto,
      nombre_producto: a.producto?.nombre,
      id_usuario: a.id_usuario,
      username: a.usuarios?.username, // Cambiado de usuario a usuarios
      accion: a.accion,
      campos_modificados: a.campos_modificados,
      fecha: a.fecha
    }))
  } catch (error) {
    console.error('Error al obtener auditorías con usuarios:', error)
    throw error
  }
}

// Obtener auditorías por producto específico
async function obtenerAuditoriasPorProducto(id_producto) {
  try {
    const productoId = parseInt(id_producto)
    if (isNaN(productoId)) {
      throw new Error('ID de producto debe ser un número válido')
    }

    const result = await prisma.auditoria_producto.findMany({
      where: { id_producto: productoId },
      include: {
        usuarios: {
          select: { id: true, username: true }
        },
        producto: {
          select: { id_producto: true, nombre: true }
        }
      },
      orderBy: { fecha: 'desc' }
    })

    return result.map(a => ({
      id_auditoria: a.id_auditoria,
      id_producto: a.id_producto,
      nombre_producto: a.producto?.nombre,
      id_usuario: a.id_usuario,
      username: a.usuarios?.username,
      accion: a.accion,
      campos_modificados: a.campos_modificados,
      fecha: a.fecha
    }))
  } catch (error) {
    console.error('Error al obtener auditorías por producto:', error)
    throw error
  }
}

// Obtener auditorías por usuario específico
async function obtenerAuditoriasPorUsuario(id_usuario) {
  try {
    const usuarioId = parseInt(id_usuario)
    if (isNaN(usuarioId)) {
      throw new Error('ID de usuario debe ser un número válido')
    }

    const result = await prisma.auditoria_producto.findMany({
      where: { id_usuario: usuarioId },
      include: {
        usuarios: {
          select: { id: true, username: true }
        },
        producto: {
          select: { id_producto: true, nombre: true }
        }
      },
      orderBy: { fecha: 'desc' }
    })

    return result.map(a => ({
      id_auditoria: a.id_auditoria,
      id_producto: a.id_producto,
      nombre_producto: a.producto?.nombre,
      id_usuario: a.id_usuario,
      username: a.usuarios?.username,
      accion: a.accion,
      campos_modificados: a.campos_modificados,
      fecha: a.fecha
    }))
  } catch (error) {
    console.error('Error al obtener auditorías por usuario:', error)
    throw error
  }
}

module.exports = {
  registrarAuditoriaProducto,
  obtenerAuditoriasConUsuarios,
  obtenerAuditoriasPorProducto,
  obtenerAuditoriasPorUsuario
}
