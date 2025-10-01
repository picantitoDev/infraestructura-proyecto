const express = require("express")
const router = express.Router()
const controladorProveedores = require("../controllers/controladorProveedores")

router.get("/", controladorProveedores.obtenerProveedores)
router.get("/nuevo", controladorProveedores.nuevoProveedorGet)
router.post("/nuevo", controladorProveedores.nuevoProveedorPost)
router.get('/editar/:id', controladorProveedores.editarProveedorGet);
router.put('/:id', controladorProveedores.editarProveedorPut);

module.exports = router
