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

// ---- Mocks para módulos de datos y utilidades ----
jest.mock("../../model/queriesProductos", () => ({
  obtenerProductos: jest.fn(),
  obtenerProductoPorId: jest.fn(),
  actualizarProducto: jest.fn(),
  crearProducto: jest.fn(),
  obtenerRankingPorCantidad: jest.fn(),
  obtenerRankingPorIngresos: jest.fn(),
}));

jest.mock("../../model/queriesCategorias", () => ({
  obtenerCategoriasActivas: jest.fn(),
  obtenerCategorias: jest.fn(),
}));

jest.mock("../../model/queriesProveedores", () => ({
  obtenerProveedores: jest.fn(),
}));

jest.mock("../../model/queriesUsuarios", () => ({
  buscarUsuarioPorId: jest.fn(),
}));

jest.mock("../../model/queriesAuditoria", () => ({
  registrarAuditoriaProducto: jest.fn(),
}));

jest.mock("../../model/queriesOrdenes", () => ({
  buscarOrdenPorProductoEnCurso: jest.fn(),
}));

jest.mock("../../utils/pdfGenerator", () => ({
  crearOrdenReposicionPDF: jest.fn(),
}));

// ---- Importar después de los mocks para que los controladores los usen ----
const productosRouter = require("../../routes/rutaProductos");
const controladorProductos = require("../../controllers/controladorProductos");

// Referencias a los mocks
const dbProductos = require("../../model/queriesProductos");
const dbCategorias = require("../../model/queriesCategorias");
const dbProveedores = require("../../model/queriesProveedores");
const dbUsuarios = require("../../model/queriesUsuarios");
const dbAuditoria = require("../../model/queriesAuditoria");
const dbOrdenes = require("../../model/queriesOrdenes");
const pdfUtils = require("../../utils/pdfGenerator");

/** Helper para construir una app Express de prueba:
 *  - Inyecta un req.user falso
 *  - Reemplaza res.render para que devuelva JSON en lugar de renderizar vistas
 */
function makeApp() {
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());

  app.use((req, _res, next) => {
    req.user = { id: 99, nombre: "Tester" };
    next();
  });

  app.use((req, res, next) => {
    res.render = (view, locals) => res.status(200).json({ view, locals });
    next();
  });

  app.use("/productos", productosRouter);
  app.get("/productos/resumen/destacados", controladorProductos.resumenProductosDestacados);

  return app;
}

describe("Pruebas de rutas y controlador de productos", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = makeApp();
  });

  // ---------------- GET /productos/ ----------------
  it("GET /productos debe renderizar productos con productos + categorías", async () => {
    dbProductos.obtenerProductos.mockResolvedValue([{ id_producto: 1, nombre: "A" }]);
    dbCategorias.obtenerCategoriasActivas.mockResolvedValue([{ id_categoria: 10, nombre: "Cat" }]);

    const res = await request(app).get("/productos");
    expect(res.status).toBe(200);
    expect(res.body.view).toBe("productos");
    expect(res.body.locals).toEqual({
      productos: [{ id_producto: 1, nombre: "A" }],
      categorias: [{ id_categoria: 10, nombre: "Cat" }],
    });
  });

  it("GET /productos maneja error devolviendo 500", async () => {
    dbProductos.obtenerProductos.mockRejectedValue(new Error("boom"));
    const res = await request(app).get("/productos");
    expect(res.status).toBe(500);
    expect(res.text).toMatch(/Error al obtener los productos/);
  });

  // ------------- GET /productos/detalle/:id -------------
  it("GET /productos/detalle/:id devuelve 400 si el id es inválido", async () => {
    const res = await request(app).get("/productos/detalle/abc");
    expect(res.status).toBe(400);
    expect(res.text).toMatch(/no es válido/i);
  });

  it("GET /productos/detalle/:id devuelve 404 si no encuentra el producto", async () => {
    dbProductos.obtenerProductos.mockResolvedValue([]);
    dbProductos.obtenerProductoPorId.mockResolvedValue(null);
    dbCategorias.obtenerCategorias.mockResolvedValue([]);
    dbProveedores.obtenerProveedores.mockResolvedValue([]);
    dbOrdenes.buscarOrdenPorProductoEnCurso.mockResolvedValue(null);

    const res = await request(app).get("/productos/detalle/1");
    expect(res.status).toBe(404);
    expect(res.text).toMatch(/Producto no encontrado/);
  });

  it("GET /productos/detalle/:id renderiza detalleProducto con datos correctos", async () => {
    const producto = { id_producto: 2, nombre: "B", id_categoria: 1, id_proveedor: 1 };
    dbProductos.obtenerProductos.mockResolvedValue([{ id_producto: 1 }, producto, { id_producto: 3 }]);
    dbProductos.obtenerProductoPorId.mockResolvedValue(producto);
    dbCategorias.obtenerCategorias.mockResolvedValue([{ id_categoria: 1, nombre: "Cat" }]);
    dbProveedores.obtenerProveedores.mockResolvedValue([{ id_proveedor: 1, nombre: "Prov" }]);
    dbOrdenes.buscarOrdenPorProductoEnCurso.mockResolvedValue({ id_orden: 77 });

    const res = await request(app).get("/productos/detalle/2");
    expect(res.status).toBe(200);
    expect(res.body.view).toBe("detalleProducto");
    expect(res.body.locals.producto).toEqual(producto);
    expect(res.body.locals.productos).toEqual([{ id_producto: 1 }, { id_producto: 3 }]);
    expect(res.body.locals.categorias).toEqual([{ id_categoria: 1, nombre: "Cat" }]);
    expect(res.body.locals.proveedores).toEqual([{ id_proveedor: 1, nombre: "Prov" }]);
    expect(res.body.locals.ordenAsociada).toEqual({ id_orden: 77 });
    expect(res.body.locals.usuario).toEqual({ id: 99, nombre: "Tester" });
  });

  // ------------- PUT /productos/detalle/:id -------------
  it("PUT /productos/detalle/:id devuelve 400 si el id es inválido", async () => {
    const res = await request(app).put("/productos/detalle/NaN").send({});
    expect(res.status).toBe(400);
    expect(res.text).toMatch(/ID de producto no válido/);
  });

  it("PUT /productos/detalle/:id devuelve 404 si el producto no existe", async () => {
    dbProductos.obtenerProductoPorId.mockResolvedValue(null);
    const res = await request(app)
      .put("/productos/detalle/10")
      .send({ nombre: "X", stock: 1, precio_unitario: 1, id_categoria: 1, id_proveedor: 1, cantidad_minima: 1, estado: "activo" });
    expect(res.status).toBe(404);
    expect(res.text).toMatch(/Producto no encontrado/);
  });

  it("PUT /productos/detalle/:id actualiza y registra auditoría cuando cambian campos", async () => {
    dbProductos.obtenerProductoPorId.mockResolvedValue({
      nombre: "Original",
      stock: 10,
      precio_unitario: 5.5,
      id_categoria: 1,
      id_proveedor: 1,
      cantidad_minima: 2,
      estado: "activo",
    });

    const res = await request(app)
      .put("/productos/detalle/5")
      .send({ nombre: "Cambiado", stock: 10, precio_unitario: 5.5, id_categoria: 1, id_proveedor: 1, cantidad_minima: 2, estado: "activo" });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/productos");
    expect(dbAuditoria.registrarAuditoriaProducto).toHaveBeenCalled();
  });

  it("PUT /productos/detalle/:id actualiza SIN auditoría si no cambió nada", async () => {
    dbProductos.obtenerProductoPorId.mockResolvedValue({
      nombre: "Igual",
      stock: 1,
      precio_unitario: 1.1,
      id_categoria: 2,
      id_proveedor: 3,
      cantidad_minima: 4,
      estado: "activo",
    });

    const body = { nombre: "Igual", stock: 1, precio_unitario: 1.1, id_categoria: 2, id_proveedor: 3, cantidad_minima: 4, estado: "activo" };

    const res = await request(app).put("/productos/detalle/6").send(body);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/productos");
    expect(dbAuditoria.registrarAuditoriaProducto).not.toHaveBeenCalled();
  });

  it("PUT /productos/detalle/:id maneja error devolviendo 500", async () => {
    dbProductos.obtenerProductoPorId.mockRejectedValue(new Error("db down"));
    const res = await request(app)
      .put("/productos/detalle/7")
      .send({ nombre: "X", stock: 1, precio_unitario: 1, id_categoria: 1, id_proveedor: 1, cantidad_minima: 1, estado: "activo" });
    expect(res.status).toBe(500);
    expect(res.text).toMatch(/Error al actualizar el producto/);
  });

  // -------- GET /productos/crear-producto & POST /productos/crear-producto --------
  it("GET /productos/crear-producto renderiza formulario con categorías, proveedores y productos", async () => {
    dbCategorias.obtenerCategoriasActivas.mockResolvedValue([{ id_categoria: 1 }]);
    dbProveedores.obtenerProveedores.mockResolvedValue([{ id_proveedor: 2 }]);
    dbProductos.obtenerProductos.mockResolvedValue([{ id_producto: 3 }]);

    const res = await request(app).get("/productos/crear-producto");
    expect(res.status).toBe(200);
    expect(res.body.view).toBe("nuevoProducto");
    expect(res.body.locals).toEqual({
      categorias: [{ id_categoria: 1 }],
      proveedores: [{ id_proveedor: 2 }],
      productos: [{ id_producto: 3 }],
    });
  });

  it("POST /productos/crear-producto crea producto y redirige", async () => {
    dbProductos.crearProducto.mockResolvedValue(undefined);
    const res = await request(app).post("/productos/crear-producto").send({
      nombre: "Nuevo",
      stock: "5",
      precio_unitario: "12.50",
      id_categoria: "9",
      id_proveedor: "8",
      cantidad_minima: "1",
    });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/productos");
  });

  it("POST /productos/crear-producto maneja error devolviendo 500", async () => {
    dbProductos.crearProducto.mockRejectedValue(new Error("fail"));
    const res = await request(app).post("/productos/crear-producto").send({});
    expect(res.status).toBe(500);
    expect(res.text).toMatch(/Error al crear el producto/);
  });

  // ---------------- GET /productos/:id/generar-orden ----------------
  it("GET /productos/:id/generar-orden devuelve PDF con cabeceras correctas", async () => {
    dbUsuarios.buscarUsuarioPorId.mockResolvedValue({ id: 99, nombre: "Tester" });
    dbProductos.obtenerProductoPorId.mockResolvedValue({ id_producto: 1, nombre: "Café Orgánico" });
    pdfUtils.crearOrdenReposicionPDF.mockResolvedValue(Uint8Array.from([1, 2, 3, 4]));

    const res = await request(app).get("/productos/1/generar-orden");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/pdf/);
    expect(res.headers["content-disposition"]).toMatch(/attachment; filename="Solicitud_Compra_CafeOrganico_/);
    expect(res.body).toBeInstanceOf(Buffer);
    expect(res.body.length).toBe(4);
  });

  // ---------------- GET /productos/resumen/destacados ----------------
  it("GET /productos/resumen/destacados devuelve resumen JSON", async () => {
    dbProductos.obtenerRankingPorCantidad.mockResolvedValue([
      { nombre: "A", total_vendido: 100 },
      { nombre: "B", total_vendido: 0 },
    ]);
    dbProductos.obtenerRankingPorIngresos.mockResolvedValue([
      { nombre: "X", total_ingresos: 500 },
      { nombre: "Y", total_ingresos: 0 },
    ]);

    const res = await request(app).get("/productos/resumen/destacados");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("masVendido");
    expect(res.body).toHaveProperty("menosVendido");
    expect(res.body).toHaveProperty("masIngresos");
    expect(res.body).toHaveProperty("menosIngresos");
  });

  it("GET /productos/resumen/destacados maneja error devolviendo 500", async () => {
    dbProductos.obtenerRankingPorCantidad.mockRejectedValue(new Error("nope"));
    const res = await request(app).get("/productos/resumen/destacados");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Error interno del servidor" });
  });
});

// ---------------- Pruebas unitarias para obtenerResumenProductos ----------------
describe("Pruebas unitarias de obtenerResumenProductos", () => {
  beforeEach(() => jest.clearAllMocks());

  it("devuelve valores por defecto cuando no hay rankings", async () => {
    dbProductos.obtenerRankingPorCantidad.mockResolvedValue([]);
    dbProductos.obtenerRankingPorIngresos.mockResolvedValue([]);

    const result = await controladorProductos.obtenerResumenProductos();
    expect(result).toEqual({
      masVendido: { nombre: "N/A", total_vendido: 0 },
      menosVendido: { nombre: "N/A", total_vendido: 0 },
      masIngresos: { nombre: "N/A", total_ingresos: 0 },
      menosIngresos: { nombre: "N/A", total_ingresos: 0 },
    });
  });

  it("omite ceros al seleccionar menosVendido/menosIngresos", async () => {
    dbProductos.obtenerRankingPorCantidad.mockResolvedValue([
      { nombre: "P1", total_vendido: 5 },
      { nombre: "P2", total_vendido: 0 },
    ]);
    dbProductos.obtenerRankingPorIngresos.mockResolvedValue([
      { nombre: "Q1", total_ingresos: 10 },
      { nombre: "Q2", total_ingresos: 0 },
    ]);

    const result = await controladorProductos.obtenerResumenProductos();
    expect(result.masVendido).toEqual({ nombre: "P1", total_vendido: 5 });
    expect(result.menosVendido).toEqual({ nombre: "P1", total_vendido: 5 });
    expect(result.masIngresos).toEqual({ nombre: "Q1", total_ingresos: 10 });
    expect(result.menosIngresos).toEqual({ nombre: "Q1", total_ingresos: 10 });
  });
});
