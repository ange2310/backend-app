const express = require('express');
const router = express.Router();
const usuariosController = require("../controllers/usuariosController");
const { authenticate } = require('../middlewares/authMiddleware');

router.get('/perfil', authenticate, usuariosController.getUserProfile);

router.put('/perfil', authenticate, usuariosController.updateUserProfile);

router.post('/perfil/imagen', authenticate, usuariosController.updateProfileImage);


router.post('/perfil/cambiar-contrasena', authenticate, usuariosController.cambiarContrasena);

router.get('/mis-direcciones', authenticate, usuariosController.obtenerDirecciones);


router.post('/guardar-direccion', authenticate, usuariosController.guardarDireccion);

router.get('/mis-pedidos', authenticate, usuariosController.obtenerPedidosUsuario);


router.delete('/eliminar-cuenta', authenticate, usuariosController.eliminarCuentaUsuario);


console.log("Ruta registrada Delete");

router.get('/:id', authenticate, usuariosController.getUserById);

module.exports = router;