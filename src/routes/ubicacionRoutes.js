const express = require('express');
const router = express.Router();
const ubicacionController = require('../controllers/ubicacionController');
const { authenticate } = require('../middlewares/authMiddleware');

router.get(
  '/pedido/:pedidoId',
  authenticate,
  ubicacionController.obtenerUbicacionPedido
);

router.put(
  '/pedido/:pedidoId',
  authenticate,
  ubicacionController.actualizarUbicacionPedido
);

module.exports = router;