function verificarAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.rol === "Admin") {
    return next()
  }
  res.status(403).send(`
          <h1>No tienes permiso para acceder a esta sección</h1>
          <a href="/" style="color: #3498db; text-decoration: underline;">Volver al inicio</a>
        `)
}

module.exports = verificarAdmin
