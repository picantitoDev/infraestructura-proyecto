const express = require("express")
const router = express.Router()
const controladorIncidencias = require("../controllers/controladorIncidencias")

router.get("/", controladorIncidencias.obtenerIncidencias)
router.get("/:id_incidencia", controladorIncidencias.descargarPDFIncidencia);
router.get('/resumen/cuenta', async (req, res) => {
  try {
    const data = await controladorIncidencias.obtenerResumenIncidencias();
    console.log(data)
    res.json(data);
  } catch (err) {
    console.error('Error al obtener resumen de incidencias:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});
router.get('/drill/:fecha', controladorIncidencias.detallePorFecha);


module.exports = router