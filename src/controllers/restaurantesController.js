const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener restaurantes del admin logueado
exports.obtenerMisRestaurantes = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log("Buscando restaurantes del admin con ID:", userId);
        
        // Buscar donde el usuario es propietario (owner)
        const restaurantes = await prisma.restaurantes.findMany({
            where: {
                ownerId: userId
            },
            include: {
                // Incluir las sucursales relacionadas
                sucursales: true
            },
            orderBy: { nombre: 'asc' },
        });
        
        console.log(`Se encontraron ${restaurantes.length} restaurantes para el admin ${userId}`);

        restaurantes.forEach((r, i) => {
            console.log(`Restaurante ${i+1}: ${r.nombre} (ID: ${r.id})`);
            console.log(`  - Sucursales: ${r.sucursales.length}`);
        });
        
        res.json(restaurantes);
    } catch (error) {
        console.error('Error al obtener restaurantes:', error);
        res.status(500).json({
            message: 'Error al obtener los restaurantes',
            error: error.message
        });
    }
};

exports.listarRestaurantes = async (req, res) => {
    try {
        console.log("Obteniendo listado de todos los restaurantes");
        
        const restaurantes = await prisma.restaurantes.findMany({
            include: {
                sucursales: true
            },
            orderBy: { nombre: 'asc' }
        });
        
        console.log(`Se encontraron ${restaurantes.length} restaurantes en total`);
        
        return res.status(200).json(restaurantes);
    } catch (error) {
        console.error("Error al listar restaurantes:", error);
        return res.status(500).json({ 
            message: "Error al obtener restaurantes", 
            error: error.message 
        });
    }
};

exports.obtenerRestaurante = async (req, res) => {
    try {
        const { id } = req.params;
        
        const restaurante = await prisma.restaurantes.findUnique({
            where: { id },
            include: {
                sucursales: true
            }
        });
        
        if (!restaurante) {
            return res.status(404).json({ message: "Restaurante no encontrado" });
        }
        
        res.status(200).json(restaurante);
    } catch (error) {
        console.error("Error al obtener restaurante:", error);
        res.status(500).json({
            message: "Error al obtener el restaurante",
            error: error.message
        });
    }
};

exports.listarProductosPorRestaurante = async (req, res) => {
  try {
    const { restauranteId } = req.params;
    
    console.log("Buscando productos del restaurante:", restauranteId);

    const productos = await prisma.Productos.findMany({
      where: { 
        restaurante_Id: restauranteId
      }
    });
    
    console.log(`Encontrados ${productos.length} productos`);

    const productosLimpios = productos.map(prod => ({
      id: prod.id,
      nombre: prod.nombre || 'Producto sin nombre',
      especificaciones: prod.especificaciones || 'Sin descripción',
      precio: prod.precio || 0,
      categoria: prod.categoria || 'Sin categoría',
      imageUrl: prod.imageUrl || null,
      restaurante_Id: prod.restaurante_Id,
      sucursales_Ids: prod.sucursales_Ids || []
    }));
    
    console.log("Productos procesados:", productosLimpios);
    res.status(200).json(productosLimpios);
    
  } catch (error) {
    console.error("Error al listar productos del restaurante:", error);
    res.status(200).json([]);
  }
};

// Crear restaurante
exports.crearRestaurante = async (req, res) => {
    try {
        if (req.user.rol !== "Admin") {
            return res.status(403).json({ message: "Acceso denegado. Sólo Admin puede crear restaurantes" });
        }

        const { nombre, descripcion, sucursales, imageUrl, categorias } = req.body;
        if (!nombre || !descripcion) {
            return res.status(400).json({ message: "Faltan datos obligatorios: nombre, descripcion" });
        }

        const nuevoRestaurante = await prisma.restaurantes.create({
            data: {
                nombre,
                descripcion,
                ownerId: req.user.id,
                imageUrl,
                categorias: Array.isArray(categorias) ? categorias : categorias ? [categorias] : ['General']
            }
        });
        
        console.log(`Restaurante creado: ${nuevoRestaurante.id} por usuario ${req.user.id}`);
        
        const sucursalesCreadas = [];
        if (Array.isArray(sucursales) && sucursales.length > 0) {
            for (const sucursal of sucursales) {
                if (!sucursal.nombre || !sucursal.direccion || !sucursal.comuna) {
                    console.warn("Sucursal con datos incompletos:", sucursal);
                    continue;
                }
                
                try {
                    const nuevaSucursal = await prisma.sucursales.create({
                        data: {
                            nombre: sucursal.nombre,
                            direccion: sucursal.direccion,
                            comuna: sucursal.comuna,
                            restaurante_Id: nuevoRestaurante.id
                        }
                    });
                    
                    console.log(`Sucursal creada: ${nuevaSucursal.id} para restaurante ${nuevoRestaurante.id}`);
                    sucursalesCreadas.push(nuevaSucursal);
                } catch (sucursalError) {
                    console.error("Error al crear sucursal:", sucursalError);
                }
            }
        }
    
        try {
            await prisma.usuarios.update({
                where: { id: req.user.id },
                data: {
                    restaurantesIds: {
                        push: nuevoRestaurante.id
                    }
                }
            });
            console.log(`Usuario ${req.user.id} actualizado con nuevo restaurante ${nuevoRestaurante.id}`);
        } catch (userError) {
            console.warn("No se pudo actualizar el usuario:", userError);
        }
        
        const restauranteCompleto = {
            ...nuevoRestaurante,
            sucursales: sucursalesCreadas
        };
        
        return res.status(201).json({
            message: "Restaurante creado exitosamente",
            restaurante: restauranteCompleto
        });
    } catch (error) {
        console.error("Error al crear restaurante:", error);
        return res.status(500).json({
            message: "Error al crear el restaurante",
            error: error.message
        });
    }
};

// Actualizar imagen de restaurante
exports.actualizarImagen = async (req, res) => {
    try {
        const { restauranteId } = req.params;
        const { imageUrl } = req.body;
        
        // Verificar que el restaurante existe
        const restaurante = await prisma.restaurantes.findUnique({
            where: { id: restauranteId }
        });
        
        if (!restaurante) {
            return res.status(404).json({ message: "Restaurante no encontrado" });
        }
        
        // Verificar que el usuario es dueño del restaurante
        if (restaurante.ownerId !== req.user.id) {
            return res.status(403).json({ message: "No tienes permiso para modificar este restaurante" });
        }
        
        // Actualizar imagen
        const restauranteActualizado = await prisma.restaurantes.update({
            where: { id: restauranteId },
            data: { imageUrl }
        });
        
        res.status(200).json({
            message: "Imagen actualizada correctamente",
            restaurante: restauranteActualizado
        });
    } catch (error) {
        console.error("Error al actualizar imagen:", error);
        res.status(500).json({
            message: "Error al actualizar la imagen",
            error: error.message
        });
    }
};

// Editar información de un restaurante
exports.editarRestaurante = async (req, res) => {
    try {
        const { restauranteId } = req.params;
        const { nombre, descripcion, imageUrl, categorias } = req.body;
        
        // Validar rol Admin
        if (req.user.rol !== "Admin") {
            return res.status(403).json({
                message: "Acceso denegado. Solo administradores pueden editar restaurantes."
            });
        }
        
        // Verificar que el restaurante existe
        const restaurante = await prisma.restaurantes.findUnique({
            where: { id: restauranteId }
        });
        
        if (!restaurante) {
            return res.status(404).json({ message: "Restaurante no encontrado" });
        }
    
        if (restaurante.ownerId !== req.user.id) {
            return res.status(403).json({ message: "Solo puedes editar restaurantes de tu propiedad" });
        }
        
        // Actualizar restaurante
        const datosActualizados = {};
        if (nombre) datosActualizados.nombre = nombre;
        if (descripcion) datosActualizados.descripcion = descripcion;
        if (imageUrl) datosActualizados.imageUrl = imageUrl;
        if (categorias) datosActualizados.categorias = Array.isArray(categorias) ? categorias : [categorias];
        
        const restauranteActualizado = await prisma.restaurantes.update({
            where: { id: restauranteId },
            data: datosActualizados,
            include: {
                sucursales: true
            }
        });
        
        res.status(200).json({
            message: "Restaurante actualizado exitosamente",
            restaurante: restauranteActualizado
        });
    } catch (error) {
        console.error("Error al editar restaurante:", error);
        res.status(500).json({
            message: "Error al editar el restaurante",
            error: error.message
        });
    }
};

exports.eliminarRestaurante = async (req, res) => {
    try {
        const { restauranteId } = req.params;

        if (req.user.rol !== "Admin") {
            return res.status(403).json({
                message: "Acceso denegado. Solo los administradores pueden eliminar restaurantes."
            });
        }

        const restaurante = await prisma.restaurantes.findUnique({
            where: { id: restauranteId },
            include: {
                sucursales: true
            }
        });
        
        if (!restaurante) {
            return res.status(404).json({ message: "Restaurante no encontrado" });
        }

        if (restaurante.ownerId !== req.user.id) {
            return res.status(403).json({ message: "Solo puedes eliminar restaurantes de tu propiedad" });
        }
        
        if (restaurante.sucursales && restaurante.sucursales.length > 0) {
            await prisma.sucursales.deleteMany({
                where: { restaurante_Id: restauranteId }
            });
            console.log(`Eliminadas ${restaurante.sucursales.length} sucursales del restaurante ${restauranteId}`);
        }

        await prisma.productos.deleteMany({
            where: { restaurante_Id: restauranteId }
        });

        await prisma.restaurantes.delete({
            where: { id: restauranteId }
        });

        try {
            const usuario = await prisma.usuarios.findUnique({
                where: { id: req.user.id },
                select: { restaurantesIds: true }
            });
            
            if (usuario && usuario.restaurantesIds) {
                await prisma.usuarios.update({
                    where: { id: req.user.id },
                    data: {
                        restaurantesIds: {
                            set: usuario.restaurantesIds.filter(id => id !== restauranteId)
                        }
                    }
                });
            }
        } catch (userError) {
            console.warn("Error al actualizar usuario:", userError);
        }
        
        res.status(200).json({
            message: "Restaurante y todos sus datos asociados eliminados correctamente"
        });
    } catch (error) {
        console.error("Error al eliminar restaurante:", error);
        res.status(500).json({
            message: "Error al eliminar el restaurante",
            error: error.message
        });
    }
};

// Crear una nueva sucursal
exports.crearSucursal = async (req, res) => {
    try {
        // Validar rol Admin
        if (req.user.rol !== "Admin") {
            return res.status(403).json({ message: "Acceso denegado. Sólo Admin puede crear sucursales" });
        }

        const { nombre, direccion, comuna, restaurante_Id } = req.body;
        
        if (!nombre || !direccion || !comuna || !restaurante_Id) {
            return res.status(400).json({ message: "Faltan datos obligatorios para la sucursal" });
        }
        
        const restaurante = await prisma.restaurantes.findUnique({
            where: { id: restaurante_Id }
        });
        
        if (!restaurante) {
            return res.status(404).json({ message: "Restaurante no encontrado" });
        }

        if (restaurante.ownerId !== req.user.id) {
            return res.status(403).json({ message: "No tienes permiso para añadir sucursales a este restaurante" });
        }

        const nuevaSucursal = await prisma.sucursales.create({
            data: {
                nombre,
                direccion,
                comuna,
                restaurante_Id
            }
        });
        
        console.log(`Sucursal creada: ${nuevaSucursal.id} para restaurante ${restaurante_Id}`);
        
        res.status(201).json({
            message: "Sucursal creada exitosamente",
            sucursal: nuevaSucursal
        });
    } catch (error) {
        console.error("Error al crear sucursal:", error);
        res.status(500).json({
            message: "Error al crear la sucursal",
            error: error.message
        });
    }
};

// Obtener sucursales de un restaurante
exports.listarSucursalesPorRestaurante = async (req, res) => {
    try {
        const { restauranteId } = req.params;
        
        // Verificar que el restaurante existe
        const restaurante = await prisma.restaurantes.findUnique({
            where: { id: restauranteId },
            include: {
                sucursales: true
            }
        });
        
        if (!restaurante) {
            return res.status(404).json({ message: "Restaurante no encontrado" });
        }
        
        res.status(200).json(restaurante.sucursales);
    } catch (error) {
        console.error("Error al listar sucursales:", error);
        res.status(500).json({
            message: "Error al listar las sucursales",
            error: error.message
        });
    }
};


exports.eliminarSucursal = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Buscar la sucursal
        const sucursal = await prisma.sucursales.findUnique({
            where: { id },
            include: {
                restaurante: true
            }
        });
        
        if (!sucursal) {
            return res.status(404).json({ message: "Sucursal no encontrada" });
        }

        if (sucursal.restaurante.ownerId !== req.user.id) {
            return res.status(403).json({ message: "No tienes permiso para eliminar esta sucursal" });
        }
        
        await prisma.sucursales.delete({
            where: { id }
        });
        
        res.status(200).json({
            message: "Sucursal eliminada correctamente"
        });
    } catch (error) {
        console.error("Error al eliminar sucursal:", error);
        res.status(500).json({
            message: "Error al eliminar la sucursal",
            error: error.message
        });
    }
};

exports.actualizarSucursal = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, direccion, comuna } = req.body;

        const sucursal = await prisma.sucursales.findUnique({
            where: { id },
            include: {
                restaurante: true
            }
        });
        
        if (!sucursal) {
            return res.status(404).json({ message: "Sucursal no encontrada" });
        }

        if (sucursal.restaurante.ownerId !== req.user.id) {
            return res.status(403).json({ message: "No tienes permiso para modificar esta sucursal" });
        }

        const datosActualizados = {};
        if (nombre) datosActualizados.nombre = nombre;
        if (direccion) datosActualizados.direccion = direccion;
        if (comuna) datosActualizados.comuna = comuna;

        const sucursalActualizada = await prisma.sucursales.update({
            where: { id },
            data: datosActualizados
        });
        
        res.status(200).json({
            message: "Sucursal actualizada correctamente",
            sucursal: sucursalActualizada
        });
    } catch (error) {
        console.error("Error al actualizar sucursal:", error);
        res.status(500).json({
            message: "Error al actualizar la sucursal",
            error: error.message
        });
    }
};