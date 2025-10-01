function verificarSesion(req, res, next) {
  if (req.isAuthenticated()) {
    if (req.user.estado !== 'Activado') {
      req.logout(() => {
        req.flash('error_msg', 'Tu cuenta ha sido desactivada.');
        return res.redirect('/');
      });
    } else {
      return next();
    }
  } else {
    return res.redirect('/');
  }
}
module.exports = verificarSesion
