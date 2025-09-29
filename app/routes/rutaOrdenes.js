const express = require('express');
const router = express.Router();
const controladorOrdenes = require('../controllers/controladorOrdenes');

// Ruta para listar órdenes
router.get('/', controladorOrdenes.listarOrdenes);
router.get("/nueva", controladorOrdenes.crearOrdenGet);
router.post("/nueva", controladorOrdenes.crearOrdenPost)
router.get('/:id', controladorOrdenes.obtenerOrdenPorId);
router.get('/detalle/:id', controladorOrdenes.detalleOrden)
router.get("/detalle/pdf/:id", controladorOrdenes.generarOrdenPDF)
router.get('/producto/:idProducto/', controladorOrdenes.obtenerOrdenPorProducto);
router.get('/detalle-fecha/:fecha', controladorOrdenes.detalleOrdenPorFecha);
router.post('/:id/cancelar', controladorOrdenes.cancelarOrden);

module.exports = router;