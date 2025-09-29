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

// ---------- Helpers para binarios en supertest ----------
function getBinary(req) {
  return req
    .buffer()
    .parse((res, cb) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => cb(null, Buffer.concat(chunks)));
    });
}

// ---------- Mocks ----------
jest.mock("../../model/queriesOrdenes", () => ({
  obtenerOrdenes: jest.fn(),
  crearOrden: jest.fn(),
  obtenerOrdenPorId: jest.fn(),
  buscarOrdenPorProductoEnCurso: jest.fn(),
  obtenerOrdenesUltimos30Dias: jest.fn(),
  obtenerDetalleOrdenesPorFecha: jest.fn(),
  cancelarOrden: jest.fn(),
}));

jest.mock("../../model/queriesProductos", () => ({
  obtenerProductosCriticos: jest.fn(),
  obtenerProductosParaOrden: jest.fn(),
  obtenerProductosEnOrdenesEnCurso: jest.fn(),
}));

jest.mock("../../model/queriesProveedores", () => ({
  obtenerProveedores: jest.fn(),
  obtenerProveedorPorId: jest.fn(),
}));

jest.mock("../../model/queriesIncidencias", () => ({
  obtenerIncidenciasPorOrden: jest.fn(),
}));

jest.mock("../../utils/pdfGenerator", () => ({
  generarOrdenPDF: jest.fn(),
}));

// mock de nodemailer con transporte fake
const mockSendMail = jest.fn();
jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
}));

// ---------- Imports reales (después de los mocks) ----------
const rutaOrdenes = require("../../routes/rutaOrdenes");
const controladorOrdenes = require("../../controllers/controladorOrdenes");

const dbOrdenes = require("../../model/queriesOrdenes");
const dbProductos = require("../../model/queriesProductos");
const dbProveedores = require("../../model/queriesProveedores");
const dbIncidencias = require("../../model/queriesIncidencias");
const pdfUtil = require("../../utils/pdfGenerator");
const nodemailer = require("nodemailer");

// ---------- App de prueba ----------
function makeApp() {
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());

  // usuario simulado
  app.use((req, _res, next) => {
    req.user = { id: 123, nombre: "Tester" };
    next();
  });

  // forzar render como JSON
  app.use((req, res, next) => {
    res.render = (vista, locals) => res.status(200).json({ vista, locals });
    next();
  });

  app.use("/ordenes", rutaOrdenes);
  return app;
}

describe("Pruebas de rutas y controlador de órdenes", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = makeApp();
  });

  // -------- GET /ordenes --------
  it("GET /ordenes lista órdenes y productos bajo stock", async () => {
    dbOrdenes.obtenerOrdenes.mockResolvedValue([{ id_orden: 1 }]);
    dbProductos.obtenerProductosCriticos.mockResolvedValue([{ id_producto: 9 }]);

    const res = await request(app).get("/ordenes");
    expect(res.status).toBe(200);
    expect(res.body.vista).toBe("ordenes");
    expect(res.body.locals.ordenes).toEqual([{ id_orden: 1 }]);
    expect(res.body.locals.productosBajoStock).toEqual([{ id_producto: 9 }]);
    expect(res.body.locals.user).toEqual({ id: 123, nombre: "Tester" });
  });

  it("GET /ordenes maneja error 500", async () => {
    dbOrdenes.obtenerOrdenes.mockRejectedValue(new Error("boom"));
    const res = await request(app).get("/ordenes");
    expect(res.status).toBe(500);
    expect(res.text).toMatch(/Error al obtener órdenes/);
  });

  // -------- GET /ordenes/nueva --------
  it("GET /ordenes/nueva filtra productos activados y marca proveedores con stock bajo", async () => {
    dbProductos.obtenerProductosParaOrden.mockResolvedValue([
      { id_producto: 1, estado: "Activado", stock: 1, cantidad_minima: 5, id_proveedor: 10 },
      { id_producto: 2, estado: "DESACTIVADO", stock: 100, cantidad_minima: 1, id_proveedor: 11 },
      { id_producto: 3, estado: "activado", stock: 10, cantidad_minima: 5, id_proveedor: 12 },
    ]);
    dbProveedores.obtenerProveedores.mockResolvedValue([
      { id_proveedor: 10, nombre: "Prov A" },
      { id_proveedor: 11, nombre: "Prov B" },
      { id_proveedor: 12, nombre: "Prov C" },
    ]);
    dbProductos.obtenerProductosEnOrdenesEnCurso.mockResolvedValue([{ id_producto: 99 }]);

    const res = await request(app).get("/ordenes/nueva");
    expect(res.status).toBe(200);
    expect(res.body.vista).toBe("crearOrden");
    // productos activados (case-insensitive)
    expect(res.body.locals.productos).toEqual([
      { id_producto: 1, estado: "Activado", stock: 1, cantidad_minima: 5, id_proveedor: 10 },
      { id_producto: 3, estado: "activado", stock: 10, cantidad_minima: 5, id_proveedor: 12 },
    ]);
    // marca proveedores con productos bajo stock (stock < cantidad_minima)
    const marcados = res.body.locals.proveedores;
    const p10 = marcados.find(p => p.id_proveedor === 10);
    const p12 = marcados.find(p => p.id_proveedor === 12);
    const p11 = marcados.find(p => p.id_proveedor === 11);
    expect(p10.tieneStockBajo).toBe(true);
    expect(p12.tieneStockBajo).toBe(false); // 10 >= 5
    expect(p11.tieneStockBajo).toBe(false);
    // productos en curso pasados al frontend
    expect(res.body.locals.productosEnCurso).toEqual([{ id_producto: 99 }]);
  });

  it("GET /ordenes/nueva maneja error 500", async () => {
    dbProductos.obtenerProductosParaOrden.mockRejectedValue(new Error("x"));
    const res = await request(app).get("/ordenes/nueva");
    expect(res.status).toBe(500);
    expect(res.text).toMatch(/Error al crear orden/);
  });

  // -------- POST /ordenes/nueva --------
  it("POST /ordenes/nueva crea orden, genera PDF y envía correo, luego redirige", async () => {
    // crearOrden retorna ID
    dbOrdenes.crearOrden.mockResolvedValue(77);
    // obtener orden para PDF
    dbOrdenes.obtenerOrdenPorId.mockResolvedValue({
      id_orden: 77,
      proveedor: { id_proveedor: 10 },
      products: [{ id_producto: 1, cantidad: 2 }],
      fecha: new Date("2025-08-29T02:00:00Z"),
    });
    // PDF
    pdfUtil.generarOrdenPDF.mockResolvedValue(Uint8Array.from([1, 2, 3, 4]));
    // proveedor destinatario
    dbProveedores.obtenerProveedorPorId.mockResolvedValue({ id_proveedor: 10, correo: "prov@correo.com" });

    const payload = {
      proveedor: "10",
      productos: JSON.stringify([{ id_producto: 1, cantidad: 2 }]),
    };

    const res = await request(app).post("/ordenes/nueva").send(payload);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/ordenes");

    // creó orden con estado en_curso y usuario 123
    expect(dbOrdenes.crearOrden).toHaveBeenCalledWith(
      10,
      expect.any(Array),
      expect.any(Date), // fecha Lima en UTC JSDate
      "en_curso",
      123
    );

    // generó PDF y envió correo
    expect(pdfUtil.generarOrdenPDF).toHaveBeenCalledWith(expect.objectContaining({ id_orden: 77 }));
    expect(nodemailer.createTransport).toHaveBeenCalled();
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "prov@correo.com",
        subject: expect.stringMatching(/Nueva Orden de Reabastecimiento N.º 77/),
        attachments: expect.arrayContaining([
          expect.objectContaining({
            filename: "orden_77.pdf",
            content: expect.anything(),
            contentType: "application/pdf",
          }),
        ]),
      })
    );
  });

  it("POST /ordenes/nueva maneja error 500", async () => {
    dbOrdenes.crearOrden.mockRejectedValue(new Error("fail"));
    const res = await request(app).post("/ordenes/nueva").send({
      proveedor: "10",
      productos: JSON.stringify([]),
    });
    expect(res.status).toBe(500);
    expect(res.text).toMatch(/Error al crear orden/);
  });

  // -------- GET /ordenes/:id (API JSON con incidencias) --------
  it("GET /ordenes/:id devuelve orden con incidencias", async () => {
    dbOrdenes.obtenerOrdenPorId.mockResolvedValue({ id_orden: 5, fecha: new Date() });
    dbIncidencias.obtenerIncidenciasPorOrden.mockResolvedValue([{ id_incidencia: 1 }]);

    const res = await request(app).get("/ordenes/5");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({
      id_orden: 5,
      incidencias: [{ id_incidencia: 1 }],
    }));
  });

  it("GET /ordenes/:id devuelve 404 si no existe", async () => {
    dbOrdenes.obtenerOrdenPorId.mockResolvedValue(null);
    const res = await request(app).get("/ordenes/999");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ mensaje: "Orden no encontrada" });
  });

  it("GET /ordenes/:id maneja error 500", async () => {
    dbOrdenes.obtenerOrdenPorId.mockRejectedValue(new Error("x"));
    const res = await request(app).get("/ordenes/1");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ mensaje: "Error interno del servidor" });
  });

  // -------- GET /ordenes/detalle/:id (render) --------
  it("GET /ordenes/detalle/:id renderiza con fecha convertida a ISO de Lima y con incidencias", async () => {
    const utcDate = new Date("2025-08-29T05:00:00Z"); // 00:00 Lima aprox
    dbOrdenes.obtenerOrdenPorId.mockResolvedValue({
      id_orden: 11,
      fecha: utcDate,
      products: [],
    });
    dbIncidencias.obtenerIncidenciasPorOrden.mockResolvedValue([{ id_incidencia: 2 }]);

    const res = await request(app).get("/ordenes/detalle/11");
    expect(res.status).toBe(200);
    expect(res.body.vista).toBe("detalleOrden");
    expect(typeof res.body.locals.orden.fecha).toBe("string"); // toISO()
    expect(res.body.locals.incidencias).toEqual([{ id_incidencia: 2 }]);
  });

  it("GET /ordenes/detalle/:id devuelve 404 si no existe", async () => {
    dbOrdenes.obtenerOrdenPorId.mockResolvedValue(null);
    const res = await request(app).get("/ordenes/detalle/404");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ mensaje: "Orden no encontrada" });
  });

  it("GET /ordenes/detalle/:id maneja error 500", async () => {
    dbOrdenes.obtenerOrdenPorId.mockRejectedValue(new Error("boom"));
    const res = await request(app).get("/ordenes/detalle/1");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ mensaje: "Error interno del servidor" });
  });

  // -------- GET /ordenes/detalle/pdf/:id (binario) --------
  it("GET /ordenes/detalle/pdf/:id devuelve PDF con headers correctos", async () => {
    dbOrdenes.obtenerOrdenPorId.mockResolvedValue({ id_orden: 33, fecha: new Date() });
    pdfUtil.generarOrdenPDF.mockResolvedValue(Uint8Array.from([5, 6, 7]));

    const res = await getBinary(request(app).get("/ordenes/detalle/pdf/33"));
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/pdf/);
    expect(res.headers["content-disposition"]).toBe("attachment; filename=orden_33.pdf");
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect(res.body.length).toBe(3);
  });

  it("GET /ordenes/detalle/pdf/:id devuelve 404 si no existe", async () => {
    dbOrdenes.obtenerOrdenPorId.mockResolvedValue(null);
    const res = await request(app).get("/ordenes/detalle/pdf/99");
    expect(res.status).toBe(404);
    expect(res.text).toMatch(/Orden no encontrada/);
  });

  it("GET /ordenes/detalle/pdf/:id maneja error 500", async () => {
    dbOrdenes.obtenerOrdenPorId.mockRejectedValue(new Error("x"));
    const res = await request(app).get("/ordenes/detalle/pdf/1");
    expect(res.status).toBe(500);
    expect(res.text).toMatch(/Error al generar el PDF/);
  });

  // -------- GET /ordenes/producto/:idProducto --------
  it("GET /ordenes/producto/:idProducto devuelve JSON si hay orden en curso", async () => {
    dbOrdenes.buscarOrdenPorProductoEnCurso.mockResolvedValue({ id_orden: 42 });
    const res = await request(app).get("/ordenes/producto/10");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id_orden: 42 });
  });

  it("GET /ordenes/producto/:idProducto devuelve 404 si no hay orden", async () => {
    dbOrdenes.buscarOrdenPorProductoEnCurso.mockResolvedValue(null);
    const res = await request(app).get("/ordenes/producto/10");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Orden no encontrada para este producto" });
  });

  it("GET /ordenes/producto/:idProducto maneja error 500", async () => {
    dbOrdenes.buscarOrdenPorProductoEnCurso.mockRejectedValue(new Error("y"));
    const res = await request(app).get("/ordenes/producto/10");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Error interno del servidor" });
  });

  // -------- GET /ordenes/detalle-fecha/:fecha --------
  it("GET /ordenes/detalle-fecha/:fecha devuelve listado por fecha", async () => {
    dbOrdenes.obtenerDetalleOrdenesPorFecha.mockResolvedValue([{ id_orden: 1 }]);
    const res = await request(app).get("/ordenes/detalle-fecha/2025-08-20");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id_orden: 1 }]);
  });

  it("GET /ordenes/detalle-fecha/:fecha maneja error 500", async () => {
    dbOrdenes.obtenerDetalleOrdenesPorFecha.mockRejectedValue(new Error("z"));
    const res = await request(app).get("/ordenes/detalle-fecha/2025-08-20");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Error interno al obtener detalle de órdenes" });
  });

  // -------- POST /ordenes/:id/cancelar --------
  it("POST /ordenes/:id/cancelar cancela y redirige", async () => {
    dbOrdenes.cancelarOrden.mockResolvedValue(undefined);
    const res = await request(app).post("/ordenes/5/cancelar");
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/ordenes");
  });

  it("POST /ordenes/:id/cancelar maneja error 500", async () => {
    dbOrdenes.cancelarOrden.mockRejectedValue(new Error("cant"));
    const res = await request(app).post("/ordenes/7/cancelar");
    expect(res.status).toBe(500);
    expect(res.text).toMatch(/Error al cancelar la orden/);
  });
});

// -------- Pruebas unitarias de obtenerResumenOrdenes --------
describe("Pruebas unitarias de obtenerResumenOrdenes", () => {
  beforeEach(() => jest.clearAllMocks());

  it("agrupa por día en zona Lima y ordena ascendente", async () => {
    // Fechas UTC que caen en días sucesivos en Lima
    dbOrdenes.obtenerOrdenesUltimos30Dias.mockResolvedValue([
      { id_orden: 1, fecha: new Date("2025-08-01T03:00:00Z") },
      { id_orden: 2, fecha: new Date("2025-08-01T20:00:00Z") },
      { id_orden: 3, fecha: new Date("2025-08-02T02:00:00Z") },
    ]);

    const out = await controladorOrdenes.obtenerResumenOrdenes();

    // estructura: [{ fecha, total, ordenes:[{id, fechaUTC}] }]
    expect(out.map(i => i.fecha)).toEqual(["2025-07-31", "2025-08-01"]); // según offset Lima (-05)
    const totales = out.map(i => i.total);
    expect(totales).toEqual([1, 2]);

    // ids agrupados
    const idsAgrupados = out.map(i => i.ordenes.map(o => o.id));
    // El primer grupo (p.e. 2025-07-31) con id 1 y el segundo con 2,3 (según la conversión real)
    expect(idsAgrupados.flat().sort()).toEqual([1, 2, 3]);
  });

  it("devuelve [] si no hay órdenes", async () => {
    dbOrdenes.obtenerOrdenesUltimos30Dias.mockResolvedValue([]);
    const out = await controladorOrdenes.obtenerResumenOrdenes();
    expect(out).toEqual([]);
  });
});
