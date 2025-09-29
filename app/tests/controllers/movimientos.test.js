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

function ensureBufferTest(x) {
  if (Buffer.isBuffer(x)) return x;
  if (x && typeof x === "object" && x.type === "Buffer" && Array.isArray(x.data)) {
    return Buffer.from(x.data);
  }
  if (x instanceof Uint8Array) return Buffer.from(x);
  try { return Buffer.from(x); } catch { return Buffer.from(String(x)); }
}

// helper para pedir binarios con supertest y siempre obtener Buffer
function getBinary(req) {
  return req
    .buffer()
    .parse((res, cb) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => cb(null, Buffer.concat(chunks)));
    });
}

// ------------------- Mocks -------------------
jest.mock("../../model/queriesMovimientos", () => ({
  obtenerMovimientos: jest.fn(),
  obtenerDetalleMovimiento: jest.fn(),
  registrarMovimiento: jest.fn(),
  registrarMovimientoVenta: jest.fn(),
  registrarMovimientoCompra: jest.fn(),
  registrarMovimientoAjuste: jest.fn(),
  registrarProductoMovimiento: jest.fn(),
  obtenerMermasUltimos30Dias: jest.fn(),
  obtenerSobrantesUltimos30Dias: jest.fn(),
  obtenerMovimientosAjustePorFecha: jest.fn(),
}));

jest.mock("../../model/queriesProductos", () => ({
  obtenerProductos: jest.fn(),
  disminuirStock: jest.fn(),
  aumentarStock: jest.fn(),
  obtenerIdProductoPorNombre: jest.fn(),
  obtenerProductoPorId: jest.fn(),
}));

jest.mock("../../model/queriesProveedores", () => ({
  obtenerProveedores: jest.fn(),
}));

jest.mock("../../model/queriesIncidencias", () => ({
  registrarIncidencia: jest.fn(),
}));

jest.mock("../../model/queriesUsuarios", () => ({
  obtenerUsuarios: jest.fn(),
}));

jest.mock("../../model/queriesClientes", () => ({
  buscarPorDNI: jest.fn(),
  buscarPorRUC: jest.fn(),
  registrarCliente: jest.fn(),
  actualizarDatosContacto: jest.fn(),
}));

jest.mock("../../model/queriesOrdenes", () => ({
  obtenerOrdenPorId: jest.fn(),
  actualizarProductosOrden: jest.fn(),
  actualizarEstadoOrden: jest.fn(),
}));

jest.mock("../../utils/pdfGenerator", () => ({
  generarComprobantePDF: jest.fn(),
}));

jest.mock("../../utils/excelGenerator", () => ({
  generarExcelVentas: jest.fn(),
  generarExcelEntradas: jest.fn(),
  generarExcelMermas: jest.fn(),
  generarExcelSobrantes: jest.fn(),
  generarExcelTodos: jest.fn(),
}));

// ------------------- Imports reales (después de los mocks) -------------------
const rutaMovimientos = require("../../routes/rutaMovimientos");
const controladorMovimientos = require("../../controllers/controladorMovimientos");

const dbMov = require("../../model/queriesMovimientos");
const dbProd = require("../../model/queriesProductos");
const dbProv = require("../../model/queriesProveedores");
const dbInc = require("../../model/queriesIncidencias");
const dbUsers = require("../../model/queriesUsuarios");
const dbCli = require("../../model/queriesClientes");
const dbOrd = require("../../model/queriesOrdenes");
const pdfUtils = require("../../utils/pdfGenerator");
const excelUtils = require("../../utils/excelGenerator");

// ------------------- Helper para app -------------------
function makeApp() {
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());

  // Usuario de prueba
  app.use((req, _res, next) => {
    req.user = { id: 101, nombre: "Tester" };
    next();
  });

  // Hacer que res.render devuelva JSON para aserciones
  app.use((req, res, next) => {
    res.render = (vista, locals) => res.status(200).json({ vista, locals });
    next();
  });

  app.use("/movimientos", rutaMovimientos);
  return app;
}

// ------------------- Test suite -------------------
describe("Pruebas de rutas y controlador de movimientos", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = makeApp();
  });

  // ---------- GET /movimientos ----------
  it("GET /movimientos debe renderizar movimientos con usuarios", async () => {
    dbMov.obtenerMovimientos.mockResolvedValue([{ id_movimiento: 1 }]);
    dbUsers.obtenerUsuarios.mockResolvedValue([{ id: 1, nombre: "User" }]);

    const res = await request(app).get("/movimientos");
    expect(res.status).toBe(200);
    expect(res.body.vista).toBe("movimientos");
    expect(res.body.locals).toEqual({
      movimientos: [{ id_movimiento: 1 }],
      usuarios: [{ id: 1, nombre: "User" }],
    });
  });

  it("GET /movimientos maneja error devolviendo 500", async () => {
    dbMov.obtenerMovimientos.mockRejectedValue(new Error("fallo"));
    const res = await request(app).get("/movimientos");
    expect(res.status).toBe(500);
    expect(res.text).toMatch(/Error al obtener los movimientos/);
  });

  // ---------- GET /movimientos/detalle/:id ----------
  it("GET /movimientos/detalle/:id devuelve 404 si no hay detalle", async () => {
    dbMov.obtenerDetalleMovimiento.mockResolvedValue([]);
    const res = await request(app).get("/movimientos/detalle/9");
    expect(res.status).toBe(404);
    expect(res.text).toMatch(/Movimiento no encontrado/);
  });

  it("GET /movimientos/detalle/:id renderiza detalle con proveedores", async () => {
    dbMov.obtenerDetalleMovimiento.mockResolvedValue([{ id_movimiento: 44 }]);
    dbProv.obtenerProveedores.mockResolvedValue([{ id: 7 }]);

    const res = await request(app).get("/movimientos/detalle/44");
    expect(res.status).toBe(200);
    expect(res.body.vista).toBe("detalleMovimiento");
    expect(res.body.locals).toEqual({
      movimientoDetalle: [{ id_movimiento: 44 }],
      proveedores: [{ id: 7 }],
    });
  });

  it("GET /movimientos/detalle/:id maneja error devolviendo 500", async () => {
    dbMov.obtenerDetalleMovimiento.mockRejectedValue(new Error("x"));
    const res = await request(app).get("/movimientos/detalle/1");
    expect(res.status).toBe(500);
    expect(res.text).toMatch(/Error al obtener detalle del movimiento/);
  });

  // ---------- GET /movimientos/registrar-venta ----------
  it("GET /movimientos/registrar-venta filtra solo productos activados con stock > 0", async () => {
    dbProd.obtenerProductos.mockResolvedValue([
      { id_producto: 1, estado: "Activado", stock: 10 },
      { id_producto: 2, estado: "Desactivado", stock: 10 },
      { id_producto: 3, estado: "Activado", stock: 0 },
    ]);

    const res = await request(app).get("/movimientos/registrar-venta");
    expect(res.status).toBe(200);
    expect(res.body.vista).toBe("nuevaVenta");
    expect(res.body.locals.productos).toEqual([{ id_producto: 1, estado: "Activado", stock: 10 }]);
  });

  // ---------- POST /movimientos/registrar-venta ----------
  it("POST /movimientos/registrar-venta (boleta) usa DNI, actualiza contacto si cambió y descuenta stock", async () => {
    // Cliente existente por DNI con datos antiguos
    dbCli.buscarPorDNI.mockResolvedValue({
      id_cliente: 500,
      correo_cliente: "old@mail.com",
      direccion_cliente: "Vieja",
    });
    dbCli.actualizarDatosContacto.mockResolvedValue(undefined);
    dbMov.registrarMovimiento.mockResolvedValue(999);
    dbMov.registrarMovimientoVenta.mockResolvedValue(undefined);
    dbMov.registrarProductoMovimiento.mockResolvedValue(undefined);
    dbProd.disminuirStock.mockResolvedValue(undefined);

    const body = {
      tipo_comprobante: "boleta",
      cliente_nombre: "Juan",
      cliente_dni: "12345678",
      razon_social: "",
      cliente_ruc: "",
      direccion_cliente: "Nueva",
      correo_cliente: "new@mail.com",
      productos: JSON.stringify([
        { id_producto: 1, cantidad: 2, precio_unitario: "10.00" },
        { id_producto: 2, cantidad: 1, precio_unitario: "5.00" },
      ]),
      total: 25,
      descripcion: "Venta test",
    };

    const res = await request(app).post("/movimientos/registrar-venta").send(body);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/movimientos");

    // Movimiento y venta registrados
    expect(dbMov.registrarMovimiento).toHaveBeenCalledWith(expect.objectContaining({
      id_usuario: 101,
      tipo: "Venta",
      descripcion: "Venta test",
    }));
    expect(dbMov.registrarMovimientoVenta).toHaveBeenCalledWith(expect.objectContaining({
      id_movimiento: 999,
      id_cliente: 500,
      tipo_comprobante: "boleta",
      total: 25,
    }));

    // Actualiza contacto porque cambió correo/dirección
    expect(dbCli.actualizarDatosContacto).toHaveBeenCalledWith(500, {
      correo_cliente: "new@mail.com",
      direccion_cliente: "Nueva",
    });

    // Detalles y stock
    expect(dbMov.registrarProductoMovimiento).toHaveBeenCalledTimes(2);
    expect(dbProd.disminuirStock).toHaveBeenCalledTimes(2);
    expect(dbProd.disminuirStock).toHaveBeenCalledWith(1, 2);
    expect(dbProd.disminuirStock).toHaveBeenCalledWith(2, 1);
  });

  it("POST /movimientos/registrar-venta (factura) registra cliente nuevo si no existe por RUC", async () => {
    dbCli.buscarPorRUC.mockResolvedValue(null);
    dbCli.registrarCliente.mockResolvedValue(777);
    dbMov.registrarMovimiento.mockResolvedValue(1001);
    dbMov.registrarMovimientoVenta.mockResolvedValue(undefined);
    dbMov.registrarProductoMovimiento.mockResolvedValue(undefined);
    dbProd.disminuirStock.mockResolvedValue(undefined);

    const res = await request(app)
      .post("/movimientos/registrar-venta")
      .send({
        tipo_comprobante: "factura",
        razon_social: "Empresa XYZ",
        cliente_ruc: "20123456789",
        cliente_nombre: "",
        cliente_dni: "",
        direccion_cliente: "Dir X",
        correo_cliente: "empresa@x.com",
        productos: JSON.stringify([{ id_producto: 9, cantidad: 3, precio_unitario: "2.00" }]),
        total: 6,
        descripcion: "Factura test",
      });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/movimientos");
    expect(dbCli.registrarCliente).toHaveBeenCalledWith(expect.objectContaining({
      razon_social: "Empresa XYZ",
      ruc_cliente: "20123456789",
    }));
    expect(dbMov.registrarMovimientoVenta).toHaveBeenCalledWith(expect.objectContaining({
      id_movimiento: 1001,
      id_cliente: 777,
      tipo_comprobante: "factura",
      total: 6,
    }));
    expect(dbProd.disminuirStock).toHaveBeenCalledWith(9, 3);
  });

  it("POST /movimientos/registrar-venta maneja error devolviendo 500", async () => {
    dbCli.buscarPorDNI.mockRejectedValue(new Error("db"));
    const res = await request(app).post("/movimientos/registrar-venta").send({
      tipo_comprobante: "boleta",
      cliente_nombre: "Juan",
      cliente_dni: "123",
      productos: JSON.stringify([]),
      total: 0,
      descripcion: "",
    });
    expect(res.status).toBe(500);
    expect(res.text).toMatch(/Error al obtener detalle del movimiento/);
  });

  // ---------- GET /movimientos/registrar-entrada ----------
  it("GET /movimientos/registrar-entrada renderiza con productos activados y proveedores", async () => {
    dbProd.obtenerProductos.mockResolvedValue([
      { id_producto: 1, estado: "Activado" },
      { id_producto: 2, estado: "Desactivado" },
    ]);
    dbProv.obtenerProveedores.mockResolvedValue([{ id: 4 }]);

    const res = await request(app).get("/movimientos/registrar-entrada");
    expect(res.status).toBe(200);
    expect(res.body.vista).toBe("nuevaEntrada");
    expect(res.body.locals.productos).toEqual([{ id_producto: 1, estado: "Activado" }]);
    expect(res.body.locals.proveedores).toEqual([{ id: 4 }]);
  });

  // ---------- POST /movimientos/registrar-entrada ----------
  it("POST /movimientos/registrar-entrada con incidencias registra incidencia y actualiza productos de la orden", async () => {
    dbMov.registrarMovimiento.mockResolvedValue(222);
    dbMov.registrarMovimientoCompra.mockResolvedValue(undefined);
    dbMov.registrarProductoMovimiento.mockResolvedValue(undefined);
    dbProd.aumentarStock.mockResolvedValue(undefined);
    dbOrd.obtenerOrdenPorId.mockResolvedValue({
      products: [
        { id_producto: 1, cantidad: 5, ingresado: 2 },
        { id_producto: 2, cantidad: 1, ingresado: 0 },
      ],
    });
    dbOrd.actualizarProductosOrden.mockResolvedValue(undefined);
    dbInc.registrarIncidencia.mockResolvedValue(undefined);

    const body = {
      proveedor: 10,
      productos: JSON.stringify([
        { id_producto: 1, cantidad: 2, precio_unitario: "3.00", incidencia: "Caja dañada", nombre: "Prod1" },
        { id_producto: 2, cantidad: 1, precio_unitario: "4.00", incidencia: "", nombre: "Prod2" },
      ]),
      total: 10,
      descripcion: "Entrada test",
      id_orden: 55,
    };

    const res = await request(app).post("/movimientos/registrar-entrada").send(body);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/movimientos");

    // Movimiento y compra
    expect(dbMov.registrarMovimiento).toHaveBeenCalledWith(expect.objectContaining({ tipo: "Compra" }));
    expect(dbMov.registrarMovimientoCompra).toHaveBeenCalledWith(expect.objectContaining({
      id_movimiento: 222,
      id_proveedor: 10,
      total: 10,
      id_orden: 55,
    }));

    // Detalles y stock
    expect(dbMov.registrarProductoMovimiento).toHaveBeenCalledTimes(2);
    expect(dbProd.aumentarStock).toHaveBeenCalledTimes(2);

    // Actualización de orden (ingresado sumado)
    expect(dbOrd.actualizarProductosOrden).toHaveBeenCalled();

    // Incidencia registrada por al menos un producto con incidencia
    expect(dbInc.registrarIncidencia).toHaveBeenCalledWith(expect.objectContaining({
      id_movimiento: 222,
      id_orden: 55,
      detalle_productos: expect.arrayContaining([
        expect.objectContaining({ incidencia: "Caja dañada" }),
      ]),
    }));
  });

  it("POST /movimientos/registrar-entrada sin incidencias y todo ingresado finaliza orden", async () => {
    dbMov.registrarMovimiento.mockResolvedValue(300);
    dbMov.registrarMovimientoCompra.mockResolvedValue(undefined);
    dbMov.registrarProductoMovimiento.mockResolvedValue(undefined);
    dbProd.aumentarStock.mockResolvedValue(undefined);
    // Primero actualizar ingresados:
    dbOrd.obtenerOrdenPorId
      .mockResolvedValueOnce({
        products: [
          { id_producto: 1, cantidad: 2, ingresado: 0 },
        ],
      }) // para actualizar ingresado
      .mockResolvedValueOnce({
        products: [
          { id_producto: 1, cantidad: 2, ingresado: 2 }, // ya quedó completo
        ],
      }); // para ver si se completa
    dbOrd.actualizarProductosOrden.mockResolvedValue(undefined);
    dbOrd.actualizarEstadoOrden.mockResolvedValue(undefined);

    const body = {
      proveedor: 77,
      productos: JSON.stringify([{ id_producto: 1, cantidad: 2, precio_unitario: "5.00", nombre: "Prod1" }]),
      total: 10,
      descripcion: "Entrada sin incidencias",
      id_orden: 900,
    };

    const res = await request(app).post("/movimientos/registrar-entrada").send(body);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/movimientos");

    expect(dbOrd.actualizarEstadoOrden).toHaveBeenCalledWith(900, "finalizada");
    expect(dbInc.registrarIncidencia).not.toHaveBeenCalled();
  });

  it("POST /movimientos/registrar-entrada maneja error devolviendo 500", async () => {
    dbMov.registrarMovimiento.mockRejectedValue(new Error("boom"));
    const res = await request(app).post("/movimientos/registrar-entrada").send({
      proveedor: 1,
      productos: JSON.stringify([]),
      total: 0,
      descripcion: "",
    });
    expect(res.status).toBe(500);
    expect(res.text).toMatch(/Error al registrar entrada/);
  });

  // ---------- GET/POST Sobrante ----------
  it("GET /movimientos/registrar-sobrante renderiza con productos activados", async () => {
    dbProd.obtenerProductos.mockResolvedValue([
      { id_producto: 1, estado: "Activado" },
      { id_producto: 2, estado: "Desactivado" },
    ]);

    const res = await request(app).get("/movimientos/registrar-sobrante");
    expect(res.status).toBe(200);
    expect(res.body.vista).toBe("nuevoSobrante");
    expect(res.body.locals.productos).toEqual([{ id_producto: 1, estado: "Activado" }]);
  });

  it("POST /movimientos/registrar-sobrante registra ajuste y aumenta stock", async () => {
    dbProd.obtenerIdProductoPorNombre.mockResolvedValue(9);
    dbProd.obtenerProductoPorId.mockResolvedValue({ precio_unitario: 2.5 });
    dbMov.registrarMovimiento.mockResolvedValue(400);
    dbMov.registrarMovimientoAjuste.mockResolvedValue(undefined);
    dbMov.registrarProductoMovimiento.mockResolvedValue(undefined);
    dbProd.aumentarStock.mockResolvedValue(undefined);

    const res = await request(app).post("/movimientos/registrar-sobrante").send({
      producto: "ProdX",
      cantidad: "3",
      motivo: "Inventario",
      descripcion: "ajuste",
    });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/movimientos");
    expect(dbMov.registrarMovimientoAjuste).toHaveBeenCalledWith(expect.objectContaining({
      id_movimiento: 400,
      tipo_ajuste: "Sobrante",
      motivo: "Inventario",
    }));
    expect(dbProd.aumentarStock).toHaveBeenCalledWith(9, 3);
  });

  // ---------- GET/POST Merma ----------
  it("GET /movimientos/registrar-merma renderiza con productos activados y stock > 0", async () => {
    dbProd.obtenerProductos.mockResolvedValue([
      { id_producto: 1, estado: "Activado", stock: 5 },
      { id_producto: 2, estado: "Activado", stock: 0 },
    ]);

    const res = await request(app).get("/movimientos/registrar-merma");
    expect(res.status).toBe(200);
    expect(res.body.vista).toBe("nuevaMerma");
    expect(res.body.locals.productos).toEqual([{ id_producto: 1, estado: "Activado", stock: 5 }]);
  });

  it("POST /movimientos/registrar-merma registra ajuste y disminuye stock", async () => {
    dbProd.obtenerIdProductoPorNombre.mockResolvedValue(12);
    dbProd.obtenerProductoPorId.mockResolvedValue({ precio_unitario: 3.5 });
    dbMov.registrarMovimiento.mockResolvedValue(410);
    dbMov.registrarMovimientoAjuste.mockResolvedValue(undefined);
    dbMov.registrarProductoMovimiento.mockResolvedValue(undefined);
    dbProd.disminuirStock.mockResolvedValue(undefined);

    const res = await request(app).post("/movimientos/registrar-merma").send({
      producto: "ProdM",
      cantidad: "2",
      motivo: "Vencimiento",
      descripcion: "merma",
    });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/movimientos");
    expect(dbMov.registrarMovimientoAjuste).toHaveBeenCalledWith(expect.objectContaining({
      id_movimiento: 410,
      tipo_ajuste: "Merma",
      motivo: "Vencimiento",
    }));
    expect(dbProd.disminuirStock).toHaveBeenCalledWith(12, 2);
  });

  // ---------- GET /movimientos/detalle/:id/comprobante ----------
  it("GET /movimientos/detalle/:id/comprobante devuelve PDF con nombre BOLETA_... o FACTURA_...", async () => {
    const fecha = new Date("2025-04-30T10:00:00Z");
    dbMov.obtenerDetalleMovimiento.mockResolvedValue([
      {
        tipo_comprobante: "boleta",
        nombre_cliente: "JuanPerez",
        razon_social: null,
        fecha,
      },
    ]);
    const pdfBytes = Uint8Array.from([9, 8, 7, 6]);
    pdfUtils.generarComprobantePDF.mockResolvedValue(pdfBytes);

    const res = await request(app).get("/movimientos/detalle/123/comprobante");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/pdf/);
    expect(res.headers["content-disposition"]).toMatch(/attachment; filename="BOLETA_JuanPerez_20250430\.pdf"/);
    expect(res.body).toBeInstanceOf(Buffer);
    expect(res.body.length).toBe(4);
  });

  // ---------- GET /movimientos/exportar (Excel) ----------
  it("GET /movimientos/exportar valida que falte 'tipo' (400)", async () => {
    const res = await request(app).get("/movimientos/exportar?desde=2025-01-01&hasta=2025-01-31");
    expect(res.status).toBe(400);
    expect(res.text).toMatch(/El parámetro 'tipo' es obligatorio/);
  });

  it("GET /movimientos/exportar valida que falte 'desde' o 'hasta' (400)", async () => {
    const res = await request(app).get("/movimientos/exportar?tipo=Venta&desde=2025-01-01");
    expect(res.status).toBe(400);
    expect(res.text).toMatch(/Debe especificar los parámetros 'desde' y 'hasta'/);
  });

  it("GET /movimientos/exportar valida 'tipo' inválido (400)", async () => {
    const res = await request(app).get("/movimientos/exportar?tipo=Otro&desde=2025-01-01&hasta=2025-01-31");
    expect(res.status).toBe(400);
    expect(res.text).toMatch(/Tipo de reporte no válido/);
  });

  it("GET /movimientos/exportar 'Venta' genera Excel y devuelve archivo", async () => {
    excelUtils.generarExcelVentas.mockResolvedValue(Buffer.from([1, 2, 3]));

    const res = await getBinary(
      request(app).get("/movimientos/exportar?tipo=Venta&desde=2025-01-01&hasta=2025-01-31")
    );

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(res.headers["content-disposition"]).toMatch(/attachment; filename=Reporte_Venta_2025-01-01_a_2025-01-31\.xlsx/);

    // ahora SIEMPRE es Buffer
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect(res.body.length).toBe(3);
  });

  // ---------- Drills por fecha ----------
  it("GET /movimientos/drill/mermas/:fecha devuelve JSON", async () => {
    dbMov.obtenerMovimientosAjustePorFecha.mockResolvedValue([{ id_mov: 1 }]);
    const res = await request(app).get("/movimientos/drill/mermas/2025-08-01");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id_mov: 1 }]);
    expect(dbMov.obtenerMovimientosAjustePorFecha).toHaveBeenCalledWith("Merma", "2025-08-01");
  });

  it("GET /movimientos/drill/mermas/:fecha maneja error 500", async () => {
    dbMov.obtenerMovimientosAjustePorFecha.mockRejectedValue(new Error("x"));
    const res = await request(app).get("/movimientos/drill/mermas/2025-08-01");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Error interno del servidor" });
  });

  it("GET /movimientos/drill/sobrantes/:fecha devuelve JSON", async () => {
    dbMov.obtenerMovimientosAjustePorFecha.mockResolvedValue([{ id_mov: 2 }]);
    const res = await request(app).get("/movimientos/drill/sobrantes/2025-08-02");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id_mov: 2 }]);
    expect(dbMov.obtenerMovimientosAjustePorFecha).toHaveBeenCalledWith("Sobrante", "2025-08-02");
  });

  it("GET /movimientos/drill/sobrantes/:fecha maneja error 500", async () => {
    dbMov.obtenerMovimientosAjustePorFecha.mockRejectedValue(new Error("y"));
    const res = await request(app).get("/movimientos/drill/sobrantes/2025-08-02");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Error interno del servidor" });
  });
});

// ------------------- Pruebas unitarias de resúmenes (mermas y sobrantes) -------------------
describe("Pruebas unitarias de obtenerResumenMermas / obtenerResumenSobrantes", () => {
  beforeEach(() => jest.clearAllMocks());

  it("obtenerResumenMermas agrupa por fecha y ordena", async () => {
    dbMov.obtenerMermasUltimos30Dias.mockResolvedValue([
      { fecha: new Date("2025-08-01T10:00:00-05:00") },
      { fecha: new Date("2025-08-01T23:59:00-05:00") },
      { fecha: new Date("2025-08-02T01:00:00-05:00") },
    ]);

    const out = await controladorMovimientos.obtenerResumenMermas();
    expect(out).toEqual([
      { fecha: "2025-08-01", mermas: 2 },
      { fecha: "2025-08-02", mermas: 1 },
    ]);
  });

  it("obtenerResumenSobrantes agrupa por fecha y ordena", async () => {
    dbMov.obtenerSobrantesUltimos30Dias.mockResolvedValue([
      { fecha: new Date("2025-08-03T08:00:00-05:00") },
      { fecha: new Date("2025-08-03T20:00:00-05:00") },
    ]);

    const out = await controladorMovimientos.obtenerResumenSobrantes();
    expect(out).toEqual([{ fecha: "2025-08-03", sobrantes: 2 }]);
  });
});
