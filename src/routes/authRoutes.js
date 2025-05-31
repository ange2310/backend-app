const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// Rutas públicas
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);

router.post('/reset-password-forgot', authController.resetPasswordForgot);

// Rutas de validación
router.get('/validate/cedula/:cedula', authController.validateCedula);
router.get('/validate/telefono/:telefono', authController.validateTelefono);

// Ruta protegida
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router;