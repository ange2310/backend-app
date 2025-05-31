// USUARIO DE PRUEBA PARA VER SI SI ESTABA CONECTADO CON EL BACKEND
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const saltRounds = 10;

async function testDatabaseConnection() {
  try {
    // Probar conexión
    console.log('Intentando conectar a la base de datos...');
    await prisma.$connect();
    console.log('Conexión exitosa a la base de datos');

    // Crear un usuario de prueba
    const hashedPassword = await bcrypt.hash('password123', saltRounds);
    
    const testUser = {
      nombreCompleto: 'Usuario Prueba',
      email: `test${Date.now()}@example.com`, // Email único
      contraseña: hashedPassword,
      telefono: 1234567890,
      cedula: 1234567890,
      direccion: 'Calle de prueba 123',
      rol: 'Cliente',
      historialDirecciones: {
        set: [
          {
            comuna: 1,
            barrio: 'Barrio de prueba',
            direccionEspecifica: 'Calle de prueba 123'
          }
        ]
      }
    };
    
    console.log('Intentando crear usuario de prueba:', JSON.stringify(testUser, null, 2));
    
    const newUser = await prisma.usuario.create({
      data: testUser
    });
    
    console.log('Usuario de prueba creado exitosamente:', newUser);
    
  } catch (error) {
    console.error('Error durante la prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection();