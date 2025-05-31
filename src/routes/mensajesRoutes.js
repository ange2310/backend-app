const express = require('express');
const router = express.Router();
const mensajesController = require('../controllers/mensajesController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// Ruta para enviar un mensaje
router.post(
  '/enviar/:pedidoId',
  authenticate,
  authorize('Cliente','Repartidor'),
  mensajesController.enviarMensaje
);

// Ruta para obtener mensajes de un pedido  
router.get(
  '/:pedidoId',
  authenticate,
  authorize('Cliente','Repartidor'),
  mensajesController.obtenerMensajes
);

// Ruta para marcar un mensaje como leído   
router.put(
  '/marcar-leido/:mensajeId',
  authenticate,
  authorize('Cliente','Repartidor'),
  mensajesController.marcarMensajeLeido
);

module.exports = router;