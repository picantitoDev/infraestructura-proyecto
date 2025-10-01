const express = require('express');
const router = express.Router();
const controladorPassword = require('../controllers/controladorPassword');

router.get('/forgot-password', controladorPassword.mostrarFormularioRecuperacion);
router.post('/forgot-password', controladorPassword.procesarFormularioRecuperacion);
router.get('/reset-password/:token', controladorPassword.mostrarFormularioReset);
router.post('/reset-password/:token', controladorPassword.procesarResetPassword);

module.exports = router;
