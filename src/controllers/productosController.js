const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.listarProductos = async (req, res) => {
  try {
    const productos = await prisma.productos.findMany();
    
    res.status(200).json(productos);
  } catch (error) {
    console.error("Error al listar productos:", error);
    res.status(500).json({
      message: "Error interno al listar productos",
      error: error.message
    });
  }
};

exports.obtenerProducto = async (req, res) => {
  try {
    const { id } = req.params;
    
    const producto = await prisma.productos.findUnique({
      where: { id },
      include: {
        restaurante: true
      }
    });
    
    if (!producto) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    
    res.status(200).json(producto);
  } catch (error) {
    console.error("Error al obtener producto:", error);
    res.status(500).json({
      message: "Error interno al obtener el producto",
      error: error.message
    });
  }
};

// Método para listar productos por restaurante
exports.listarProductosPorRestaurante = async (req, res) => {
  try {
    const { restauranteId } = req.params;

    const restaurante = await prisma.restaurantes.findUnique({
      where: { id: restauranteId }
    });
    
    if (!restaurante) {
      return res.status(404).json({ message: "Restaurante no encontrado" });
    }

    const productos = await prisma.productos.findMany({
      where: { restaurante_Id: restauranteId }
    });
    
    res.status(200).json(productos);
  } catch (error) {
    console.error("Error al listar productos del restaurante:", error);
    res.status(500).json({
      message: "Error interno al listar productos",
      error: error.message
    });
  }
};

// Método para crear un producto
exports.crearProducto = async (req, res) => {
  console.log("=== INICIANDO CREACIÓN DE PRODUCTO ===");
  console.log("Body recibido:", JSON.stringify(req.body, null, 2));
  
  try {
    const { nombre, precio, especificaciones, categoria, imageUrl, sucursalesIds, restaurante_Id, todasLasSucursales } = req.body;
B
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ 
        message: 'El nombre es obligatorio según el esquema de BD'
      });
    }

    if (precio === undefined || precio === null || precio === '') {
      return res.status(400).json({ 
        message: 'El precio es obligatorio según el esquema de BD'
      });
    }
    if (!especificaciones || !especificaciones.trim()) {
      return res.status(400).json({ 
        message: 'Las especificaciones son obligatorias según el esquema de BD'
      });
    }
    if (!categoria || !categoria.trim()) {
      return res.status(400).json({ 
        message: 'La categoría es obligatoria según el esquema de BD'
      });
    }
    const categoriasPermitidas = ['Hamburguesa', 'Pizza', 'Sushi', 'Ensaladas', 'Perro', 'Picadas', 'Postres', 'Otras'];
    if (!categoriasPermitidas.includes(categoria)) {
      return res.status(400).json({ 
        message: 'Categoría no válida',
        categoriasPermitidas,
        categoriaRecibida: categoria
      });
    }

    if (!restaurante_Id || !restaurante_Id.trim()) {
      return res.status(400).json({ 
        message: 'El restaurante_Id es obligatorio'
      });
    }

    const precioNumero = parseFloat(precio);
    if (isNaN(precioNumero) || precioNumero <= 0) {
      return res.status(400).json({ 
        message: 'El precio debe ser un número decimal válido mayor a cero',
        received: precio,
        parsed: precioNumero
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }
    
    console.log("=== BUSCANDO RESTAURANTE ===");
    
    const restaurante = await prisma.restaurantes.findUnique({
      where: { id: restaurante_Id },
      include: { sucursales: true }
    });
    
    if (!restaurante) {
      return res.status(404).json({ message: 'Restaurante no encontrado' });
    }
    
    if (restaurante.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'No tienes permiso para añadir productos a este restaurante' });
    }
    
    console.log("=== PROCESANDO SUCURSALES ===");
    
    let sucursales_Ids = [];
    
    if (todasLasSucursales === true) {
      sucursales_Ids = restaurante.sucursales.map(s => s.id);
      console.log("Todas las sucursales:", sucursales_Ids);
    } else if (Array.isArray(sucursalesIds) && sucursalesIds.length > 0) {
      const sucursalesDelRestaurante = restaurante.sucursales.map(s => s.id);
      sucursales_Ids = sucursalesIds.filter(id => sucursalesDelRestaurante.includes(id));
      
      if (sucursales_Ids.length === 0) {
        return res.status(400).json({ 
          message: 'Debes seleccionar al menos una sucursal válida (obligatorio según el esquema de BD)',
          sucursalesDisponibles: sucursalesDelRestaurante,
          sucursalesRecibidas: sucursalesIds
        });
      }
    } else {
      return res.status(400).json({ 
        message: 'Las sucursales son obligatorias según el esquema de BD',
        todasLasSucursales,
        sucursalesIds: sucursalesIds
      });
    }
    
    console.log("Sucursales finales:", sucursales_Ids);

    const datosProducto = {
      nombre: String(nombre).trim(),
      precio: Number(precioNumero), 
      especificaciones: String(especificaciones).trim(), 
      categoria: String(categoria).trim(), 
      imageUrl: imageUrl ? String(imageUrl).trim() : null,
      restaurante_Id: String(restaurante_Id),
      sucursales_Ids: sucursales_Ids
    };
    
    console.log("=== DATOS FINALES PARA PRISMA ===");
    console.log(JSON.stringify(datosProducto, null, 2));
    console.log("Validación de tipos:");
    console.log("- nombre (string):", typeof datosProducto.nombre);
    console.log("- precio (number/double):", typeof datosProducto.precio);
    console.log("- especificaciones (string):", typeof datosProducto.especificaciones);
    console.log("- categoria (string):", typeof datosProducto.categoria);
    console.log("- imageUrl (string|null):", typeof datosProducto.imageUrl);
    console.log("- restaurante_Id (string):", typeof datosProducto.restaurante_Id);
    console.log("- sucursales_Ids (array):", Array.isArray(datosProducto.sucursales_Ids));
    
    console.log("=== CREANDO PRODUCTO CON PRISMA ===");
    
    // Crear el producto
    const nuevoProducto = await prisma.productos.create({
      data: datosProducto
    });
    
    console.log("=== PRODUCTO CREADO EXITOSAMENTE ===");
    console.log(JSON.stringify(nuevoProducto, null, 2));
    
    res.status(201).json({
      message: 'Producto creado exitosamente',
      producto: nuevoProducto
    });
    
  } catch (error) {
    console.error('=== ERROR COMPLETO ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    
    // Errores específicos de Prisma
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        message: 'Ya existe un producto con esos datos',
        error: error.message,
        errorCode: error.code
      });
    }
    
    if (error.code === 'P2025') {
      return res.status(404).json({ 
        message: 'Restaurante no encontrado',
        error: error.message,
        errorCode: error.code
      });
    }
    
    if (error.name === 'PrismaClientValidationError') {
      return res.status(400).json({ 
        message: 'Error de validación: Los datos no coinciden con el esquema de la BD',
        error: error.message,
        errorName: error.name,
        details: 'Verifica que todos los campos obligatorios estén presentes y sean del tipo correcto'
      });
    }
    
    // Error genérico
    res.status(500).json({ 
      message: 'Error al crear el producto', 
      error: error.message,
      errorName: error.name,
      errorCode: error.code || 'UNKNOWN'
    });
  }
};

exports.editarProducto = async (req, res) => {
  try {
    const { productoId } = req.params;
    const { nombre, precio, especificaciones, categoria, imageUrl, sucursalesIds, todasLasSucursales } = req.body;
    
    // Verificar que el producto existe
    const producto = await prisma.productos.findUnique({
      where: { id: productoId },
      include: {
        restaurante: true
      }
    });
    
    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    if (producto.restaurante.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'No tienes permiso para editar este producto' });
    }
    const sucursalesRestaurante = await prisma.sucursales.findMany({
      where: { restaurante_Id: producto.restaurante_Id }
    });
    
    let sucursales_Ids = [...producto.sucursales_Ids];
    
    if (todasLasSucursales) {
      sucursales_Ids = sucursalesRestaurante.map(s => s.id);
    } else if (Array.isArray(sucursalesIds)) {
      const sucursalesDelRestaurante = sucursalesRestaurante.map(s => s.id);
      const sucursalesValidas = sucursalesIds.filter(id => sucursalesDelRestaurante.includes(id));
      
      if (sucursalesValidas.length === 0) {
        return res.status(400).json({ 
          message: 'Debes seleccionar al menos una sucursal válida' 
        });
      }
      
      sucursales_Ids = sucursalesValidas;
    }
    
    // Actualizar el producto
    const productoActualizado = await prisma.productos.update({
      where: { id: productoId },
      data: {
        nombre: nombre || producto.nombre,
        precio: precio ? parseInt(precio) : producto.precio,
        especificaciones: especificaciones || producto.especificaciones,
        categoria: categoria || producto.categoria,
        imageUrl: imageUrl || producto.imageUrl,
        sucursales_Ids
      }
    });
    
    res.status(200).json({
      message: 'Producto actualizado exitosamente',
      producto: productoActualizado
    });
  } catch (error) {
    console.error('Error al editar producto:', error);
    res.status(500).json({ 
      message: 'Error al editar el producto', 
      error: error.message 
    });
  }
};

exports.eliminarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el producto existe
    const producto = await prisma.productos.findUnique({
      where: { id }
    });
    
    if (!producto) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    await prisma.productos.delete({
      where: { id }
    });
    
    res.status(200).json({
      message: "Producto eliminado exitosamente"
    });
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    res.status(500).json({
      message: "Error interno al eliminar el producto",
      error: error.message
    });
  }
};

exports.listarProductosPorSucursal = async (req, res) => {
  try {
    const { sucursalId } = req.params;
    const sucursal = await prisma.sucursales.findUnique({
      where: { id: sucursalId }
    });
    
    if (!sucursal) {
      return res.status(404).json({ message: 'Sucursal no encontrada' });
    }
    const productos = await prisma.productos.findMany({
      where: {
        sucursales_Ids: {
          has: sucursalId
        }
      },
      orderBy: { nombre: 'asc' }
    });
    
    res.status(200).json(productos);
  } catch (error) {
    console.error('Error al listar productos de la sucursal:', error);
    res.status(500).json({
      message: 'Error al listar productos',
      error: error.message
    });
  }
};