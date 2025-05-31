const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidosController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');


router.get('/', authenticate, pedidosController.getPedidosCliente);
// Rutas para repartidores
router.get(
  "/disponibles",
  authenticate,
  authorize("Repartidor"), 
  pedidosController.getPedidosDisponibles
);


router.get(
  "/repartidor/activos",
  authenticate,
  authorize("Repartidor"), 
  pedidosController.getPedidosRepartidor
);

router.get(
  "/repartidor/historial",
  authenticate,
  authorize("Repartidor"),  
  pedidosController.getHistorialRepartidor
);

// Rutas para clientes
router.get(
  "/cliente",
  authenticate,
  authorize("Cliente", "cliente"),
  pedidosController.getPedidosCliente
);

router.get(
  "/cliente/activo",
  authenticate,
  authorize("Cliente", "cliente"),
  pedidosController.getPedidoActivo
);

// Rutas que modifican datos
router.post(
  '/crear',
  authenticate,
  authorize('Cliente','cliente'),
  pedidosController.crearPedido
);

router.put(
  '/asignar/:pedidoId', 
  authenticate, 
  authorize('Repartidor'),
  pedidosController.asignarPedido
);
router.put('/:id/repartidor', authenticate, authorize('Administrador'), pedidosController.asignarPedido);
router.put(
  '/en-camino/:pedidoId',
  authenticate,
  authorize('Repartidor'),
  pedidosController.marcarEnCamino
);

router.put(
  '/entregar/:pedidoId',
  authenticate,
  authorize('Repartidor'),
  pedidosController.marcarEntregado
);

router.delete(
  "/eliminar/:pedidoId",
  authenticate,
  authorize("Cliente", "cliente"),
  pedidosController.eliminarPedido
);

router.put(
  "/editar/:pedidoId",
  authenticate,
  authorize("Cliente", "cliente"),
  pedidosController.editarPedido
);

router.get(
  "/:pedidoId",
  authenticate,
  pedidosController.getPedidoDetalle  
);

// Rutas para restaurantes
router.get(
  "/restaurante/:restauranteId",
  authenticate,
  authorize("Admin"),
  pedidosController.getPedidosRestaurante
);

router.get(
  "/restaurante/:restauranteId/pendientes",
  authenticate,
  authorize("Admin"),
  pedidosController.getPedidosPendientesRestaurante
);

router.put(
  "/aceptar/:pedidoId",
  authenticate,
  authorize("Admin"),
  pedidosController.aceptarPedido
);

router.put(
  "/rechazar/:pedidoId",
  authenticate,
  authorize("Admin"),
  pedidosController.rechazarPedido
);

router.put(
  "/preparado/:pedidoId",
  authenticate,
  authorize("Admin"),
  pedidosController.marcarPedidoPreparado
);

router.get(
  "/restaurante/:restauranteId/estadisticas",
  authenticate,
  authorize("Admin"),
  pedidosController.getEstadisticasRestaurante
);


router.put('/:id/repartidor', authenticate, authorize('Administrador'), pedidosController.asignarRepartidor);

module.exports = router;
router.get('/:id', authenticate, pedidosController.getPedidoDetalle);