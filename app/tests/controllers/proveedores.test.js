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

// ---- Mocks para queries de proveedores ----
jest.mock("../../model/queriesProveedores", () => ({
  obtenerProveedores: jest.fn(),
  insertarProveedor: jest.fn(),
  obtenerProveedorPorId: jest.fn(),
  actualizarProveedor: jest.fn(),
}));

const dbProveedores = require("../../model/queriesProveedores");
const rutaProveedores = require("../../routes/rutaProveedores");

function makeApp() {
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());

  // reemplazar res.render por JSON
  app.use((req, res, next) => {
    res.render = (vista, locals) => res.status(200).json({ vista, locals });
    next();
  });

  app.use("/proveedores", rutaProveedores);
  return app;
}

describe("Pruebas de rutas y controlador de proveedores", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = makeApp();
  });

  // ---------- GET /proveedores ----------
  it("GET /proveedores debe renderizar lista de proveedores", async () => {
    dbProveedores.obtenerProveedores.mockResolvedValue([{ id: 1, razon_social: "Acme" }]);

    const res = await request(app).get("/proveedores");
    expect(res.status).toBe(200);
    expect(res.body.vista).toBe("proveedores");
    expect(res.body.locals).toEqual({ proveedores: [{ id: 1, razon_social: "Acme" }] });
  });

  it("GET /proveedores maneja error devolviendo 500", async () => {
    dbProveedores.obtenerProveedores.mockRejectedValue(new Error("fallo"));
    const res = await request(app).get("/proveedores");
    expect(res.status).toBe(500);
    expect(res.text).toMatch(/Error al obtener los proveedores/);
  });

  // ---------- GET /proveedores/nuevo ----------
  it("GET /proveedores/nuevo debe renderizar formulario", async () => {
    dbProveedores.obtenerProveedores.mockResolvedValue([{ id: 2, razon_social: "Beta" }]);

    const res = await request(app).get("/proveedores/nuevo");
    expect(res.status).toBe(200);
    expect(res.body.vista).toBe("nuevoProveedor");
    expect(res.body.locals).toEqual({ proveedores: [{ id: 2, razon_social: "Beta" }] });
  });

  it("GET /proveedores/nuevo maneja error devolviendo 500", async () => {
    dbProveedores.obtenerProveedores.mockRejectedValue(new Error("oops"));
    const res = await request(app).get("/proveedores/nuevo");
    expect(res.status).toBe(500);
    expect(res.text).toMatch(/Error al cargar registro de proveedores/);
  });

  // ---------- POST /proveedores/nuevo ----------
  it("POST /proveedores/nuevo inserta proveedor y redirige", async () => {
    dbProveedores.insertarProveedor.mockResolvedValue(undefined);

    const res = await request(app).post("/proveedores/nuevo").send({
      razon_social: "NuevoProv",
      ruc: "123",
      numero_telefono: "999",
      correo: "a@b.com",
      direccion: "Calle 1",
    });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/proveedores");
    expect(dbProveedores.insertarProveedor).toHaveBeenCalledWith({
      razon_social: "NuevoProv",
      ruc: "123",
      numero_telefono: "999",
      correo: "a@b.com",
      direccion: "Calle 1",
    });
  });

  it("POST /proveedores/nuevo maneja error devolviendo 500", async () => {
    dbProveedores.insertarProveedor.mockRejectedValue(new Error("fail"));
    const res = await request(app).post("/proveedores/nuevo").send({});
    expect(res.status).toBe(500);
    expect(res.text).toMatch(/Error al cargar registro de proveedores/);
  });

  // ---------- GET /proveedores/editar/:id ----------
  it("GET /proveedores/editar/:id renderiza detalleProveedor", async () => {
    dbProveedores.obtenerProveedorPorId.mockResolvedValue({ id: 10, razon_social: "ProvX" });
    dbProveedores.obtenerProveedores.mockResolvedValue([{ id: 11 }]);

    const res = await request(app).get("/proveedores/editar/10");
    expect(res.status).toBe(200);
    expect(res.body.vista).toBe("detalleProveedor");
    expect(res.body.locals).toEqual({
      proveedor: { id: 10, razon_social: "ProvX" },
      proveedores: [{ id: 11 }],
    });
  });

  // ---------- PUT /proveedores/:id ----------
  it("PUT /proveedores/:id actualiza proveedor y redirige", async () => {
    dbProveedores.actualizarProveedor.mockResolvedValue(undefined);

    const res = await request(app).put("/proveedores/20").send({ razon_social: "Actualizado" });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/proveedores");
    expect(dbProveedores.actualizarProveedor).toHaveBeenCalledWith("20", { razon_social: "Actualizado" });
  });
});
