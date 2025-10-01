/**
 * @jest-environment node
 */

// --- Mocks de dependencias externas ---
jest.mock("bcryptjs", () => ({ compare: jest.fn() }));

// Capturaremos lo que registre passportConfig aquí
const mockStore = {};
jest.mock("passport", () => {
  const api = {
    use: jest.fn((strategy) => { mockStore.strategy = strategy; }),
    serializeUser: jest.fn((cb) => { mockStore.serialize = cb; }),
    deserializeUser: jest.fn((cb) => { mockStore.deserialize = cb; }),
  };
  // helper para acceder desde los tests
  api.__get = () => mockStore;
  return api;
});

// LocalStrategy mínima para que passport.use reciba algo con _verify
jest.mock("passport-local", () => {
  return {
    Strategy: class LocalStrategy {
      constructor(verify) {
        this.name = "local";
        this._verify = verify; // la usaremos en el test
      }
    },
  };
});

jest.mock("../../model/queriesUsuarios", () => ({
  buscarUsuarioPorNombreOCorreo: jest.fn(),
  buscarUsuarioPorId: jest.fn(),
}));

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterAll(() => {
  console.error.mockRestore();
});

const bcrypt = require("bcryptjs");
const dbUsuarios = require("../../model/queriesUsuarios");

// Importa el módulo que registra estrategia + serializers en nuestro mock de passport
const passport = require("../../auth/passportConfig");
// Acceso a las funciones registradas
const reg = require("passport").__get();

describe("passportConfig (LocalStrategy + serialize/deserialize)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const callLocalVerify = async (usernameOrEmail, password) => {
    const done = jest.fn();
    await reg.strategy._verify(usernameOrEmail, password, done);
    return done;
  };

  it("rechaza si no encuentra usuario", async () => {
    dbUsuarios.buscarUsuarioPorNombreOCorreo.mockResolvedValue(null);

    const done = await callLocalVerify("someone", "pass");
    expect(done).toHaveBeenCalledWith(null, false, { message: "Usuario o correo incorrecto" });
  });

  it("rechaza si el usuario está desactivado", async () => {
    dbUsuarios.buscarUsuarioPorNombreOCorreo.mockResolvedValue({
      id: 10, username: "x", password: "hash", estado: "Desactivado",
    });

    const done = await callLocalVerify("x", "p");
    expect(done).toHaveBeenCalledWith(null, false, { message: "Este usuario está desactivado" });
  });

  it("rechaza si la contraseña no coincide", async () => {
    dbUsuarios.buscarUsuarioPorNombreOCorreo.mockResolvedValue({
      id: 11, username: "y", password: "hashed", estado: "Activado",
    });
    bcrypt.compare.mockResolvedValue(false);

    const done = await callLocalVerify("y", "wrong");
    expect(bcrypt.compare).toHaveBeenCalledWith("wrong", "hashed");
    expect(done).toHaveBeenCalledWith(null, false, { message: "Contraseña incorrecta" });
  });

  it("acepta si usuario existe, está activo y password OK", async () => {
    const user = { id: 12, username: "z", password: "hash", estado: "Activado" };
    dbUsuarios.buscarUsuarioPorNombreOCorreo.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);

    const done = await callLocalVerify("z", "correct");
    expect(done).toHaveBeenCalledWith(null, user);
  });

  it("propaga error inesperado del lookup", async () => {
    const err = new Error("db down");
    dbUsuarios.buscarUsuarioPorNombreOCorreo.mockRejectedValue(err);

    const done = await callLocalVerify("a", "b");
    expect(done).toHaveBeenCalledWith(err);
  });

  // ---- serialize / deserialize usando las funciones registradas ----
  it("serializeUser guarda user.id", (doneTest) => {
    reg.serialize({ id: 99 }, (err, id) => {
      try {
        expect(err).toBeNull();
        expect(id).toBe(99);
        doneTest();
      } catch (e) { doneTest(e); }
    });
  });

  it("deserializeUser busca por id y devuelve el usuario", (doneTest) => {
    const user = { id: 77, username: "pepe" };
    dbUsuarios.buscarUsuarioPorId.mockResolvedValue(user);

    reg.deserialize(77, (err, result) => {
      try {
        expect(err).toBeNull();
        expect(result).toEqual(user);
        expect(dbUsuarios.buscarUsuarioPorId).toHaveBeenCalledWith(77);
        doneTest();
      } catch (e) { doneTest(e); }
    });
  });

  it("deserializeUser propaga error si falla la consulta", (doneTest) => {
    const boom = new Error("fail");
    dbUsuarios.buscarUsuarioPorId.mockRejectedValue(boom);

    reg.deserialize(1, (err, result) => {
      try {
        expect(err).toBe(boom);
        expect(result).toBeUndefined();
        doneTest();
      } catch (e) { doneTest(e); }
    });
  });
});
