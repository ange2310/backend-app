const express = require('express');
const router = express.Router();
const pagosController = require('../controllers/pagosController');
const { authenticate } = require('../middlewares/authMiddleware');

// Crear intención de pago
router.post(
  '/:pedidoId/crear-intencion',
  authenticate,
  pagosController.crearIntencion
);

// Confirmar pago
router.post(
  '/:pedidoId/confirmar',
  authenticate,
  pagosController.confirmarPago
);

module.exports = router;
