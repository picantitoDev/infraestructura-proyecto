const dbIncidencias = require("../model/queriesIncidencias");
const { generarPDFIncidencia } = require("../utils/pdfGenerator");
const { DateTime } = require("luxon");
const { getOrSetCache, redisClient } = require("../utils/redis");

async function obtenerIncidencias(req, res) {
  try {
    const incidencias = await getOrSetCache("incidencias:all", () =>
      dbIncidencias.obtenerIncidencias()
    );

    const procesadas = incidencias.map((inc) => ({
      ...inc,
      detalle_productos: Array.isArray(inc.detalle_productos)
        ? inc.detalle_productos
        : JSON.parse(inc.detalle_productos),
    }));

    res.render("incidencias", { incidencias: procesadas, title: "Incidencias" });
  } catch (error) {
    console.error("Error al obtener incidencias:", error);
    res.status(500).send("Error al obtener las incidencias");
  }
}

async function descargarPDFIncidencia(req, res) {
  const id = req.params.id_incidencia;
  try {
    const incidencia = await dbIncidencias.obtenerIncidenciaPorId(id);

    if (!incidencia) {
      return res.status(404).send("Incidencia no encontrada");
    }

    const pdfBytes = await generarPDFIncidencia(incidencia);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=incidencia_${id}.pdf`
    );
    res.send(pdfBytes);
  } catch (err) {
    console.error("Error al generar PDF:", err);
    res.status(500).send("Error al generar el PDF");
  }
}

async function obtenerResumenIncidencias() {
  return await getOrSetCache("incidencias:ultimos30dias", () =>
    dbIncidencias.obtenerIncidenciasUltimos30Dias().then((incidencias) => {
      const resumen = {};
      incidencias.forEach((inc) => {
        const dt =
          inc.fecha instanceof Date
            ? DateTime.fromJSDate(inc.fecha, { zone: "America/Lima" })
            : DateTime.fromISO(String(inc.fecha), { zone: "America/Lima" });
        const fechaLima = dt.toFormat("yyyy-MM-dd");
        resumen[fechaLima] = (resumen[fechaLima] || 0) + 1;
      });

      return Object.entries(resumen)
        .map(([fecha, incidencias]) => ({ fecha, incidencias }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
    })
  );
}

async function detallePorFecha(req, res) {
  try {
    const { fecha } = req.params;

    const dt = DateTime.fromFormat(fecha, "yyyy-MM-dd", { zone: "America/Lima" });
    if (!dt.isValid) {
      return res.status(400).json({ error: "Formato de fecha inválido" });
    }

    const datos = await getOrSetCache(`incidencias:fecha:${fecha}`, () =>
      dbIncidencias.obtenerIncidenciasPorFecha(fecha)
    );

    res.json(datos);
  } catch (error) {
    console.error("❌ Error al obtener incidencias por fecha:", error);
    res.status(500).json({ error: "Error interno al obtener incidencias" });
  }
}


module.exports = {
  obtenerIncidencias,
  descargarPDFIncidencia,
  obtenerResumenIncidencias,
  detallePorFecha,
};
