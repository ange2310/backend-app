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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://sensational-dragon-9cfbd2.netlify.app'
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ message: 'API de AppPedidos funcionando correctamente' });
});

app.get('/api/direcciones-test', (req, res) => {
  res.json({ message: 'La ruta de prueba está funcionando correctamente' });
});

app.get('/api/direcciones', (req, res) => {
  res.json([]);
});

app.post('/api/direcciones', (req, res) => {
  res.json({ 
    message: "Dirección guardada correctamente (prueba)",
    direcciones: []
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/calificaciones', calificacionesRoutes);
app.use('/api/mensajes', mensajesRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/ubicacion', ubicacionRoutes);
app.use('/api/restaurantes', restaurantesRoutes);
app.use('/api/sucursales', sucursalesRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/usuarios', usuariosRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  res.status(500).json({ message: 'Error interno del servidor' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});