/**
 * @jest-environment node
 */

describe("authMiddlewareAdmin (verificarAdmin)", () => {
  const verificarAdmin = require("../../auth/authMiddlewareAdmin");

  const makeReqRes = ({ isAuthenticated = false, user = null } = {}) => {
    const req = {
      user,
      isAuthenticated: () => !!isAuthenticated,
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    const next = jest.fn();
    return { req, res, next };
  };

  beforeEach(() => jest.clearAllMocks());

  it("si NO está autenticado, responde 403 con HTML", () => {
    const { req, res, next } = makeReqRes({ isAuthenticated: false });
    verificarAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("si está autenticado pero rol != 'Admin', responde 403", () => {
    const { req, res, next } = makeReqRes({
      isAuthenticated: true,
      user: { id: 1, rol: "User" },
    });
    verificarAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("si está autenticado y rol 'Admin', llama next()", () => {
    const { req, res, next } = makeReqRes({
      isAuthenticated: true,
      user: { id: 1, rol: "Admin" },
    });
    verificarAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
