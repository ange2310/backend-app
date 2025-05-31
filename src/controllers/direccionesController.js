const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.listarDirecciones = async (req, res) => {
  try {
    console.log('Intento de obtener direcciones para el usuario ID:', req.user?.id);
    
    // Para depuración, siempre devolver un array vacío primero
    return res.status(200).json([]);
  } catch (error) {
    console.error("Error al obtener direcciones:", error);
    res.status(500).json({
      message: "Error al obtener direcciones",
      error: error.toString()
    });
  }
};

exports.guardarDireccion = async (req, res) => {
  res.status(200).json({ 
    message: "Dirección guardada correctamente (depuración)",
    direcciones: []
  });
};