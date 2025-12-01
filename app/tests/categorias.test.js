const {
  crearCategoria,
  renombrarCategoria,
  cambiarEstadoCategoria
} = require("../controllers/controladorCategorias");

jest.mock("../model/queriesCategorias", () => ({
  crearCategoria: jest.fn(),
  renombrarCategoria: jest.fn(),
  cambiarEstadoCategoria: jest.fn(),
}));

jest.mock("../utils/redis", () => ({
  redisClient: { del: jest.fn() },
}));

const dbCategorias = require("../model/queriesCategorias");
const { redisClient } = require("../utils/redis");

function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.sendStatus = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  return res;
}

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});


describe("Controlador Categorías (Unit Tests PUROS)", () => {
  test("crearCategoria: redirige correctamente", async () => {
    const req = { body: { nombre: "Nueva" } };
    const res = mockResponse();
    dbCategorias.crearCategoria.mockResolvedValue();

    await crearCategoria(req, res);

    expect(res.redirect).toHaveBeenCalledWith("/categorias");
    expect(redisClient.del).toHaveBeenCalledWith("categorias:all");
  });

  test("renombrarCategoria: nombre vacío devuelve 400", async () => {
    const req = { params: { id: 1 }, body: { nombre: "" } };
    const res = mockResponse();
    await renombrarCategoria(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("El nombre no puede estar vacío.");
  });

  test("cambiarEstadoCategoria: estado inválido devuelve 400", async () => {
    const req = { params: { id: 1 }, body: { estado: "random" } };
    const res = mockResponse();
    await cambiarEstadoCategoria(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      "Estado inválido. Usa 'activa' o 'inactiva'."
    );
  });

  test("renombrarCategoria: id no numérico produce 500", async () => {
    const req = { params: { id: "asd" }, body: { nombre: "Nuevo" } };
    const res = mockResponse();

    dbCategorias.renombrarCategoria.mockRejectedValue(new Error("DB error"));
    await renombrarCategoria(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Error al renombrar la categoría");
  });

  test("cambiarEstadoCategoria: id inválido devuelve 400", async () => {
    const req = { params: { id: "-1" }, body: { estado: "activa" } };
    const res = mockResponse();
    await cambiarEstadoCategoria(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      "El parámetro 'id' debe ser un entero positivo."
    );
  });
});
