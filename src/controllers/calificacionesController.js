const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.calificarPedido = async (req, res) => {
  try {
    console.log('Iniciando calificación de pedido con parámetros:', req.params);
    console.log('Body recibido:', req.body);

    const { pedidoId } = req.params;
    const { calificacionRepartidor, calificacionPedido, comentarios } = req.body;
    const usuario_id = req.user.id;
    
    if (calificacionPedido === undefined || calificacionRepartidor === undefined) {
      return res.status(400).json({ message: 'Faltan datos de calificación' });
    }
    
    if (typeof calificacionPedido !== 'number' || typeof calificacionRepartidor !== 'number') {
      return res.status(400).json({ message: 'Las calificaciones deben ser numéricas' });
    }
    
    if (calificacionPedido < 1 || calificacionPedido > 5 || calificacionRepartidor < 1 || calificacionRepartidor > 5) {
      return res.status(400).json({ message: 'Las calificaciones deben estar entre 1 y 5' });
    }
    
    const pedido = await prisma.pedidos.findUnique({
      where: { id: pedidoId }
    });
    
    if (!pedido) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }
    
    if (pedido.usuario_id !== usuario_id) {
      return res.status(403).json({ message: 'No tienes permiso para calificar este pedido' });
    }
    
    if (pedido.estado !== 'Entregado') {
      return res.status(400).json({ message: 'Solo se pueden calificar pedidos entregados' });
    }

    console.log("Verificando calificación", pedidoId);
    
    const calificacionExistente = await prisma.calificaciones.findFirst({
      where: { pedidoId: pedidoId }
    });
    
    if (calificacionExistente) {
      return res.status(400).json({ message: 'Este pedido ya ha sido calificado' });
    }
    
    console.log('Creando calificación con datos:', {
      pedidoId,
      calificacionRepartidor,
      calificacionPedido,
      comentarios
    });

    const calificacion = await prisma.calificaciones.create({
      data: {
        pedidoId: pedidoId,
        calificacionRepartidor,
        calificacionPedido,
        comentarios: comentarios || ''
      }
    });
    
    console.log('Calificación creada:', calificacion);
    
    res.status(201).json({
      message: 'Calificación guardada correctamente',
      calificacion
    });
  } catch (error) {
    console.error('Error al calificar pedido:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ message: 'Error al guardar la calificación', error: error.message });
  }
};

exports.getCalificacionesRepartidor = async (req, res) => {
  try {
    const { repartidorId } = req.params;
    
    // Obtener pedidos del repartidor con calificaciones
    const pedidosRepartidor = await prisma.pedidos.findMany({
      where: {
        repartidor_Id: repartidorId,
        estado: 'Entregado'
      },
      include: {
        calificaciones: true
      }
    });

    // Filtrar pedidos que tienen calificaciones
    const pedidosCalificados = pedidosRepartidor.filter(
      pedido => pedido.calificaciones && pedido.calificaciones.length > 0
    );
    
    let promedio = 0;
    if (pedidosCalificados.length > 0) {
      const suma = pedidosCalificados.reduce((acc, pedido) => 
        acc + pedido.calificaciones[0].calificacionRepartidor, 0
      );
      promedio = suma / pedidosCalificados.length;
    }
    
    res.status(200).json({
      calificaciones: pedidosCalificados.map(pedido => pedido.calificaciones[0]),
      promedio: Math.round(promedio * 100) / 100,
      totalCalificaciones: pedidosCalificados.length
    });
  } catch (error) {
    console.error('Error al obtener calificaciones del repartidor:', error);
    res.status(500).json({ 
      message: 'Error al obtener calificaciones', 
      error: error.message 
    });
  }
};

exports.getCalificacionesUsuario = async (req, res) => {
  try {
    const usuario_id = req.user.id;
    
    // Obtener pedidos del usuario con calificaciones
    const pedidosUsuario = await prisma.pedidos.findMany({
      where: { usuario_id },
      include: {
        calificaciones: true
      },
      orderBy: { fechaDeCreacion: 'desc' }
    });

    // Filtrar solo pedidos que tienen calificaciones
    const calificaciones = pedidosUsuario
      .filter(pedido => pedido.calificaciones && pedido.calificaciones.length > 0)
      .map(pedido => ({
        ...pedido.calificaciones[0],
        pedido: {
          id: pedido.id,
          estado: pedido.estado,
          total: pedido.total,
          fechaDeCreacion: pedido.fechaDeCreacion
        }
      }));
    
    res.status(200).json(calificaciones);
  } catch (error) {
    console.error('Error al obtener calificaciones del usuario:', error);
    res.status(500).json({ 
      message: 'Error al obtener calificaciones', 
      error: error.message 
    });
  }
};

// Función auxiliar para calcular calificación de restaurante dinámicamente
const calcularCalificacionRestaurante = async (restauranteId) => {
  try {
    // 1. Obtener todos los productos del restaurante
    const productos = await prisma.productos.findMany({
      where: { restaurante_Id: restauranteId },
      select: { id: true }
    });

    const productosIds = productos.map(p => p.id);

    // 2. Obtener todos los pedidos entregados que contengan estos productos
    const pedidosEntregados = await prisma.pedidos.findMany({
      where: {
        estado: 'Entregado',
        productos: {
          some: {
            productoId: { in: productosIds }
          }
        }
      },
      include: {
        calificaciones: true
      }
    });

    const pedidosConCalificaciones = pedidosEntregados.filter(
      pedido => pedido.calificaciones && pedido.calificaciones.length > 0
    );

    if (pedidosConCalificaciones.length === 0) {
      return {
        promedio: 0,
        totalCalificaciones: 0,
        calificaciones: []
      };
    }

    const sumaCalificaciones = pedidosConCalificaciones.reduce((suma, pedido) => 
      suma + pedido.calificaciones[0].calificacionPedido, 0
    );

    const promedio = sumaCalificaciones / pedidosConCalificaciones.length;

    return {
      promedio: Math.round(promedio * 100) / 100,
      totalCalificaciones: pedidosConCalificaciones.length,
      calificaciones: pedidosConCalificaciones.map(pedido => ({
        pedidoId: pedido.id,
        calificacion: pedido.calificaciones[0].calificacionPedido,
        comentarios: pedido.calificaciones[0].comentarios,
        fecha: pedido.fechaDeCreacion
      }))
    };
  } catch (error) {
    console.error('Error al calcular calificación del restaurante:', error);
    return {
      promedio: 0,
      totalCalificaciones: 0,
      calificaciones: []
    };
  }
};

// Método para obtener calificaciones de un restaurante
exports.getCalificacionesRestaurante = async (req, res) => {
  try {
    const { restauranteId } = req.params;
    const { limite = 10, pagina = 1 } = req.query;

    // Verificar que el restaurante existe
    const restaurante = await prisma.restaurantes.findUnique({
      where: { id: restauranteId },
      select: {
        id: true,
        nombre: true
      }
    });

    if (!restaurante) {
      return res.status(404).json({ message: 'Restaurante no encontrado' });
    }

    const estadisticasCompletas = await calcularCalificacionRestaurante(restauranteId);

    const inicio = (pagina - 1) * limite;
    const fin = inicio + parseInt(limite);
    const calificacionesPaginadas = estadisticasCompletas.calificaciones.slice(inicio, fin);

    res.status(200).json({
      restaurante: {
        id: restaurante.id,
        nombre: restaurante.nombre,
        calificacionPromedio: estadisticasCompletas.promedio,
        totalCalificaciones: estadisticasCompletas.totalCalificaciones
      },
      calificaciones: calificacionesPaginadas,
      paginacion: {
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        total: estadisticasCompletas.calificaciones.length,
        totalPaginas: Math.ceil(estadisticasCompletas.calificaciones.length / limite)
      }
    });
  } catch (error) {
    console.error('Error al obtener calificaciones del restaurante:', error);
    res.status(500).json({ 
      message: 'Error al obtener calificaciones del restaurante', 
      error: error.message 
    });
  }
};

// Método para obtener estadísticas de restaurante con calificaciones
exports.getEstadisticasRestauranteConCalificaciones = async (req, res) => {
  try {
    const { restauranteId } = req.params;
    const { periodo = 'mes' } = req.query;

    // Verificar que el restaurante existe
    const restaurante = await prisma.restaurantes.findUnique({
      where: { id: restauranteId }
    });

    if (!restaurante) {
      return res.status(404).json({ message: 'Restaurante no encontrado' });
    }
    let fechaDesde = new Date();
    switch (periodo) {
      case 'hoy':
        fechaDesde.setHours(0, 0, 0, 0);
        break;
      case 'semana':
        fechaDesde.setDate(fechaDesde.getDate() - 7);
        break;
      case 'mes':
        fechaDesde.setMonth(fechaDesde.getMonth() - 1);
        break;
      case 'año':
        fechaDesde.setFullYear(fechaDesde.getFullYear() - 1);
        break;
      default:
        fechaDesde.setMonth(fechaDesde.getMonth() - 1);
    }

    // Obtener productos del restaurante
    const productos = await prisma.productos.findMany({
      where: { restaurante_Id: restauranteId },
      select: { id: true, nombre: true, precio: true }
    });

    const productosIds = productos.map(p => p.id);

    // Obtener pedidos del período
    const pedidos = await prisma.pedidos.findMany({
      where: {
        fechaDeCreacion: {
          gte: fechaDesde
        },
        productos: {
          some: {
            productoId: { in: productosIds }
          }
        }
      },
      include: {
        calificaciones: true
      }
    });

    // Calcular estadísticas básicas
    const totalPedidos = pedidos.length;
    const pedidosPendientes = pedidos.filter(p => p.estado === 'Pendiente').length;
    const pedidosEnCamino = pedidos.filter(p => p.estado === 'En_Camino').length;
    const pedidosEntregados = pedidos.filter(p => p.estado === 'Entregado').length;
    const pedidosCancelados = pedidos.filter(p => p.estado === 'Cancelado').length;

    // Calcular ingresos
    const totalIngresos = pedidos
      .filter(p => p.estado === 'Entregado')
      .reduce((sum, p) => sum + p.total, 0);

    // Calcular calificación promedio dinámicamente
    const pedidosConCalificaciones = pedidos.filter(
      p => p.calificaciones && p.calificaciones.length > 0
    );

    let promedioCalificacion = 0;
    let calificacionesRecientes = [];
    
    if (pedidosConCalificaciones.length > 0) {
      const sumaCalificaciones = pedidosConCalificaciones.reduce((suma, pedido) => 
        suma + pedido.calificaciones[0].calificacionPedido, 0
      );
      promedioCalificacion = sumaCalificaciones / pedidosConCalificaciones.length;
      
      // Obtener las 10 calificaciones más recientes
      calificacionesRecientes = pedidosConCalificaciones
        .sort((a, b) => new Date(b.fechaDeCreacion) - new Date(a.fechaDeCreacion))
        .slice(0, 10)
        .map(pedido => ({
          calificacion: pedido.calificaciones[0].calificacionPedido,
          comentarios: pedido.calificaciones[0].comentarios,
          fecha: pedido.fechaDeCreacion
        }));
    }

    // Calcular productos más vendidos
    const productosVendidos = {};
    pedidos.forEach(pedido => {
      pedido.productos.forEach(item => {
        if (!productosVendidos[item.productoId]) {
          productosVendidos[item.productoId] = {
            cantidad: 0,
            ingresos: 0
          };
        }
        productosVendidos[item.productoId].cantidad += item.cantidad;
      });
    });

    // Agregar información de productos y calcular ingresos
    const topProductos = await Promise.all(
      Object.entries(productosVendidos)
        .map(async ([id, stats]) => {
          const producto = productos.find(p => p.id === id);
          return {
            id,
            nombre: producto?.nombre || 'Producto no disponible',
            cantidad: stats.cantidad,
            ingresos: (producto?.precio || 0) * stats.cantidad
          };
        })
    );

    // Ordenar por cantidad vendida
    topProductos.sort((a, b) => b.cantidad - a.cantidad);

    res.status(200).json({
      periodo,
      totalPedidos,
      pedidosPendientes,
      pedidosEnCamino,
      pedidosEntregados,
      pedidosCancelados,
      totalIngresos,
      promedioCalificacion: Math.round(promedioCalificacion * 100) / 100,
      totalCalificaciones: pedidosConCalificaciones.length,
      calificacionesRecientes,
      topProductos: topProductos.slice(0, 5)
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ 
      message: 'Error al obtener estadísticas', 
      error: error.message 
    });
  }
};

// Método para obtener todos los restaurantes con sus calificaciones
exports.getRestaurantesConCalificaciones = async (req, res) => {
  try {
    const { categoria, ordenarPor = 'nombre' } = req.query;

    let where = {};

    if (categoria) {
      where.categorias = {
        has: categoria
      };
    }

    const restaurantes = await prisma.restaurantes.findMany({
      where,
      include: {
        sucursales: true
      }
    });

    const restaurantesConCalificaciones = await Promise.all(
      restaurantes.map(async (restaurante) => {
        const estadisticas = await calcularCalificacionRestaurante(restaurante.id);
        
        return {
          ...restaurante,
          calificacionPromedio: estadisticas.promedio,
          totalCalificaciones: estadisticas.totalCalificaciones
        };
      })
    );

    switch (ordenarPor) {
      case 'calificacion':
        restaurantesConCalificaciones.sort((a, b) => b.calificacionPromedio - a.calificacionPromedio);
        break;
      case 'nombre':
        restaurantesConCalificaciones.sort((a, b) => a.nombre.localeCompare(b.nombre));
        break;
      default:
        restaurantesConCalificaciones.sort((a, b) => a.nombre.localeCompare(b.nombre));
    }

    res.status(200).json(restaurantesConCalificaciones);
  } catch (error) {
    console.error('Error al obtener restaurantes:', error);
    res.status(500).json({ 
      message: 'Error al obtener restaurantes', 
      error: error.message 
    });
  }
};

module.exports = exports;