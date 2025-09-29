const dbMovimientos = require("../model/queriesMovimientos")
const dbProductos = require("../model/queriesProductos")
const dbProveedores = require("../model/queriesProveedores")
const dbIncidencias = require("../model/queriesIncidencias")
const dbUsuarios = require("../model/queriesUsuarios")
const dbClientes = require("../model/queriesClientes")
const dbOrdenes = require("../model/queriesOrdenes")
const pdfUtils = require("../utils/pdfGenerator")
const excelUtils = require("../utils/excelGenerator")
const cacheInvalidator = require("../utils/cacheInvalidator")

const { DateTime } = require("luxon")
const { getOrSetCache, redisClient } = require("../utils/redis")

function ensureBuffer(x) {
  if (!x) return Buffer.alloc(0);
  if (Buffer.isBuffer(x)) return x;
  if (x instanceof Uint8Array) return Buffer.from(x);
  if (x && typeof x === "object" && x.type === "Buffer" && Array.isArray(x.data)) {
    return Buffer.from(x.data);
  }
  // último intento: si es array-like (e.g., [1,2,3]) o ArrayBuffer
  try { return Buffer.from(x); } catch { return Buffer.from(String(x)); }
}

async function obtenerMovimientos(req, res) {
  try {
    const movimientos = await getOrSetCache("movimientos:all", () =>
      dbMovimientos.obtenerMovimientos()
    )
    const usuarios = await getOrSetCache("usuarios:all", () =>
      dbUsuarios.obtenerUsuarios()
    )
    res.render("movimientos", { movimientos, usuarios })
  } catch (error) {
    console.error("Error al obtener movimientos:", error)
    res.status(500).send("Error al obtener los movimientos")
  }
}

async function exportarReporteExcel(req, res) {
  try {
    const { tipo, desde, hasta } = req.query;
    console.log(req.query);

    // Validar que se reciban los parámetros necesarios
    if (!tipo) {
      return res.status(400).send("El parámetro 'tipo' es obligatorio");
    }
    if (!desde || !hasta) {
      return res.status(400).send("Debe especificar los parámetros 'desde' y 'hasta'");
    }

    let buffer;

    switch (tipo) {
      case 'Venta':
        buffer = await excelUtils.generarExcelVentas(desde, hasta);
        break;
      case 'Compra':
        buffer = await excelUtils.generarExcelEntradas(desde, hasta);
        break;
      case 'Merma':
        buffer = await excelUtils.generarExcelMermas(desde, hasta);
        break;
      case 'Sobrante':
        buffer = await excelUtils.generarExcelSobrantes(desde, hasta);
        break;
      case 'Todos':
        buffer = await excelUtils.generarExcelTodos(desde, hasta);
        break;
      default:
        return res.status(400).send("Tipo de reporte no válido. Debe ser uno de: ventas, entradas, mermas, sobrantes, todos.");
    }

    // Configurar headers para que el navegador descargue el archivo
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Nombre del archivo con fecha para mejor orden
    const fechaDesde = new Date(desde).toISOString().split('T')[0];
    const fechaHasta = new Date(hasta).toISOString().split('T')[0];
    const nombreArchivo = `Reporte_${tipo}_${fechaDesde}_a_${fechaHasta}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename=${nombreArchivo}`);

    // Enviar buffer
    const out = ensureBuffer(buffer);
    res.send(out);

  } catch (error) {
    console.error("Error exportando Excel:", error);
    res.status(500).send("Error generando el reporte");
  }
}

async function verDetalleMovimiento(req, res) {
  try {
    const idMov = parseInt(req.params.id)
    const movimientoDetalle = await getOrSetCache(`movimientos:detalle:${idMov}`, () =>
      dbMovimientos.obtenerDetalleMovimiento(idMov)
    )
    if (movimientoDetalle.length === 0) {
      return res.status(404).send("Movimiento no encontrado")
    }
    const proveedores = await getOrSetCache("proveedores:all", () =>
      dbProveedores.obtenerProveedores()
    )
    console.log("Detalle enviado a la vista:", movimientoDetalle);
    res.render("detalleMovimiento", { movimientoDetalle, proveedores })
  } catch (error) {
    console.error("Error al obtener detalle de movimiento:", error)
    res.status(500).send("Error al obtener detalle del movimiento")
  }
}

async function registrarVentaGet(req, res) {
  try {
    const productosTotales = await dbProductos.obtenerProductos()
    const productos = productosTotales.filter(
      (p) => p.estado === "Activado" && p.stock > 0
    )
    res.render("nuevaVenta", { productos })
  } catch (error) {
    console.error("Error al obtener productos para la venta:", error)
    res.status(500).send("Error al obtener productos para la venta")
  }
}

async function registrarVentaPost(req, res) {
  const {
    tipo_comprobante,
    cliente_nombre,
    cliente_dni,
    razon_social,
    cliente_ruc,
    direccion_cliente,
    correo_cliente,
    productos, // Este campo es un string JSON, lo convertimos a objeto
    total,
    descripcion,
  } = req.body

  const usuarioId = req.user.id
  const fecha = DateTime.now().minus({ hours: 5 }).toISO()
  const productosArray = JSON.parse(productos)

  try {
    let clienteExistente
    let id_cliente

    // 1. Verificar si el cliente ya existe según el tipo de comprobante
    if (tipo_comprobante === "boleta") {
      clienteExistente = await dbClientes.buscarPorDNI(cliente_dni)
    } else if (tipo_comprobante === "factura") {
      clienteExistente = await dbClientes.buscarPorRUC(cliente_ruc)
    }

    if (clienteExistente) {
      id_cliente = clienteExistente.id_cliente;

      // Verificar si hay cambios en correo o dirección
      if (
        correo_cliente && correo_cliente !== clienteExistente.correo_cliente ||
        direccion_cliente && direccion_cliente !== clienteExistente.direccion_cliente
      ) {
        await dbClientes.actualizarDatosContacto(id_cliente, {
          correo_cliente,
          direccion_cliente
        });
      }
} else {
      // Cliente no existe, lo registramos
      id_cliente = await dbClientes.registrarCliente({
        nombre_cliente: cliente_nombre,
        razon_social,
        dni_cliente: cliente_dni,
        ruc_cliente: cliente_ruc,
        direccion_cliente,
        correo_cliente,
      })
    }

    // 2. Se registra el nuevo movimiento
    const id_movimiento = await dbMovimientos.registrarMovimiento({
      id_usuario: usuarioId,
      tipo: "Venta",
      fecha: fecha,
      descripcion,
    })

    // 3. Se registra la venta vinculada al cliente
    await dbMovimientos.registrarMovimientoVenta({
      id_movimiento,
      id_cliente,
      tipo_comprobante,
      total,
    })

    // 4. Se registran los productos en el detalle
    await Promise.all(
      productosArray.map(async (producto) => {
        const { id_producto, cantidad, precio_unitario } = producto
        const subtotal = cantidad * parseFloat(precio_unitario)

        // Ejecuta ambas operaciones en paralelo
        await dbMovimientos.registrarProductoMovimiento({
          id_producto,
          id_movimiento,
          cantidad,
          precio_unitario,
          subtotal,
        })

        await dbProductos.disminuirStock(id_producto, cantidad)
      })
    )
    await cacheInvalidator.afterVenta()

    res.redirect("/movimientos")
  } catch (error) {
    console.error("Error al obtener detalle de movimiento:", error)
    res.status(500).send("Error al obtener detalle del movimiento")
  }
}

async function registrarEntradaGet(req, res) {
  try {
    const productosTotales = await dbProductos.obtenerProductos()
    const proveedores = await dbProveedores.obtenerProveedores()
    const productos = productosTotales.filter((p) => p.estado === "Activado")
    res.render("nuevaEntrada", { productos, proveedores })
  } catch (error) {
    console.error("Error al obtener detalle de movimiento:", error)
    res.status(500).send("Error al obtener detalle del movimiento")
  }
}

async function registrarEntradaPost(req, res) {
  const {
    proveedor,
    productos,
    total,
    descripcion,
    id_orden, 
  } = req.body;

  console.log(req.body)

  const usuarioId = req.user.id // Asegúrate de que el usuario esté autenticado
  const fecha = DateTime.now().minus({ hours: 5 }).toISO()

  // Parseamos el JSON de productos
  const productosArray = JSON.parse(productos)

  try {
    // 1. Registrar el movimiento principal (tipo = "Compra")
    const id_movimiento = await dbMovimientos.registrarMovimiento({
      id_usuario: usuarioId,
      tipo: "Compra", // Tipo de movimiento
      fecha: fecha,
      descripcion,
    })

    // 2. Registrar el movimiento de compra con el proveedor y el total
    await dbMovimientos.registrarMovimientoCompra({
      id_movimiento,
      id_proveedor: parseInt(proveedor),
      total,
      id_orden: parseInt(id_orden), // la id orden se pasa al query tambien
    });

    // 3. Registrar los productos en `producto_movimiento` y actualizar el stock
    for (let producto of productosArray) {
      const { id_producto, cantidad, precio_unitario } = producto
      const subtotal = cantidad * parseFloat(precio_unitario)

      // 3.1 Registrar en `producto_movimiento`
      await dbMovimientos.registrarProductoMovimiento({
        id_producto,
        id_movimiento,
        cantidad,
        precio_unitario,
        subtotal,
      })
      await dbProductos.aumentarStock(id_producto, cantidad)
    }
    // 4. Registrar la incidencia si existe alguna
    if (id_orden) {
      const orden = await dbOrdenes.obtenerOrdenPorId(id_orden); // Debe devolver { products: [...] }
      const productosOrden = orden.products;

      for (let productoEntrada of productosArray) {
        const productoOrden = productosOrden.find(p => p.id_producto === productoEntrada.id_producto);
        if (productoOrden) {
          productoOrden.ingresado = (productoOrden.ingresado || 0) + productoEntrada.cantidad;
        }
      }

      await dbOrdenes.actualizarProductosOrden(id_orden, productosOrden);
    }

    // Registro de incidencias
    const productosConIncidencia = productosArray.filter(
      p => p.incidencia && p.incidencia.trim() !== ""
    );

    if (productosConIncidencia.length > 0) {
      const detalleIncidencias = productosConIncidencia.map(p => ({
        id_producto: p.id_producto,
        nombre: p.nombre,
        cantidad: p.cantidad,
        incidencia: p.incidencia,
      }));

      await dbIncidencias.registrarIncidencia({
        id_movimiento,
        id_orden: id_orden || null,
        descripcion_general: descripcion || "Complicaciones en la Llegada de la Entrada",
        detalle_productos: detalleIncidencias,
        fecha: fecha,
      });
    }

    // 5. Si no hubo incidencias y todo fue ingresado
    if (productosConIncidencia.length === 0 && id_orden) {
      const orden = await dbOrdenes.obtenerOrdenPorId(id_orden);
      const completada = orden.products.every(p => p.ingresado >= p.cantidad);
      if (completada) {
        await dbOrdenes.actualizarEstadoOrden(id_orden, 'completada');
      }
    }

    await cacheInvalidator.afterEntrada(id_orden)
    res.redirect("/movimientos") // Redirige después de registrar la entrada
  } catch (error) {
    console.error("Error al registrar entrada:", error)
    res.status(500).send("Error al registrar entrada")
  }
}

async function registrarSobranteGet(req, res) {
  try {
    const productosTotales = await dbProductos.obtenerProductos()
    const productos = productosTotales.filter((p) => p.estado === "Activado")
    res.render("nuevoSobrante", { productos })
  } catch (error) {
    console.error("Error al registrar sobrante:", error)
    res.status(500).send("Error al registrar sobrante")
  }
}

async function registrarSobrantePost(req, res) {
  const { producto, cantidad, motivo, descripcion } = req.body
  try {
    const idProducto = await dbProductos.obtenerIdProductoPorNombre(producto)
    const objProducto = await dbProductos.obtenerProductoPorId(idProducto)
    const cantidadNumerica = parseInt(cantidad)
    const usuarioId = req.user.id
    const fecha = DateTime.now().minus({ hours: 5 }).toISO()

    console.log("Fecha de Ajuste: ", fecha)
    console.log("Id de Producto: ", idProducto)
    console.log("Cantidad de Productos: ", cantidadNumerica)
    console.log("Motivo de Ajuste: ", motivo)
    console.log("Descripcion: ", descripcion)

    const id_movimiento = await dbMovimientos.registrarMovimiento({
      id_usuario: usuarioId,
      tipo: "Sobrante", // Tipo de movimiento
      fecha: fecha,
      descripcion,
    })

    await dbMovimientos.registrarMovimientoAjuste({
      id_movimiento,
      tipo_ajuste: "Sobrante",
      motivo,
    })

    await dbMovimientos.registrarProductoMovimiento({
      id_producto: idProducto,
      id_movimiento,
      cantidad: cantidadNumerica, 
      precio_unitario: objProducto.precio_unitario,
      subtotal: parseFloat(objProducto.precio_unitario * cantidad),
    })

    await dbProductos.aumentarStock(idProducto, cantidadNumerica)
    await cacheInvalidator.afterSobrante()

    res.redirect("/movimientos")
  } catch (error) {
    console.error("Error al obtener detalle de movimiento:", error)
    res.status(500).send("Error al obtener detalle del movimiento")
  }
}

async function registrarMermaGet(req, res) {
  try {
    const productosTotales = await dbProductos.obtenerProductos()
    const productos = productosTotales.filter(
      (p) => p.estado === "Activado" && p.stock > 0
    )
    res.render("nuevaMerma", { productos })
  } catch (error) {
    console.error("Error al obtener detalle de movimiento:", error)
    res.status(500).send("Error al obtener detalle del movimiento")
  }
}

async function registrarMermaPost(req, res) {
  const { producto, cantidad, motivo, descripcion } = req.body
  try {
    const idProducto = await dbProductos.obtenerIdProductoPorNombre(producto)
    const objProducto = await dbProductos.obtenerProductoPorId(idProducto)
    const cantidadNumerica = parseInt(cantidad)
    const usuarioId = req.user.id
    const fecha = DateTime.now().minus({ hours: 5 }).toISO()

    console.log("Fecha de Ajuste: ", fecha)
    console.log("Id de Producto: ", idProducto)
    console.log("Cantidad de Productos: ", cantidadNumerica)
    console.log("Motivo de Ajuste: ", motivo)
    console.log("Descripcion: ", descripcion)

    const id_movimiento = await dbMovimientos.registrarMovimiento({
      id_usuario: usuarioId,
      tipo: "Merma", // Tipo de movimiento
      fecha: fecha,
      descripcion,
    })

    await dbMovimientos.registrarMovimientoAjuste({
      id_movimiento,
      tipo_ajuste: "Merma",
      motivo,
    })

    await dbMovimientos.registrarProductoMovimiento({
      id_producto: idProducto,
      id_movimiento,
      cantidad: cantidadNumerica, 
      precio_unitario: objProducto.precio_unitario,
      subtotal: parseFloat(objProducto.precio_unitario * parseInt(cantidad)),
    })

    await dbProductos.disminuirStock(idProducto, cantidadNumerica)
    await cacheInvalidator.afterMerma()

    res.redirect("/movimientos")
  } catch (error) {
    console.error("Error al obtener detalle de movimiento:", error)
    res.status(500).send("Error al obtener detalle del movimiento")
  }
}

async function generarComprobantePDF(req, res) {
  try {
    const idVenta = parseInt(req.params.id, 10)
    const venta = await dbMovimientos.obtenerDetalleMovimiento(idVenta)

    if (!venta) {
      return res.status(404).send("Venta no encontrada")
    }

    // Flatten structure for pdfGenerator
    const dataForPdf = venta.producto_movimiento.map((pm) => ({
      tipo_comprobante: venta.movimiento_venta.tipo_comprobante,
      serie: venta.movimiento_venta.serie,
      correlativo: venta.movimiento_venta.correlativo,
      nombre_cliente: venta.movimiento_venta.cliente.nombre_cliente,
      razon_social: venta.movimiento_venta.cliente.razon_social,
      dni_cliente: venta.movimiento_venta.cliente.dni_cliente,
      ruc_cliente: venta.movimiento_venta.cliente.ruc_cliente,
      direccion_cliente: venta.movimiento_venta.cliente.direccion_cliente,
      fecha: venta.fecha,
      id_producto: pm.id_producto,
      producto: pm.producto.nombre,
      cantidad: pm.cantidad,
      precio_unitario: pm.precio_unitario,
      subtotal: pm.subtotal,
    }))

    console.log("🧾 Data passed to PDF generator:", JSON.stringify(dataForPdf, null, 2))

    const pdfBytes = await pdfUtils.generarComprobantePDF(dataForPdf)

    const tipoComprobante =
      venta.movimiento_venta.tipo_comprobante === "boleta" ? "BOLETA" : "FACTURA"

    const nombre =
      venta.movimiento_venta.tipo_comprobante === "boleta"
        ? venta.movimiento_venta.cliente.nombre_cliente
        : venta.movimiento_venta.cliente.razon_social

    const fecha = venta.fecha.toISOString().slice(0, 10).replace(/-/g, "")
    const fileName = `${tipoComprobante}_${nombre}_${fecha}.pdf`

    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`)
    res.send(Buffer.from(pdfBytes))
  } catch (error) {
    console.error("❌ Error en generarComprobantePDF:", error)
    res.status(500).send("Error generando comprobante PDF")
  }
}

async function obtenerResumenMermas() {
  return await getOrSetCache("movimientos:mermas30d", () =>
    dbMovimientos.obtenerMermasUltimos30Dias().then(mermas => {
      const resumen = {}
      mermas.forEach(m => {
        const fechaLima = DateTime.fromISO(m.fecha.toISOString()).toFormat("yyyy-MM-dd")
        resumen[fechaLima] = (resumen[fechaLima] || 0) + 1
      })
      return Object.entries(resumen).map(([fecha, mermas]) => ({ fecha, mermas }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
    })
  )
}

async function obtenerResumenSobrantes() {
  return await getOrSetCache("movimientos:sobrantes30d", () =>
    dbMovimientos.obtenerSobrantesUltimos30Dias().then(sobrantes => {
      const resumen = {}
      sobrantes.forEach(s => {
        const fechaLima = DateTime.fromISO(s.fecha.toISOString()).toFormat("yyyy-MM-dd")
        resumen[fechaLima] = (resumen[fechaLima] || 0) + 1
      })
      return Object.entries(resumen).map(([fecha, sobrantes]) => ({ fecha, sobrantes }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
    })
  )
}

// Para obtener mermas de una fecha específica
async function obtenerMermasPorFecha(req, res) {
  try {
    const fecha = req.params.fecha
    const mermas = await getOrSetCache(`movimientos:mermas:${fecha}`, () =>
      dbMovimientos.obtenerMovimientosAjustePorFecha("Merma", fecha)
    )
    res.json(mermas)
  } catch (error) {
    console.error("Error al obtener mermas:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
}

// Para obtener sobrantes de una fecha específica
async function obtenerSobrantesPorFecha(req, res) {
  try {
    const fecha = req.params.fecha
    const sobrantes = await getOrSetCache(`movimientos:sobrantes:${fecha}`, () =>
      dbMovimientos.obtenerMovimientosAjustePorFecha("Sobrante", fecha)
    )
    res.json(sobrantes)
  } catch (error) {
    console.error("Error al obtener sobrantes:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
}

module.exports = {
  obtenerMovimientos,
  registrarVentaGet,
  registrarVentaPost,
  registrarEntradaGet,
  registrarEntradaPost,
  registrarSobranteGet,
  registrarSobrantePost,
  registrarMermaGet,
  registrarMermaPost,
  verDetalleMovimiento,
  generarComprobantePDF,
  exportarReporteExcel,
  obtenerResumenMermas,
  obtenerResumenSobrantes,
  obtenerMermasPorFecha,
  obtenerSobrantesPorFecha
}
