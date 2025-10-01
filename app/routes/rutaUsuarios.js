const express = require("express")
const router = express.Router()
const controladorUsuarios = require("../controllers/controladorUsuarios")

router.get("/", controladorUsuarios.obtenerUsuarios)
router.get("/nuevo", controladorUsuarios.crearUsuarioGet)
router.post("/nuevo", controladorUsuarios.crearUsuarioPost)
router.get("/editar/:id", controladorUsuarios.editarUsuarioGet);
router.post("/editar/:id", controladorUsuarios.editarUsuarioPost);

module.exports = router
