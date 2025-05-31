const express = require('express');
const router = express.Router();
const productosController = require('../controllers/productosController');
const { authenticate } = require('../middlewares/authMiddleware');

router.get('/', productosController.listarProductos);
router.get('/restaurante/:restauranteId', productosController.listarProductosPorRestaurante);
router.get('/sucursal/:sucursalId', productosController.listarProductosPorSucursal);  // Nueva

router.get('/:id', productosController.obtenerProducto);

router.post('/', authenticate, productosController.crearProducto);
router.put('/:productoId', authenticate, productosController.editarProducto); //Corregida
router.delete('/:id', authenticate, productosController.eliminarProducto);

module.exports = router;