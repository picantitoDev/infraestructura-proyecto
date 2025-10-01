// queriesCategorias.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function obtenerCategorias() {
  return await prisma.categoria.findMany({
    orderBy: { id_categoria: 'asc' },
  })
}

async function obtenerCategoriasActivas() {
  return await prisma.categoria.findMany({
    where: { estado: 'activa' },
    orderBy: { id_categoria: 'asc' },
  })
}

async function crearCategoria(nombre) {
  await prisma.categoria.create({
    data: { nombre },
  })
}

async function renombrarCategoria(id, nuevoNombre) {
  await prisma.categoria.update({
    where: { id_categoria: id },
    data: { nombre: nuevoNombre },
  })
}

async function cambiarEstadoCategoria(id, nuevoEstado) {
  try {
    if (nuevoEstado === 'inactiva') {
      // Verificar si hay productos activos con stock
      const total = await prisma.producto.count({
        where: {
          id_categoria: id,
          estado: 'Activado',
          stock: { gt: 0 },
        },
      })

      if (total > 0) {
        throw new Error(
          `No se puede desactivar la categoría porque hay ${total} producto(s) activos con stock.`
        )
      }

      // Actualizar estado de productos
      await prisma.producto.updateMany({
        where: { id_categoria: id },
        data: { estado: 'Desactivado' },
      })
    }

    // Cambiar el estado de la categoría
    await prisma.categoria.update({
      where: { id_categoria: id },
      data: { estado: nuevoEstado },
    })
  } catch (error) {
    console.error('Error al cambiar estado de categoría:', error)
    throw error
  }
}

module.exports = {
  obtenerCategorias,
  crearCategoria,
  renombrarCategoria,
  cambiarEstadoCategoria,
  obtenerCategoriasActivas,
}
