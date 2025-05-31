const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.crearSucursal = async (req, res) => {
  try {
    const { nombre, direccion, comuna, restaurante_Id } = req.body;

    if (!nombre || !direccion || !comuna || !restaurante_Id) {
      return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }
    if (!/^[0-9a-fA-F]{24}$/.test(restaurante_Id)) {
      return res.status(400).json({ message: 'restaurante_Id no es un ObjectId válido' });
    }

    const sucursal = await prisma.sucursales.create({
      data: { nombre, direccion, comuna, restaurante_Id }
    });

    res.status(201).json({ message: 'Sucursal creada', sucursal });
  } catch (err) {
    console.error('Error creando sucursal:', err);
    res.status(500).json({ message: 'Error interno al crear sucursal', error: err.message });
  }
};
