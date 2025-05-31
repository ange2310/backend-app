const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.crearIntencion = async (req, res) => {
  try {
    const { pedidoId } = req.params;
    
    // Verificar que el pedido existe
    const pedido = await prisma.pedidos.findUnique({
      where: { id: pedidoId }
    });
    
    if (!pedido) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }
    
    // Verificar que el pedido pertenece al usuario
    if (pedido.usuario_id !== req.user.id) {
      return res.status(403).json({ message: 'No tienes permiso para procesar este pago' });
    }

    await prisma.pedidos.update({
      where: { id: pedidoId },
      data: { estado: 'Pendiente' }
    });

    res.status(200).json({
      message: 'Intención de pago creada',
      success: true
    });
  } catch (error) {
    console.error('Error al crear intención de pago:', error);
    res.status(500).json({ 
      message: 'Error al procesar el pago', 
      error: error.message 
    });
  }
};

exports.confirmarPago = async (req, res) => {
  try {
    const { pedidoId } = req.params;
    
    // Verificar que el pedido existe
    const pedido = await prisma.pedidos.findUnique({
      where: { id: pedidoId }
    });
    
    if (!pedido) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }
    
    // Verificar que el pedido pertenece al usuario
    if (pedido.usuario_id !== req.user.id) {
      return res.status(403).json({ message: 'No tienes permiso para confirmar este pago' });
    }

    // Por ahora, simplemente confirmamos el pedido
    await prisma.pedidos.update({
      where: { id: pedidoId },
      data: { pagado: true }
    });

    res.status(200).json({ 
      message: 'Pago confirmado exitosamente',
      success: true
    });
  } catch (error) {
    console.error('Error al confirmar pago:', error);
    res.status(500).json({ 
      message: 'Error al confirmar el pago', 
      error: error.message 
    });
  }
};
