const express = require("express")
const router = express.Router()
const controladorCategorias = require("../controllers/controladorCategorias")

// Mostrar lista de categorías
router.get("/", controladorCategorias.obtenerCategorias)

// Crear una nueva categoría (POST)
router.post("/", controladorCategorias.crearCategoria)

// Renombrar una categoría (PUT)
router.put("/:id", controladorCategorias.renombrarCategoria)

// Cambiar el estado de una categoría (PATCH)
router.patch("/:id/estado", controladorCategorias.cambiarEstadoCategoria)

module.exports = router
