/**
 * @jest-environment node
 */

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterAll(() => {
  console.error.mockRestore();
  console.log.mockRestore();
});

const express = require("express");
const request = require("supertest");

// ---- Mocks para queries y PDF ----
jest.mock("../../model/queriesIncidencias", () => ({
  obtenerIncidencias: jest.fn(),
  obtenerIncidenciaPorId: jest.fn(),
  obtenerIncidenciasUltimos30Dias: jest.fn(),
  obtenerIncidenciasPorFecha: jest.fn(),
}));

jest.mock("../../utils/pdfGenerator", () => ({
  generarPDFIncidencia: jest.fn(),
}));

const dbIncidencias = require("../../model/queriesIncidencias");
const { generarPDFIncidencia } = require("../../utils/pdfGenerator");

const rutaIncidencias = require("../../routes/rutaIncidencias");
const controladorIncidencias = require("../../controllers/controladorIncidencias");

// App de prueba: reemplaza render() con JSON
function makeApp() {
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());

  app.use((req, res, next) => {
    res.render = (vista, locals) => res.status(200).json({ vista, locals });
    next();
  });

  app.use("/incidencias", rutaIncidencias);
  return app;
}

describe("Pruebas de rutas y controlador de incidencias", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = makeApp();
  });

  // ---------- GET /incidencias ----------
  it("GET /incidencias debe renderizar lista con 'detalle_productos' parseado", async () => {
    const crudas = [
      { id_incidencia: 1, detalle_productos: JSON.stringify([{ id: 10 }]) },
      { id_incidencia: 2, detalle_productos: [{ id: 20 }] }, // ya es array
    ];
    dbIncidencias.obtenerIncidencias.mockResolvedValue(crudas);

    const res = await request(app).get("/incidencias");
    expect(res.status).toBe(200);
    expect(res.body.vista).toBe("incidencias");
    expect(res.body.locals.title).toBe("Incidencias");
    expect(res.body.locals.incidencias).toEqual([
      { id_incidencia: 1, detalle_productos: [{ id: 10 }] },
      { id_incidencia: 2, detalle_productos: [{ id: 20 }] },
    ]);
  });

  it("GET /incidencias maneja error devolviendo 500", async () => {
    dbIncidencias.obtenerIncidencias.mockRejectedValue(new Error("fallo"));
    const res = await request(app).get("/incidencias");
    expect(res.status).toBe(500);
    // Nota: el controlador responde con este texto (aunque diga 'categorias')
    expect(res.text).toMatch(/Error al obtener las categorias/);
  });

  // ---------- GET /incidencias/:id_incidencia (descargar PDF) ----------
  it("GET /incidencias/:id_incidencia devuelve PDF cuando existe", async () => {
    dbIncidencias.obtenerIncidenciaPorId.mockResolvedValue({ id_incidencia: 77, foo: "bar" });
    generarPDFIncidencia.mockResolvedValue(Buffer.from([1, 2, 3, 4]));

    const res = await request(app).get("/incidencias/77");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/pdf/);
    expect(res.headers["content-disposition"]).toBe('attachment; filename=incidencia_77.pdf');
    expect(res.body).toBeInstanceOf(Buffer);
    expect(res.body.length).toBe(4);
  });

  it("GET /incidencias/:id_incidencia devuelve 404 si no existe", async () => {
    dbIncidencias.obtenerIncidenciaPorId.mockResolvedValue(null);
    const res = await request(app).get("/incidencias/999");
    expect(res.status).toBe(404);
    expect(res.text).toMatch(/Incidencia no encontrada/);
  });

  it("GET /incidencias/:id_incidencia maneja error devolviendo 500", async () => {
    dbIncidencias.obtenerIncidenciaPorId.mockRejectedValue(new Error("db caído"));
    const res = await request(app).get("/incidencias/10");
    expect(res.status).toBe(500);
    expect(res.text).toMatch(/Error al generar el PDF/);
  });

  // ---------- GET /incidencias/resumen/cuenta ----------
  it("GET /incidencias/resumen/cuenta devuelve JSON del resumen", async () => {
    const spy = jest
      .spyOn(controladorIncidencias, "obtenerResumenIncidencias")
      .mockResolvedValue([
        { fecha: "2024-08-01", incidencias: 2 },
        { fecha: "2024-08-02", incidencias: 1 },
      ]);

    const res = await request(app).get("/incidencias/resumen/cuenta");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { fecha: "2024-08-01", incidencias: 2 },
      { fecha: "2024-08-02", incidencias: 1 },
    ]);

    spy.mockRestore();
  });

  it("GET /incidencias/resumen/cuenta maneja error devolviendo 500", async () => {
    const spy = jest
      .spyOn(controladorIncidencias, "obtenerResumenIncidencias")
      .mockRejectedValue(new Error("x"));

    const res = await request(app).get("/incidencias/resumen/cuenta");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Error interno" });

    spy.mockRestore();
  });
  // ---------- GET /incidencias/drill/:fecha ----------
  it("GET /incidencias/drill/:fecha valida formato de fecha (400)", async () => {
    const res = await request(app).get("/incidencias/drill/2024-13-40");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Formato de fecha inválido" });
  });

  it("GET /incidencias/drill/:fecha devuelve datos cuando el formato es válido", async () => {
    const datos = [{ id_incidencia: 1 }, { id_incidencia: 2 }];
    dbIncidencias.obtenerIncidenciasPorFecha.mockResolvedValue(datos);

    const res = await request(app).get("/incidencias/drill/2024-08-20");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(datos);
  });

  it("GET /incidencias/drill/:fecha maneja error devolviendo 500", async () => {
    dbIncidencias.obtenerIncidenciasPorFecha.mockRejectedValue(new Error("fail"));
    const res = await request(app).get("/incidencias/drill/2024-08-20");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Error interno al obtener incidencias" });
  });
});

// ---------------- Pruebas unitarias de obtenerResumenIncidencias ----------------
describe("Pruebas unitarias de obtenerResumenIncidencias", () => {
  beforeEach(() => jest.clearAllMocks());

  it("agrupa incidencias por fecha (Lima) y ordena ascendentemente", async () => {
    // Fechas con diferentes horas, mismo día y días consecutivos
    dbIncidencias.obtenerIncidenciasUltimos30Dias.mockResolvedValue([
      { fecha: new Date("2024-08-01T08:00:00-05:00") }, // Lima -05
      { fecha: new Date("2024-08-01T23:59:59-05:00") },
      { fecha: new Date("2024-08-02T00:01:00-05:00") },
    ]);

    const out = await controladorIncidencias.obtenerResumenIncidencias();
    expect(out).toEqual([
      { fecha: "2024-08-01", incidencias: 2 },
      { fecha: "2024-08-02", incidencias: 1 },
    ]);
  });

  it("devuelve arreglo vacío cuando no hay incidencias", async () => {
    dbIncidencias.obtenerIncidenciasUltimos30Dias.mockResolvedValue([]);
    const out = await controladorIncidencias.obtenerResumenIncidencias();
    expect(out).toEqual([]);
  });
});
