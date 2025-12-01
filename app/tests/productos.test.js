const {
  obtenerProductos,
  obtenerProductoPorId,
  crearProductoPost,
  actualizarProducto,
} = require("../controllers/controladorProductos");

jest.mock("../model/queriesProductos", () => ({
  obtenerProductos: jest.fn(),
  obtenerProductoPorId: jest.fn(),
  crearProducto: jest.fn(),
  actualizarProducto: jest.fn(),
}));

jest.mock("../model/queriesCategorias", () => ({
  obtenerCategoriasActivas: jest.fn(),
}));

jest.mock("../model/queriesProveedores", () => ({
  obtenerProveedores: jest.fn(),
}));

jest.mock("../utils/redis", () => ({
  getOrSetCache: jest.fn((k, cb) => cb()),
  redisClient: { del: jest.fn() },
}));

const dbProductos = require("../model/queriesProductos");
const dbCategorias = require("../model/queriesCategorias");
const dbProveedores = require("../model/queriesProveedores");

function mockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    sendStatus: jest.fn().mockReturnThis(),
    render: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
  };
}

beforeAll(() => jest.spyOn(console, "error").mockImplementation(() => {}));

describe("Controlador Productos (Unit Tests)", () => {
  test("obtenerProductos: error 500", async () => {
    const req = {}, res = mockRes();
    dbProductos.obtenerProductos.mockRejectedValue(new Error());
    await obtenerProductos(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Error al obtener los productos");
  });

  test("obtenerProductoPorId: ID inválido", async () => {
    const req = { params: { id: "xxx" } };
    const res = mockRes();

    await obtenerProductoPorId(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("El ID del producto no es válido");
  });

  test("obtenerProductos: renderiza vista con datos", async () => {
    const req = {}, res = mockRes();
    dbProductos.obtenerProductos.mockResolvedValue([{ id: 1 }]);
    dbCategorias.obtenerCategoriasActivas.mockResolvedValue([{ id: 1 }]);
    dbProveedores.obtenerProveedores.mockResolvedValue([]);

    await obtenerProductos(req, res);
    expect(res.render).toHaveBeenCalledWith(
      "productos",
      expect.objectContaining({
        productos: [{ id: 1 }],
        categorias: [{ id: 1 }],
      })
    );
  });

  test("crearProductoPost: error en DB", async () => {
    const req = {
      body: {
        nombre: "Laptop",
        stock: "10",
        precio_unitario: "1000",
        id_categoria: "1",
        id_proveedor: "1",
        cantidad_minima: "3",
      },
    };

    const res = mockRes();
    dbProductos.crearProducto.mockRejectedValue(new Error());
    await crearProductoPost(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Error al crear el producto");
  });

  test("actualizarProducto: ID inválido", async () => {
    const req = {
      params: { id: "NaN" },
      body: { nombre: "A", stock: "1", precio_unitario: "2", id_categoria: "1", id_proveedor: "1", cantidad_minima: "1", estado: "activo" },
    };
    const res = mockRes();
    await actualizarProducto(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("ID de producto no válido");
  });
});
