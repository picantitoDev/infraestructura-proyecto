// routes/ventas.js
const express = require('express');
const router = express.Router();
const {
  obtenerResumenVentas30Dias,
  obtenerDetalleVentaPorFecha
} = require('../model/queriesMovimientos');

router.get('/detalle/:fecha', async (req, res) => {
  const productos = await obtenerDetalleVentaPorFecha(req.params.fecha);
  res.json(productos);
});

module.exports = router;
