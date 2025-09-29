const express = require("express")
const router = express.Router()
const controladorProductos = require("../controllers/controladorProductos")

// Obtener lista de productos
router.get("/", controladorProductos.obtenerProductos)

// Formulario para crear un producto
router.get("/crear-producto", controladorProductos.crearProductoGet) // Now it calls the method to get categories

// Crear producto (POST)
router.post("/crear-producto", controladorProductos.crearProductoPost)

// Ver detalle de producto
router.get("/detalle/:id", controladorProductos.obtenerProductoPorId)

// Actualizar producto
router.put("/detalle/:id", controladorProductos.actualizarProducto)

// Generar orden de reposicion
router.get("/:id/generar-orden", controladorProductos.generarOrdenReposicion)

module.exports = router
