const express = require('express');
const router = express.Router();
const direccionesController = require('../controllers/direccionesController');
const { authenticate } = require('../middlewares/authMiddleware');

router.get('/api/direcciones', authenticate, direccionesController.listarDirecciones);
router.post('/api/direcciones', authenticate, direccionesController.guardarDireccion);
module.exports = router;