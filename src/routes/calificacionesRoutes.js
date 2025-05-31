const express = require('express');
const router = express.Router();
const calificacionesController = require('../controllers/calificacionesController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.post(
  '/calificar/:pedidoId',
  authenticate,
  authorize('Cliente', 'cliente'),
  calificacionesController.calificarPedido
);

router.get(
  '/repartidor/:repartidorId',
  authenticate,
  calificacionesController.getCalificacionesRepartidor
);

router.get(
  '/usuario',
  authenticate,
  calificacionesController.getCalificacionesUsuario
);

router.get('/restaurante/:restauranteId', calificacionesController.getCalificacionesRestaurante);
router.get('/restaurante/:restauranteId/estadisticas', calificacionesController.getEstadisticasRestauranteConCalificaciones);
router.get('/restaurantes', calificacionesController.getRestaurantesConCalificaciones);

module.exports = router;