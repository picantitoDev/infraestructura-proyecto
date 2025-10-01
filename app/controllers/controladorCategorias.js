const dbCategorias = require("../model/queriesCategorias")
const { getOrSetCache, redisClient } = require("../utils/redis")

// ✅ Obtener con cache
async function obtenerCategorias(req, res) {
  try {
    const categorias = await getOrSetCache("categorias:all", () =>
      dbCategorias.obtenerCategorias()
    )

    res.render("categorias", { categorias, title: "Categorías" })
  } catch (error) {
    console.error("Error al obtener categorias:", error)
    res.status(500).send("Error al obtener las categorias")
  }
}

// ✅ Crear → limpiar cache
async function crearCategoria(req, res) {
  const { nombre } = req.body
  try {
    await dbCategorias.crearCategoria(nombre)

    // invalidar cache
    await redisClient.del("categorias:all")

    res.redirect("/categorias")
  } catch (error) {
    console.error("Error al crear categoría:", error)
    res.status(500).send("Error al crear la categoría")
  }
}

// ✅ Renombrar → limpiar cache
async function renombrarCategoria(req, res) {
  const { id } = req.params
  const { nombre } = req.body

  if (!nombre || !nombre.trim()) {
    return res.status(400).send("El nombre no puede estar vacío.")
  }

  try {
    await dbCategorias.renombrarCategoria(Number(id), nombre.trim()) 

    // invalidar cache
    await redisClient.del("categorias:all")

    res.sendStatus(200)
  } catch (error) {
    console.error("Error al renombrar categoría:", error)

    if (error.message.includes("NaN")) {
      return res.status(400).send("El id de la categoría debe ser un número válido.")
    }

    res.status(500).send("Error al renombrar la categoría")
  }
}

// ✅ Cambiar estado → limpiar cache
async function cambiarEstadoCategoria(req, res) {
  const { id } = req.params
  const { estado } = req.body

  if (!["activa", "inactiva"].includes(estado)) {
    return res.status(400).send("Estado inválido. Usa 'activa' o 'inactiva'.")
  }

  const idNum = Number(id)
  if (!Number.isInteger(idNum) || idNum <= 0) {
    return res.status(400).send("El parámetro 'id' debe ser un entero positivo.")
  }

  try {
    await dbCategorias.cambiarEstadoCategoria(idNum, estado)

    // invalidar cache
    await redisClient.del("categorias:all")

    return res.sendStatus(200)
  } catch (error) {
    console.error("Error al cambiar estado de categoría:", error)

    if (typeof error.message === "string" && error.message.includes("producto(s) activos con stock")) {
      return res.status(400).json({ message: error.message })
    }

    if (error.code === "P2025") {
      return res.status(404).json({ message: "Categoría no encontrada." })
    }

    if (
      error.name === "PrismaClientValidationError" ||
      (typeof error.message === "string" && error.message.includes("Invalid value provided"))
    ) {
      return res.status(400).json({ message: "Datos inválidos para la operación." })
    }

    return res.status(500).send("Error al cambiar el estado de la categoría.")
  }
}

module.exports = {
  obtenerCategorias,
  crearCategoria,
  renombrarCategoria,
  cambiarEstadoCategoria,
}
