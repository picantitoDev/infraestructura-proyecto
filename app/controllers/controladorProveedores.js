const dbProveedores = require("../model/queriesProveedores")
const { getOrSetCache, redisClient } = require("../utils/redis")

// ✅ Obtener proveedores con cache
async function obtenerProveedores(req, res) {
  try {
    const proveedores = await getOrSetCache("proveedores:all", () =>
      dbProveedores.obtenerProveedores()
    )
    res.render("proveedores", { proveedores })
  } catch (error) {
    console.error("Error al obtener proveedores:", error)
    res.status(500).send("Error al obtener los proveedores")
  }
}

// ✅ Nuevo proveedor (form) con cache
async function nuevoProveedorGet(req, res) {
  try {
    const proveedores = await getOrSetCache("proveedores:all", () =>
      dbProveedores.obtenerProveedores()
    )
    res.render("nuevoProveedor", { proveedores })
  } catch (error) {
    console.error("Error al cargar registro de proveedores:", error)
    res.status(500).send("Error al cargar registro de proveedores")
  }
}

// ✅ Crear proveedor → invalidar cache
async function nuevoProveedorPost(req, res) {
  const { razon_social, ruc, numero_telefono, correo, direccion } = req.body

  try {
    await dbProveedores.insertarProveedor({
      razon_social,
      ruc,
      numero_telefono,
      correo,
      direccion,
    })

    // 🔄 invalidar cache
    await redisClient.del("proveedores:all")

    res.redirect("/proveedores")
  } catch (error) {
    console.error("Error al cargar registro de proveedores:", error)
    res.status(500).send("Error al cargar registro de proveedores")
  }
}

// ✅ Editar proveedor (form) con cache
async function editarProveedorGet(req, res) {
  const id = req.params.id
  try {
    const proveedor = await dbProveedores.obtenerProveedorPorId(id)
    const proveedores = await getOrSetCache("proveedores:all", () =>
      dbProveedores.obtenerProveedores()
    )
    res.render("detalleProveedor", { proveedor, proveedores })
  } catch (error) {
    console.error("Error al cargar detalle de proveedor:", error)
    res.status(500).send("Error al cargar detalle del proveedor")
  }
}

// ✅ Editar proveedor (update) → invalidar cache
async function editarProveedorPut(req, res) {
  const id = req.params.id
  const datos = req.body

  try {
    await dbProveedores.actualizarProveedor(id, datos)

    // 🔄 invalidar cache
    await redisClient.del("proveedores:all")

    res.redirect("/proveedores")
  } catch (error) {
    console.error("Error al actualizar proveedor:", error)
    res.status(500).send("Error al actualizar proveedor")
  }
}

module.exports = {
  obtenerProveedores,
  nuevoProveedorGet,
  nuevoProveedorPost,
  editarProveedorGet,
  editarProveedorPut,
}
