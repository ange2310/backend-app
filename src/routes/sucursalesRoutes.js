const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middlewares/authMiddleware');
const ctrl    = require('../controllers/sucursalesController');

router.post('/', authenticate, ctrl.crearSucursal);

module.exports = router;
