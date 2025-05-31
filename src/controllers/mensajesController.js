const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.enviarMensaje = async (req, res) => {
  try {
    const { pedidoId } = req.params;
    const { texto, usuarioReceptorId } = req.body;
    const usuarioEmisorId = req.user.id;

    // Verificar que el pedido existe
    const pedido = await prisma.pedidos.findUnique({
      where: { id: pedidoId }
    });

    if (!pedido) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    // Verificar que los usuarios involucrados son parte del pedido
    if (
      (pedido.usuario_id !== usuarioEmisorId && pedido.repartidor_Id !== usuarioEmisorId) ||
      (pedido.usuario_id !== usuarioReceptorId && pedido.repartidor_Id !== usuarioReceptorId)
    ) {
      return res.status(403).json({ message: 'No tienes permiso para enviar mensajes en este pedido' });
    }

    // Crear mensaje
    const mensaje = await prisma.mensajes.create({
      data: {
        pedido_Id: pedidoId,
        usuarioEmisor: usuarioEmisorId,
        usuarioReceptor: usuarioReceptorId,
        texto,
        fechaEnvio: new Date(),
        leido: false
      }
    });

    // Actualizar el pedido con referencia al mensaje
    await prisma.pedidos.update({
      where: { id: pedidoId },
      data: {
        mensajes: {
          push: mensaje.id
        }
      }
    });

    res.status(201).json(mensaje);
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    res.status(500).json({ message: 'Error al enviar mensaje', error: error.message });
  }
};

exports.obtenerMensajes = async (req, res) => {
  try {
    const { pedidoId } = req.params;
    const usuarioId = req.user.id;

    // Verificar que el pedido existe
    const pedido = await prisma.pedidos.findUnique({
      where: { id: pedidoId }
    });

    if (!pedido) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    // Verificar que el usuario es parte del pedido
    if (pedido.usuario_id !== usuarioId && pedido.repartidor_Id !== usuarioId) {
      return res.status(403).json({ message: 'No tienes permiso para ver los mensajes de este pedido' });
    }

    // Obtener mensajes
    const mensajes = await prisma.mensajes.findMany({
      where: {
        pedido_Id: pedidoId
      },
      orderBy: {
        fechaEnvio: 'asc'
      }
    });

    // Marcar como leídos los mensajes dirigidos al usuario actual
    await prisma.mensajes.updateMany({
      where: {
        pedido_Id: pedidoId,
        usuarioReceptor: usuarioId,
        leido: false
      },
      data: {
        leido: true
      }
    });

    res.status(200).json(mensajes);
  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    res.status(500).json({ message: 'Error al obtener mensajes', error: error.message });
  }
};
exports.marcarMensajeLeido = async (req, res) => {
    try {
      const { mensajeId } = req.params;
      const usuarioId = req.user.id;
  
      // Verificar que el mensaje existe
      const mensaje = await prisma.mensajes.findUnique({
        where: { id: mensajeId }
      });
  
      if (!mensaje) {
        return res.status(404).json({ message: 'Mensaje no encontrado' });
      }
  
      if (mensaje.usuarioReceptor !== usuarioId) {
        return res.status(403).json({ message: 'No tienes permiso para marcar este mensaje como leído' });
      }
      
      const mensajeActualizado = await prisma.mensajes.update({
        where: { id: mensajeId },
        data: { leido: true }
      });
  
      res.status(200).json(mensajeActualizado);
    } catch (error) {
      console.error('Error al marcar mensaje como leído:', error);
      res.status(500).json({ message: 'Error al marcar mensaje como leído', error: error.message });
    }
  };