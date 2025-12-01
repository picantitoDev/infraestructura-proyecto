const dbProductos = require("../model/queriesProductos")
const dbCategorias = require("../model/queriesCategorias")
const dbProveedores = require("../model/queriesProveedores")
const dbUsuarios = require("../model/queriesUsuarios")
const dbAuditoria = require("../model/queriesAuditoria")
const dbOrdenes = require("../model/queriesOrdenes")
const pdfUtils = require("../utils/pdfGenerator")
const { DateTime } = require("luxon")
const { getOrSetCache, redisClient } = require("../utils/redis")

async function obtenerProductos(req, res) {
  try {
    const productos = await getOrSetCache("productos:all", () =>
      dbProductos.obtenerProductos()
    )
    const categorias = await getOrSetCache("categorias:activas", () =>
      dbCategorias.obtenerCategoriasActivas()
    )

    res.render("productos", { productos, categorias })
  } catch (error) {
    console.error("Error al obtener productos:", error)
    res.status(500).send("Error al obtener los productos")
  }
}
async function obtenerProductoPorId(req, res) {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      return res.status(400).send("El ID del producto no es válido")
    }

    const productos = await getOrSetCache("productos:all", () =>
      dbProductos.obtenerProductos()
    )
    const producto = await dbProductos.obtenerProductoPorId(id) // si quieres, también se puede cachear individual
    const categorias = await getOrSetCache("categorias:all", () =>
      dbCategorias.obtenerCategorias()
    )
    const proveedores = await getOrSetCache("proveedores:all", () =>
      dbProveedores.obtenerProveedores()
    )
    const productosSinActual = productos.filter(p => p.id_producto !== producto.id_producto)
    const ordenAsociada = await dbOrdenes.buscarOrdenPorProductoEnCurso(id)

    if (!producto) {
      return res.status(404).send("Producto no encontrado")
    }

    res.render("detalleProducto", {
      productos: productosSinActual,
      producto,
      categorias,
      proveedores,
      ordenAsociada,
      usuario: req.user,
    })
  } catch (error) {
    console.error("Error al obtener producto por ID:", error)
    res.status(500).send("Error al obtener el producto")
  }
}


async function actualizarProducto(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).send("ID de producto no válido");
    }

    const {
      nombre,
      stock,
      precio_unitario,
      id_categoria,
      id_proveedor,
      cantidad_minima,
      estado,
    } = req.body;

    const datosActualizados = {
      nombre,
      stock: parseInt(stock),
      precio_unitario: parseFloat(precio_unitario),
      id_categoria: parseInt(id_categoria),
      id_proveedor: parseInt(id_proveedor),
      cantidad_minima: parseInt(cantidad_minima),
      estado,
    };

    // 1. Obtener datos actuales del producto
    const productoActual = await dbProductos.obtenerProductoPorId(id);

    if (!productoActual) {
      return res.status(404).send("Producto no encontrado");
    }

    // 2. Detectar campos modificados
    const camposModificados = {};
    for (const campo in datosActualizados) {
      const actual = productoActual[campo];
      const nuevo = datosActualizados[campo];

      const esNumerico = typeof nuevo === 'number' || typeof actual === 'number';
      const iguales = esNumerico
        ? Number(actual) === Number(nuevo)
        : actual === nuevo;

      if (!iguales) {
        camposModificados[campo] = {
          antes: actual,
          despues: nuevo,
        };
      }
    }

    // 3. Actualizar el producto
    await dbProductos.actualizarProducto(id, datosActualizados);
    const fecha = DateTime.now().minus({ hours: 5 }).toISO()
    
    // 4. Registrar auditoría si hubo cambios
    if (Object.keys(camposModificados).length > 0) {
      await dbAuditoria.registrarAuditoriaProducto({
        id_producto: id,
        id_usuario: req.user.id,
        accion: "actualizar",
        campos_modificados: camposModificados,
        fecha: fecha
      });
    }

    await redisClient.del("productos:all")
    res.redirect("/productos");
  } catch (error) {
    console.error("Error al actualizar el producto:", error);
    res.status(500).send("Error al actualizar el producto");
  }
}


async function crearProductoGet(req, res) {
  try {
    const categorias = await getOrSetCache("categorias:activas", () =>
      dbCategorias.obtenerCategoriasActivas()
    )
    const productos = await getOrSetCache("productos:all", () =>
      dbProductos.obtenerProductos()
    )
    const proveedores = await getOrSetCache("proveedores:all", () =>
      dbProveedores.obtenerProveedores()
    )

    res.render("nuevoProducto", { categorias, proveedores, productos })
  } catch (error) {
    console.error("Error al cargar formulario:", error)
    res.status(500).send("Error al cargar formulario")
  }
} 

async function crearProductoPost(req, res) {
  try {
    const { nombre, stock, precio_unitario, id_categoria, id_proveedor, cantidad_minima } = req.body

    await dbProductos.crearProducto(
      nombre,
      parseInt(stock),
      parseFloat(precio_unitario),
      parseInt(id_categoria),
      parseInt(id_proveedor),
      parseInt(cantidad_minima)
    )

    // 🔄 invalidar cache
    await redisClient.del("productos:all")

    res.redirect("/productos")
  } catch (error) {
    console.error("Error al crear producto:", error)
    res.status(500).send("Error al crear el producto")
  }
}


async function generarOrdenReposicion(req, res) {
  const idProducto = req.params.id
  const usuarioResponsable = await dbUsuarios.buscarUsuarioPorId(req.user.id)
  const dataProducto = await dbProductos.obtenerProductoPorId(idProducto)
  dataProducto.usuarioResponsable = usuarioResponsable

  console.log(dataProducto)
  const pdfBytes = await pdfUtils.crearOrdenReposicionPDF(dataProducto)
  const fechaActual = new Date(Date.now() - 5 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const sanitizeFilename = (name) =>
    name
      .normalize("NFD") // Elimina tildes (acentos)
      .replace(/[\u0300-\u036f]/g, "") // Elimina los caracteres diacríticos
      .replace(/[^a-zA-Z0-9_\-]/g, "") // Elimina caracteres no válidos
      .substring(0, 50) // Limita longitud si es necesario

  const nombreProducto = sanitizeFilename(dataProducto.nombre)
  const nombreArchivo = `Solicitud_Compra_${nombreProducto}_${fechaActual}.pdf`

  res.setHeader("Content-Type", "application/pdf")
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${nombreArchivo}"`
  )

  // Send PDF
  res.send(Buffer.from(pdfBytes))
}

async function obtenerResumenProductos() {
  const rankingCantidad = await dbProductos.obtenerRankingPorCantidad();
  const rankingIngresos = await dbProductos.obtenerRankingPorIngresos();

  const masVendido = rankingCantidad[0] || { nombre: 'N/A', total_vendido: 0 };
  const menosVendido = [...rankingCantidad].reverse().find(p => p.total_vendido > 0) || { nombre: 'N/A', total_vendido: 0 };

  const masIngresos = rankingIngresos[0] || { nombre: 'N/A', total_ingresos: 0 };
  const menosIngresos = [...rankingIngresos].reverse().find(p => p.total_ingresos > 0) || { nombre: 'N/A', total_ingresos: 0 };

  return { masVendido, menosVendido, masIngresos, menosIngresos };
}


// Esta función SÍ es para endpoint API (si la quieres mantener)
async function resumenProductosDestacados(req, res){
  try {
    const resumen = await obtenerResumenProductos();
    res.json(resumen);
  } catch (error) {
    console.error("Error al obtener resumen de productos:", error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  obtenerProductos,
  crearProductoGet,
  crearProductoPost,
  obtenerProductoPorId,
  actualizarProducto,
  generarOrdenReposicion,
  obtenerResumenProductos,
  resumenProductosDestacados
}
