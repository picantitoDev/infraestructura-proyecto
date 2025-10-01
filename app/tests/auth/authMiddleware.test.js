/**
 * @jest-environment node
 */

describe("authMiddleware (verificarSesion)", () => {
  const verificarSesion = require("../../auth/authMiddleware");

  const makeReqRes = ({ isAuthenticated = false, user = null } = {}) => {
    const req = {
      user,
      isAuthenticated: () => !!isAuthenticated,
      logout: jest.fn((cb) => cb && cb()),
      flash: jest.fn(),
    };
    const res = {
      redirect: jest.fn(),
    };
    const next = jest.fn();
    return { req, res, next };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirecciona a '/' si NO está autenticado", () => {
    const { req, res, next } = makeReqRes({ isAuthenticated: false });
    verificarSesion(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith("/");
    expect(next).not.toHaveBeenCalled();
  });

  it("si está autenticado pero usuario desactivado, hace logout, flash y redirige a '/'", () => {
    const { req, res, next } = makeReqRes({
      isAuthenticated: true,
      user: { id: 1, estado: "Desactivado" },
    });

    verificarSesion(req, res, next);

    expect(req.logout).toHaveBeenCalledTimes(1);
    expect(req.flash).toHaveBeenCalledWith("error_msg", "Tu cuenta ha sido desactivada.");
    expect(res.redirect).toHaveBeenCalledWith("/");
    expect(next).not.toHaveBeenCalled();
  });

  it("si está autenticado y ACTIVADO, llama next()", () => {
    const { req, res, next } = makeReqRes({
      isAuthenticated: true,
      user: { id: 1, estado: "Activado" },
    });

    verificarSesion(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.redirect).not.toHaveBeenCalled();
  });
});
