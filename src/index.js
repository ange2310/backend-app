//
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const pedidoRoutes = require("./routes/pedidosRoutes"); 
const mensajesRoutes = require("./routes/mensajesRoutes"); 
const ubicacionRoutes = require("./routes/ubicacionRoutes"); 
const calificacionesRoutes = require("./routes/calificacionesRoutes"); 
const restaurantesRoutes = require("./routes/restaurantesRoutes");
const usuariosRoutes = require('./routes/usuariosRoutes');
const pagosRoutes = require('./routes/pagosRoutes');
const productosRoutes = require('./routes/productosRoutes');
const sucursalesRoutes = require('./routes/sucursalesRoutes');

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: 'http://localhost:5173', // URL de tu frontend React/Vite
  credentials: true // Permite enviar cookies si es necesario
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Agregar para procesar datos de formularios

// Ruta de prueba principal
app.get('/', (req, res) => {
  res.json({ message: 'API de AppPedidos funcionando correctamente' });
});

// ============== RUTAS DIRECTAS DE PRUEBA ==============
// Ruta de prueba para direcciones sin necesidad de autenticación
app.get('/api/direcciones-test', (req, res) => {
  console.log('¡RUTA DE PRUEBA ACCEDIDA CORRECTAMENTE!');
  res.json({ message: 'La ruta de prueba está funcionando correctamente' });
});

// Rutas para direcciones implementadas directamente
app.get('/api/direcciones', (req, res) => {
  console.log('Ruta de listar direcciones accedida');
  // Para esta prueba, simplemente devolver un array vacío
  res.json([]);
});

app.post('/api/direcciones', (req, res) => {
  console.log('Ruta de guardar dirección accedida');
  console.log('Datos recibidos:', req.body);
  // Para esta prueba, simplemente confirmar éxito
  res.json({ 
    message: "Dirección guardada correctamente (prueba)",
    direcciones: []
  });
});
// ============== FIN RUTAS DIRECTAS ==============

// Rutas normales
app.use('/api/auth', authRoutes);
app.use('/api/calificaciones', calificacionesRoutes);
app.use('/api/mensajes', mensajesRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/ubicacion', ubicacionRoutes);
app.use('/api/restaurantes', restaurantesRoutes);
app.use('/api/sucursales', sucursalesRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/pagos', pagosRoutes);


app.use('/api/usuarios', usuariosRoutes);

// Middleware para rutas no encontradas (404)
app.use((req, res) => {
  console.log(`Ruta no encontrada: ${req.method} ${req.url}`);
  res.status(404).json({ message: 'Ruta no encontrada' });
});

// Middleware para manejo de errores
app.use((err, req, res, next) => {
  console.error('Error general:', err);
  
  // Proporcionar más detalles de error durante el desarrollo
  const errorResponse = {
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' 
      ? {
          message: err.message,
          stack: err.stack,
          details: err.toString ? err.toString() : undefined
        } 
      : undefined
  };
  
  res.status(500).json(errorResponse);
});

// Logs informativos
console.log('======================================================');
console.log('RUTAS REGISTRADAS:');
console.log('/api/direcciones-test - Ruta de prueba para direcciones');
console.log('/api/direcciones - Rutas directas para direcciones');
console.log('/api/usuarios - Rutas para usuarios');
console.log('======================================================');

// Iniciar servidor (SOLO UNA VEZ)
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log('Prueba acceder a: http://localhost:5000/api/direcciones-test');
});