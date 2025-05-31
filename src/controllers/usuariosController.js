const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const usuario = await prisma.Usuarios.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nombreCompleto: true,
        email: true,
        telefono: true,
        cedula: true,
        direccion: true,
        rol: true,
        vehiculo: true,
        imageUrl: true,
        historialDirecciones: true,
        restaurantesIds: true
      }
    });
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    let restaurantes = [];
    if (usuario.rol === 'Admin' && usuario.restaurantesIds && usuario.restaurantesIds.length > 0) {
      restaurantes = await prisma.restaurantes.findMany({
        where: {
          id: { in: usuario.restaurantesIds }
        }
      });
    }
    const respuesta = {
      ...usuario,
      restaurantes: usuario.rol === 'Admin' ? restaurantes : undefined
    };
    
    res.status(200).json(respuesta);
  } catch (error) {
    console.error('Error al obtener perfil de usuario:', error);
    res.status(500).json({ message: 'Error al obtener perfil de usuario', error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const usuario = await prisma.Usuarios.findUnique({
      where: { id },
      select: {
        id: true,
        nombreCompleto: true,
        telefono: true,
        vehiculo: true,
        rol: true,
        imageUrl: true
      }
    });
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.status(200).json(usuario);
  } catch (error) {
    console.error('Error al obtener información del usuario:', error);
    res.status(500).json({ message: 'Error al obtener información del usuario', error: error.message });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { nombreCompleto, telefono, direccion, comuna } = req.body;
    
    // Validar datos
    if (!nombreCompleto || !telefono || !direccion || !comuna) {
      return res.status(400).json({ message: 'Faltan campos requeridos' });
    }
    
    // Convertir a los tipos correctos
    const telefonoNum = parseInt(telefono);
    const comunaNum = parseInt(comuna);
    
    if (isNaN(telefonoNum) || isNaN(comunaNum)) {
      return res.status(400).json({ message: 'Teléfono y comuna deben ser valores numéricos' });
    }

    const usuarioActual = await prisma.Usuarios.findUnique({
      where: { id: userId }
    });
    
    if (!usuarioActual) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    const usuarioActualizado = await prisma.Usuarios.update({
      where: { id: userId },
      data: {
        nombreCompleto,
        telefono: telefonoNum,
        direccion,
        cedula: usuarioActual.cedula, 
        historialDirecciones: {
          push: {
            comuna: comunaNum,
            barrio: direccion,
            direccionEspecifica: direccion
          }
        }
      }
    });
    
    res.status(200).json({
      message: 'Perfil actualizado correctamente',
      usuario: {
        id: usuarioActualizado.id,
        nombreCompleto: usuarioActualizado.nombreCompleto,
        email: usuarioActualizado.email,
        telefono: usuarioActualizado.telefono,
        direccion: usuarioActualizado.direccion,
        cedula: usuarioActualizado.cedula,
        rol: usuarioActualizado.rol,
        vehiculo: usuarioActualizado.vehiculo,
        imageUrl: usuarioActualizado.imageUrl,
        historialDirecciones: usuarioActualizado.historialDirecciones
      }
    });
  } catch (error) {
    console.error('Error al actualizar perfil de usuario:', error);
    res.status(500).json({ message: 'Error al actualizar perfil de usuario', error: error.message });
  }
};

exports.updateProfileImage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ message: 'La URL de la imagen es requerida' });
    }
    
    // Actualizar URL de imagen en la base de datos
    const usuarioActualizado = await prisma.Usuarios.update({
      where: { id: userId },
      data: { imageUrl }
    });
    
    res.status(200).json({
      message: 'Imagen de perfil actualizada correctamente',
      imageUrl: usuarioActualizado.imageUrl
    });
  } catch (error) {
    console.error('Error al actualizar imagen de perfil:', error);
    res.status(500).json({ message: 'Error al actualizar imagen de perfil', error: error.message });
  }
};

exports.obtenerDirecciones = async (req, res) => {
  try {
    console.log('Procesando solicitud para obtener direcciones...');
    
    if (!req.user || !req.user.id) {
      console.error('Error: req.user o req.user.id es undefined');
      return res.status(401).json({ message: "Usuario no autenticado o token inválido" });
    }

    console.log(`Buscando usuario con ID: ${req.user.id}`);

    const usuario = await prisma.Usuarios.findUnique({
      where: { 
        id: req.user.id 
      },
      select: {
        historialDirecciones: true
      }
    });
    
    if (!usuario) {
      console.log(`Usuario con ID ${req.user.id} no encontrado`);
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
  
    const direcciones = Array.isArray(usuario.historialDirecciones) ? usuario.historialDirecciones : [];
    console.log(`Se encontraron ${direcciones.length} direcciones para el usuario`);
    
    res.status(200).json(direcciones);
  } catch (error) {
    console.error("Error al obtener direcciones:", error);
    res.status(500).json({
      message: "Error al obtener direcciones",
      error: error.toString()
    });
  }
}

exports.guardarDireccion = async (req, res) => {
  try {
    console.log('Procesando solicitud para guardar dirección...');
    console.log('Datos recibidos:', req.body);

    if (!req.user || !req.user.id) {
      console.error('Error: req.user o req.user.id es undefined');
      return res.status(401).json({ message: "Usuario no autenticado o token inválido" });
    }
    
    const { direccion } = req.body;
  
    if (!direccion || !direccion.barrio || !direccion.comuna || !direccion.direccionEspecifica) {
      console.error('Error: Datos de dirección incompletos');
      return res.status(400).json({ message: "Datos de dirección incompletos" });
    }

    let comunaNum;
    try {
      comunaNum = typeof direccion.comuna === 'string' 
        ? parseInt(direccion.comuna, 10) 
        : direccion.comuna;
      
      if (isNaN(comunaNum)) {
        throw new Error('La comuna no es un número válido');
      }
    } catch (error) {
      console.error('Error al convertir comuna a número:', error);
      return res.status(400).json({ message: "La comuna debe ser un número válido" });
    }
    
    console.log(`Buscando usuario con ID: ${req.user.id}`);

    const usuarioExistente = await prisma.Usuarios.findUnique({
      where: { 
        id: req.user.id 
      }
    });
    
    if (!usuarioExistente) {
      console.log(`Usuario con ID ${req.user.id} no encontrado`);
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    
    console.log('Usuario encontrado, procediendo a actualizar historialDirecciones');

    const nuevaDireccion = {
      barrio: direccion.barrio,
      comuna: comunaNum,
      direccionEspecifica: direccion.direccionEspecifica
    };
    
    console.log('Nueva dirección a guardar:', nuevaDireccion);
    
    const usuarioActualizado = await prisma.Usuarios.update({
      where: { 
        id: req.user.id 
      },
      data: {
        historialDirecciones: {
          push: nuevaDireccion
        }
      },
      select: {
        historialDirecciones: true
      }
    });
    
    console.log('Dirección guardada exitosamente');
    console.log('Histórico actualizado:', usuarioActualizado.historialDirecciones);
    
    res.status(200).json({ 
      message: "Dirección guardada correctamente",
      direcciones: usuarioActualizado.historialDirecciones || []
    });
  } catch (error) {
    console.error("Error al guardar dirección:", error);
    res.status(500).json({
      message: "Error al guardar dirección",
      error: error.toString()
    });
  }
}

exports.obtenerPedidosUsuario = async (req, res) => {
  try {
    const userId = req.user.id;

    const pedidos = await prisma.pedidos.findMany({
      where: { usuario_id: userId },
      orderBy: { fechaDeCreacion: 'desc' }
    });
    
    res.status(200).json(pedidos);
  } catch (error) {
    console.error('Error al obtener pedidos del usuario:', error);
    res.status(500).json({ 
      message: 'Error al obtener pedidos', 
      error: error.message 
    });
  }
};

exports.cambiarContrasena = async (req, res) => {
  console.log("Función cambiarContrasena ejecutándose con:", req.body);
  
  try {
    const userId = req.user.id;
    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({ message: 'La nueva contraseña es requerida' });
    }

    const usuario = await prisma.Usuarios.findUnique({
      where: { id: userId }
    });
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Encriptar nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Actualizar la contraseña
    await prisma.Usuarios.update({
      where: { id: userId },
      data: { contrase_a: hashedPassword }
    });
    
    console.log("Contraseña actualizada correctamente para usuario:", userId);
    res.status(200).json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ message: 'Error al cambiar contraseña', error: error.message });
  }
};

exports.eliminarCuentaUsuario = async (req, res) => {
  try {
    const userId = req.user.id;

    // Verificar si el usuario existe
    const usuario = await prisma.Usuarios.findUnique({
      where: { id: userId }
    });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    await prisma.Usuarios.delete({
      where: { id: userId }
    });

    res.status(200).json({ message: 'Cuenta eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar cuenta de usuario:', error);
    res.status(500).json({ message: 'Error al eliminar cuenta', error: error.message });
  }
};
