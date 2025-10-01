const dbOrdenes = require('../model/queriesOrdenes');
const dbProductos = require("../model/queriesProductos")
const dbProveedores = require("../model/queriesProveedores")
const dbIncidencias = require('../model/queriesIncidencias'); 
const pdfUtil = require("../utils/pdfGenerator")
const nodemailer = require("nodemailer");
const { DateTime } = require('luxon');
const { getOrSetCache, redisClient } = require("../utils/redis")

async function listarOrdenes(req, res) {
  try {
    const ordenes = await getOrSetCache("ordenes:all", () =>
      dbOrdenes.obtenerOrdenes()
    )

    const productosBajoStock = await getOrSetCache("productos:criticos", () =>
      dbProductos.obtenerProductosCriticos()
    )

    res.render('ordenes', { ordenes, productosBajoStock, user: req.user });
  } catch (error) {
    console.error('Error al obtener órdenes:', error);
    res.status(500).send('Error al obtener órdenes');
  }
}

async function crearOrdenGet(req, res) {
  try {
    const productosTotales = await getOrSetCache("productos:paraOrden", () =>
      dbProductos.obtenerProductosParaOrden()
    )
    const proveedores = await getOrSetCache("proveedores:all", () =>
      dbProveedores.obtenerProveedores()
    )

    const productos = productosTotales.filter(
      p => (p.estado || '').toLowerCase() === 'activado'
    )
    console.log("ProductosTotales:", productosTotales)

    const proveedoresConStockBajo = new Set(
      productos
        .filter(p => Number(p.stock) < Number(p.cantidad_minima))
        .map(p => Number(p.id_proveedor))
    )

    const proveedoresMarcados = proveedores.map(p => ({
      ...p,
      tieneStockBajo: proveedoresConStockBajo.has(Number(p.id_proveedor))
    }))

    const productosEnCurso = await dbProductos.obtenerProductosEnOrdenesEnCurso()

    res.render('crearOrden', {
      proveedores: proveedoresMarcados,
      productos,
      productosEnCurso
    });
  } catch (error) {
    console.error('Error al crear orden:', error);
    res.status(500).send('Error al crear orden');
  }
}


async function crearOrdenPost(req, res) {
  try {
    const proveedorId = parseInt(req.body.proveedor);
    let productos = JSON.parse(req.body.productos);

    productos = productos.map(p => ({
      ...p,
      ingresado: 0,
    }));

const fechaLimaUTC = DateTime.now().setZone('America/Lima').toUTC().toJSDate();


    // Crear orden y obtener ID
    const idUsuario = req.user.id 
    const idOrden = await dbOrdenes.crearOrden(proveedorId, productos, fechaLimaUTC, 'en_curso', idUsuario);


    // Obtener datos completos para generar PDF
    const orden = await dbOrdenes.obtenerOrdenPorId(idOrden);

    // Generar PDF
    const pdfBuffer = await pdfUtil.generarOrdenPDF(orden);

    // Obtener datos del proveedor (correo)
    const proveedor = await dbProveedores.obtenerProveedorPorId(proveedorId);
    const correoDestino = proveedor.correo;

    // Configurar transporte (misma config que recuperación)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'stockcloud.soporte@gmail.com',
        pass: 'ktte cwnu eojo eaxt', // contraseña de aplicación
      },
    });

    // Enviar correo con PDF adjunto
    await transporter.sendMail({
      from: 'stockcloud.soporte@gmail.com',
      to: correoDestino,
      subject: `Nueva Orden de Reabastecimiento N.º ${idOrden}`,
      html: `
        <p>Estimado proveedor,</p>
        <p>Adjunto encontrará los detalles de la orden de reabastecimiento número <strong>${idOrden}</strong>.</p>
        <p>Saludos,<br>Equipo de StockCloud</p>
      `,
      attachments: [
        {
          filename: `orden_${idOrden}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    await redisClient.del("ordenes:all")
    await redisClient.del("ordenes:ultimos30dias")
    res.redirect("/ordenes");
  } catch (error) {
    console.error('Error al crear orden y enviar PDF:', error);
    res.status(500).send('Error al crear orden');
  }
}

async function obtenerOrdenPorId(req, res) {
  try {
    const id_order = req.params.id;
    const orden = await dbOrdenes.obtenerOrdenPorId(id_order);

    if (!orden) {
      return res.status(404).json({ mensaje: 'Orden no encontrada' });
    }

    // 🔍 Buscar incidencias asociadas a la orden
    const incidencias = await dbIncidencias.obtenerIncidenciasPorOrden(id_order);

    // Incluir las incidencias en el JSON de respuesta
    console.log(orden)
    res.json({ ...orden, incidencias });

  } catch (error) {
    console.error('Error al obtener la orden por ID:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
}

async function detalleOrden(req, res) {
  try {
    const id_order = req.params.id;
    const orden = await dbOrdenes.obtenerOrdenPorId(id_order);

    if (!orden) {
      return res.status(404).json({ mensaje: 'Orden no encontrada' });
    }

    // ✅ Convertir fecha UTC a hora Lima (solo si existe)
    if (orden.fecha) {
      orden.fecha = DateTime
        .fromJSDate(orden.fecha, { zone: 'utc' })
        .setZone('America/Lima')
        .toISO(); // puedes usar .toISO() o pasar el objeto Date con .toJSDate()
    }

    const incidencias = await dbIncidencias.obtenerIncidenciasPorOrden(id_order);

    res.render('detalleOrden', { orden, incidencias });

  } catch (error) {
    console.error('Error al obtener la orden por ID:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
}

async function generarOrdenPDF(req, res) {
  try {
    const id_order = req.params.id;

    const orden = await dbOrdenes.obtenerOrdenPorId(id_order);

    if (!orden) {
      return res.status(404).send("Orden no encontrada");
    }

    // Llamar a la función que genera el PDF
    const pdfBuffer = await pdfUtil.generarOrdenPDF(orden);

    // Configurar encabezados y enviar el PDF al navegador
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=orden_${id_order}.pdf`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error("Error al generar PDF de orden:", err);
    res.status(500).send("Error al generar el PDF");
  }
}

async function obtenerOrdenPorProducto(req, res) {
  const idProducto = parseInt(req.params.idProducto);
  console.log("🧪 Producto recibido:", idProducto);

  try {
    const orden = await dbOrdenes.buscarOrdenPorProductoEnCurso(idProducto);

    if (orden) {
      res.json(orden);
    } else {
      res.status(404).json({ error: 'Orden no encontrada para este producto' });
    }
  } catch (error) {
    console.error('Error al buscar orden por producto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function detalleOrdenPorFecha(req, res){
  try {
    const { fecha } = req.params;
    const detalle = await getOrSetCache(`ordenes:fecha:${fecha}`, () =>
      dbOrdenes.obtenerDetalleOrdenesPorFecha(fecha)
    )
    res.json(detalle);
  } catch (error) {
    console.error('Error al obtener detalle de órdenes por fecha:', error);
    res.status(500).json({ error: 'Error interno al obtener detalle de órdenes' });
  }
}

async function obtenerResumenOrdenes() {
  return await getOrSetCache("ordenes:ultimos30dias", () =>
    dbOrdenes.obtenerOrdenesUltimos30Dias().then(ordenes => {
      const resumenAgrupado = {}
      ordenes.forEach(orden => {
        const fechaOriginalUTC = orden.fecha.toISOString();
        const fechaLima = DateTime.fromISO(fechaOriginalUTC, { zone: 'utc' })
                                .setZone('America/Lima')
                                .toFormat('yyyy-MM-dd');
        if (!resumenAgrupado[fechaLima]) resumenAgrupado[fechaLima] = [];
        resumenAgrupado[fechaLima].push({ id: orden.id_orden, fechaUTC: orden.fecha });
      });
      return Object.entries(resumenAgrupado).map(([fecha, ordenes]) => ({
        fecha,
        total: ordenes.length,
        ordenes,
      })).sort((a, b) => a.fecha.localeCompare(b.fecha));
    })
  )
}

async function cancelarOrden(req, res){
  const idOrden = req.params.id;
  try {
    await dbOrdenes.cancelarOrden(idOrden);

    // 🔄 invalidar caches
    await redisClient.del("ordenes:all")
    await redisClient.del("ordenes:ultimos30dias")

    res.redirect(`/ordenes`);
  } catch (error) {
    console.error("Error al cancelar la orden:", error);
    res.status(500).send("Error al cancelar la orden.");
  }
};

module.exports = {
    listarOrdenes,
    crearOrdenGet,
    crearOrdenPost,
    obtenerOrdenPorId,
    detalleOrden,
    generarOrdenPDF,
    obtenerOrdenPorProducto,
    detalleOrdenPorFecha,
    obtenerResumenOrdenes,
    cancelarOrden
}
