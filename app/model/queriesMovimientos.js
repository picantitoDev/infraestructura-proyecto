const { PrismaClient } = require('@prisma/client')
const { DateTime } = require('luxon')
const prisma = new PrismaClient()

// === OBTENER MOVIMIENTOS ===
async function obtenerMovimientos() {
  return prisma.movimiento.findMany({
    orderBy: { id_movimiento: 'desc' }
  })
}

async function obtenerDetalleMovimiento(idMov) {
  return prisma.movimiento.findUnique({
    where: { id_movimiento: idMov },
    include: {
      usuarios: { select: { username: true } },
      movimiento_venta: {
        include: { cliente: true }
      },
      movimiento_entrada: {
        include: { proveedor: true }
      },
      movimiento_ajuste: true,
      producto_movimiento: {
        include: { producto: true }
      }
    }
  })
}

// === REPORTES ===
async function obtenerMovimientosVentas(fechaInicio, fechaFin) {
  return prisma.$queryRaw`
    SELECT m.id_movimiento, m.fecha, m.descripcion, u.username AS usuario,
           mv.tipo_comprobante, mv.serie, mv.correlativo, mv.total AS total_venta,
           c.nombre_cliente, c.razon_social, c.ruc_cliente, c.dni_cliente, c.direccion_cliente, c.correo_cliente,
           p.id_producto, p.nombre AS producto, pm.cantidad, pm.precio_unitario, pm.subtotal
    FROM movimiento m
    JOIN movimiento_venta mv ON m.id_movimiento = mv.id_movimiento
    JOIN usuarios u ON m.id_usuario = u.id
    JOIN cliente c ON mv.id_cliente = c.id_cliente
    JOIN producto_movimiento pm ON m.id_movimiento = pm.id_movimiento
    JOIN producto p ON pm.id_producto = p.id_producto
    WHERE m.tipo = 'Venta'
      AND m.fecha::date BETWEEN ${fechaInicio} AND ${fechaFin}
    ORDER BY m.fecha DESC, m.id_movimiento
  `
}

async function obtenerMovimientosMermas(fechaInicio, fechaFin) {
  return prisma.$queryRaw`
    SELECT m.id_movimiento, m.fecha, m.descripcion, u.username AS usuario,
           ma.motivo, p.id_producto, p.nombre AS producto,
           pm.cantidad, pm.precio_unitario, pm.subtotal
    FROM movimiento m
    JOIN movimiento_ajuste ma ON m.id_movimiento = ma.id_movimiento
    JOIN usuarios u ON m.id_usuario = u.id
    JOIN producto_movimiento pm ON m.id_movimiento = pm.id_movimiento
    JOIN producto p ON pm.id_producto = p.id_producto
    WHERE m.tipo = 'Merma'
      AND ma.tipo_ajuste = 'Merma'
      AND m.fecha::date BETWEEN ${fechaInicio} AND ${fechaFin}
    ORDER BY m.fecha DESC, m.id_movimiento
  `
}

async function obtenerMovimientosEntradas(fechaInicio, fechaFin) {
  return prisma.$queryRaw`
    SELECT m.id_movimiento, m.fecha, m.descripcion, u.username AS usuario,
           me.total AS total_entrada, me.id_orden,
           pr.razon_social, pr.ruc, pr.direccion, pr.correo,
           p.id_producto, p.nombre AS producto,
           pm.cantidad, pm.precio_unitario, pm.subtotal
    FROM movimiento m
    JOIN movimiento_entrada me ON m.id_movimiento = me.id_movimiento
    JOIN usuarios u ON m.id_usuario = u.id
    JOIN proveedor pr ON me.id_proveedor = pr.id_proveedor
    JOIN producto_movimiento pm ON m.id_movimiento = pm.id_movimiento
    JOIN producto p ON pm.id_producto = p.id_producto
    WHERE m.tipo = 'Compra'
      AND m.fecha::date BETWEEN ${fechaInicio} AND ${fechaFin}
    ORDER BY m.fecha DESC, m.id_movimiento
  `
}

async function obtenerMovimientosSobrantes(fechaInicio, fechaFin) {
  return prisma.$queryRaw`
    SELECT m.id_movimiento, m.fecha, m.descripcion, u.username AS usuario,
           ma.motivo, p.id_producto, p.nombre AS producto,
           pm.cantidad, pm.precio_unitario, pm.subtotal
    FROM movimiento m
    JOIN movimiento_ajuste ma ON m.id_movimiento = ma.id_movimiento
    JOIN usuarios u ON m.id_usuario = u.id
    JOIN producto_movimiento pm ON m.id_movimiento = pm.id_movimiento
    JOIN producto p ON pm.id_producto = p.id_producto
    WHERE m.tipo = 'Sobrante'
      AND ma.tipo_ajuste = 'Sobrante'
      AND m.fecha::date BETWEEN ${fechaInicio} AND ${fechaFin}
    ORDER BY m.fecha DESC, m.id_movimiento
  `
}

// === REGISTRO DE MOVIMIENTOS ===
async function registrarMovimiento({ id_usuario, tipo, fecha, descripcion }) {
  try {
    const movimiento = await prisma.movimiento.create({
      data: { id_usuario, tipo, fecha, descripcion }
    })
    return movimiento.id_movimiento
  } catch (error) {
    console.error("Error al insertar movimiento:", error)
    throw error
  }
}

async function registrarMovimientoVenta({ id_movimiento, id_cliente, tipo_comprobante, total }) {
  try {
    const serie = tipo_comprobante === "boleta" ? "B001" : "F001"

    // Calcular correlativo actual
    const { _max } = await prisma.movimiento_venta.aggregate({
      where: { tipo_comprobante },
      _max: { correlativo: true }
    })
    const correlativo = (_max.correlativo ?? 0) + 1

    await prisma.movimiento_venta.create({
      data: {
        id_movimiento,
        id_cliente,
        tipo_comprobante,
        serie,
        correlativo,
        total
      }
    })
  } catch (error) {
    console.error("Error al insertar movimiento venta:", error)
    throw error
  }
}

async function registrarMovimientoCompra({ id_movimiento, id_proveedor, total, id_orden }) {
  try {
    await prisma.movimiento_entrada.create({
      data: { id_movimiento, id_proveedor, total, id_orden }
    })
  } catch (error) {
    console.error("Error al insertar movimiento compra:", error)
    throw error
  }
}

async function registrarMovimientoAjuste({ id_movimiento, tipo_ajuste, motivo }) {
  try {
    await prisma.movimiento_ajuste.create({
      data: { id_movimiento, tipo_ajuste, motivo }
    })
  } catch (error) {
    console.error("Error al insertar movimiento ajuste:", error)
    throw error
  }
}

async function registrarProductoMovimiento({ id_producto, id_movimiento, cantidad, precio_unitario, subtotal }) {
  try {
    await prisma.producto_movimiento.create({
      data: { id_producto, id_movimiento, cantidad, precio_unitario, subtotal }
    })
  } catch (error) {
    console.error("Error al insertar producto movimiento:", error)
    throw error
  }
}

// === DASHBOARD ===
async function obtenerResumenVentas30Dias() {
  return prisma.$queryRaw`
    SELECT m.fecha::DATE AS fecha, SUM(v.total) AS total
    FROM movimiento m
    JOIN movimiento_venta v ON m.id_movimiento = v.id_movimiento
    WHERE m.tipo = 'Venta'
      AND m.fecha >= NOW() - INTERVAL '30 days'
    GROUP BY 1
    ORDER BY 1
  `
}

async function obtenerDetalleVentaPorFecha(fecha) {
  const fechaInicio = `${fecha}T00:00:00.000Z`
  const fechaFin = `${fecha}T23:59:59.999Z`

  return prisma.$queryRaw`
    SELECT m.id_movimiento, p.nombre, pm.cantidad, pm.subtotal
    FROM producto_movimiento pm
    JOIN producto p ON p.id_producto = pm.id_producto
    JOIN movimiento m ON m.id_movimiento = pm.id_movimiento
    WHERE m.tipo = 'Venta'
      AND m.fecha BETWEEN ${fechaInicio} AND ${fechaFin}
  `
}

async function obtenerMermasUltimos30Dias() {
  return prisma.movimiento.findMany({
    where: {
      tipo: 'Merma',
      fecha: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    },
    select: { fecha: true }
  })
}

async function obtenerSobrantesUltimos30Dias() {
  return prisma.movimiento.findMany({
    where: {
      tipo: 'Sobrante',
      fecha: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    },
    select: { fecha: true }
  })
}

async function obtenerMovimientosAjustePorFecha(tipoAjuste, fechaLima) {
  const inicioUTC = DateTime.fromISO(fechaLima, { zone: "America/Lima" })
    .startOf("day")
    .toUTC()
    .toISO()
  const finUTC = DateTime.fromISO(fechaLima, { zone: "America/Lima" })
    .endOf("day")
    .toUTC()
    .toISO()

  return prisma.$queryRaw`
    SELECT m.id_movimiento, m.descripcion, pm.id_producto,
           p.nombre AS nombre_producto, pm.cantidad
    FROM movimiento m
    JOIN producto_movimiento pm ON pm.id_movimiento = m.id_movimiento
    JOIN producto p ON p.id_producto = pm.id_producto
    WHERE m.tipo = ${tipoAjuste}
      AND m.fecha BETWEEN ${inicioUTC} AND ${finUTC}
    ORDER BY m.fecha ASC
  `
}

module.exports = {
  obtenerMovimientos,
  obtenerDetalleMovimiento,
  registrarMovimiento,
  registrarMovimientoVenta,
  registrarMovimientoCompra,
  registrarMovimientoAjuste,
  registrarProductoMovimiento,
  obtenerMovimientosVentas,
  obtenerMovimientosEntradas,
  obtenerMovimientosMermas,
  obtenerMovimientosSobrantes,
  obtenerResumenVentas30Dias,
  obtenerDetalleVentaPorFecha,
  obtenerMermasUltimos30Dias,
  obtenerSobrantesUltimos30Dias,
  obtenerMovimientosAjustePorFecha
}
