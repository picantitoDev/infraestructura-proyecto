const express = require("express")
const router = express.Router()
const controladorMovimientos = require("../controllers/controladorMovimientos")

// Ruta para obtener todos los movimientos
router.get("/", controladorMovimientos.obtenerMovimientos)
router.get("/detalle/:id", controladorMovimientos.verDetalleMovimiento)
router.get("/registrar-venta", controladorMovimientos.registrarVentaGet)
router.post("/registrar-venta", controladorMovimientos.registrarVentaPost)
router.get("/registrar-entrada", controladorMovimientos.registrarEntradaGet)
router.post("/registrar-entrada", controladorMovimientos.registrarEntradaPost)
router.get("/registrar-sobrante", controladorMovimientos.registrarSobranteGet)
router.post("/registrar-sobrante", controladorMovimientos.registrarSobrantePost)
router.get("/registrar-merma", controladorMovimientos.registrarMermaGet)
router.post("/registrar-merma", controladorMovimientos.registrarMermaPost)
router.get(
  "/detalle/:id/comprobante",
  controladorMovimientos.generarComprobantePDF
)
router.get("/exportar", controladorMovimientos.exportarReporteExcel)

router.get("/drill/mermas/:fecha", controladorMovimientos.obtenerMermasPorFecha);
router.get("/drill/sobrantes/:fecha", controladorMovimientos.obtenerSobrantesPorFecha);


module.exports = router
