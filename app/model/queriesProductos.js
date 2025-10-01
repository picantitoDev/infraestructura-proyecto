const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Obtener todos los productos con categoría y proveedor
async function obtenerProductos() {
  return await prisma.producto.findMany({
    select: {
      id_producto: true,
      nombre: true,
      stock: true,
      precio_unitario: true,
      cantidad_minima: true,
      estado: true,
      categoria: { select: { nombre: true } },
      proveedor: { select: { razon_social: true } }
    },
    orderBy: { nombre: 'asc' }
  })
}

// Similar a obtenerProductos pero con id_proveedor
async function obtenerProductosParaOrden() {
  const productos = await prisma.producto.findMany({
    select: {
      id_producto: true,
      nombre: true,
      stock: true,
      precio_unitario: true,
      cantidad_minima: true,
      estado: true,
      id_proveedor: true,
      categoria: { select: { nombre: true } },
      proveedor: { select: { razon_social: true } }
    },
    orderBy: { nombre: 'asc' }
  })

  const productosAplanados =  productos.map(p => ({
    id_producto: p.id_producto,
    nombre: p.nombre,
    stock: p.stock,
    precio_unitario: p.precio_unitario,
    cantidad_minima: p.cantidad_minima,
    estado: p.estado,
    id_proveedor: p.id_proveedor,
    categoria: p.categoria?.nombre || null,
    proveedor: p.proveedor?.razon_social || null
  }))

  return productosAplanados
}


// Productos críticos: stock < cantidad_minima y sin orden en curso
async function obtenerProductosCriticos() {
  const productos = await prisma.producto.findMany({
    where: {
      stock: { lt: prisma.producto.fields.cantidad_minima },
      estado: 'Activado',
    },
    select: { id_producto: true }
  })

  // Filtrar los que están en orden_reabastecimiento con estado en_curso
  const productosEnCurso = await prisma.orden_reabastecimiento.findMany({
    where: { estado: 'en_curso' },
    select: { products: true }
  })

  const idsEnCurso = new Set(
    productosEnCurso.flatMap(o => (o.products || []).map(p => p.id_producto))
  )

  const criticos = productos.filter(p => !idsEnCurso.has(p.id_producto))
  return criticos.length
}

// Obtener un producto por ID
async function obtenerProductoPorId(id) {
  return await prisma.producto.findUnique({
    where: { id_producto: id },
    select: {
      id_producto: true,
      nombre: true,
      stock: true,
      precio_unitario: true,
      cantidad_minima: true,
      estado: true,
      id_categoria: true,
      id_proveedor: true,
      categoria: { select: { nombre: true } },
      proveedor: { select: { razon_social: true } }
    }
  })
}

// Crear producto
async function crearProducto(nombre, stock, precio_unitario, id_categoria, id_proveedor, cantidad_minima) {
  await prisma.producto.create({
    data: {
      nombre,
      stock,
      precio_unitario,
      id_categoria,
      id_proveedor,
      cantidad_minima,
      estado: 'Activado'
    }
  })
}

// Obtener ID por nombre
async function obtenerIdProductoPorNombre(nombre) {
  const producto = await prisma.producto.findFirst({
    where: { nombre },
    select: { id_producto: true }
  })
  return producto ? producto.id_producto : null
}

// Actualizar producto
async function actualizarProducto(id, producto) {
  await prisma.producto.update({
    where: { id_producto: id },
    data: {
      nombre: producto.nombre,
      stock: producto.stock,
      precio_unitario: producto.precio_unitario,
      id_categoria: producto.id_categoria,
      id_proveedor: producto.id_proveedor,
      cantidad_minima: producto.cantidad_minima,
      estado: producto.estado
    }
  })
}

// Aumentar stock
async function aumentarStock(id_producto, cantidad) {
  await prisma.producto.update({
    where: { id_producto },
    data: { stock: { increment: cantidad } }
  })
}

// Disminuir stock
async function disminuirStock(id_producto, cantidad) {
  await prisma.producto.update({
    where: { id_producto },
    data: { stock: { decrement: cantidad } }
  })
}

// Productos en órdenes en curso
async function obtenerProductosEnOrdenesEnCurso() {
  const ordenes = await prisma.orden_reabastecimiento.findMany({
    where: { estado: 'en_curso' },
    select: { products: true }
  })

  return [
    ...new Set(
      ordenes.flatMap(o => (o.products || []).map(p => p.id_producto))
    )
  ]
}

// Ranking por cantidad vendida
async function obtenerRankingPorCantidad() {
  const result = await prisma.producto_movimiento.groupBy({
    by: ['id_producto'],
    _sum: { cantidad: true },
    orderBy: { _sum: { cantidad: 'desc' } }
  })

  return await Promise.all(result.map(async r => {
    const prod = await prisma.producto.findUnique({
      where: { id_producto: r.id_producto },
      select: { nombre: true }
    })
    return { id_producto: r.id_producto, nombre: prod.nombre, total_vendido: r._sum.cantidad }
  }))
}

// Ranking por ingresos
async function obtenerRankingPorIngresos() {
  const result = await prisma.producto_movimiento.groupBy({
    by: ['id_producto'],
    _sum: { subtotal: true },
    orderBy: { _sum: { subtotal: 'desc' } }
  })

  return await Promise.all(result.map(async r => {
    const prod = await prisma.producto.findUnique({
      where: { id_producto: r.id_producto },
      select: { nombre: true }
    })
    return { id_producto: r.id_producto, nombre: prod.nombre, total_ingresos: r._sum.subtotal }
  }))
}

module.exports = {
  obtenerProductos,
  obtenerProductosParaOrden,
  obtenerProductosCriticos,
  obtenerProductoPorId,
  crearProducto,
  obtenerIdProductoPorNombre,
  actualizarProducto,
  aumentarStock,
  disminuirStock,
  obtenerProductosEnOrdenesEnCurso,
  obtenerRankingPorCantidad,
  obtenerRankingPorIngresos
}
