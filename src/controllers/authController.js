const jwt = require('jsonwebtoken');
const {PrismaClient} = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();
const saltRounds = 10;

// Función para enviar correo
const sendEmail = async (to, subject, htmlContent) => {
  console.log('\n========== CORREO ELECTRÓNICO ==========');
  console.log(`PARA: ${to}`);
  console.log(`ASUNTO: ${subject}`);
  console.log(`CONTENIDO HTML: ${htmlContent}`);
  console.log('=========================================\n');

  if (process.env.NODE_ENV === 'production') {
    try {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.error('ADVERTENCIA: Credenciales de correo no configuradas en .env');
        return false;
      }
      
      const transporter = nodemailer.createTransporter({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER || 'fastfood.notificaciones@gmail.com',
          pass: process.env.EMAIL_PASSWORD || 'app_password_here'
        }
      });
      
      const info = await transporter.sendMail({
        from: '"FastFood App" <fastfood.notificaciones@gmail.com>',
        to,
        subject,
        html: htmlContent
      });
      
      console.log('Correo enviado correctamente:', info.messageId);
      return true;
    } catch (error) {
      console.error('Error al enviar correo:', error);
      return false;
    }
  }
  
  return true;
};

// Registro de usuario
exports.register = async(req, res) => {
    try {
        const { nombreCompleto, email, password, telefono, cedula, direccion, comuna, rol, vehiculo } = req.body;

        console.log('Datos recibidos:', { nombreCompleto, email, telefono, cedula, direccion, comuna, rol, vehiculo });

        // Verificar si el usuario ya existe
        console.log('Verificando si el usuario existe...');
        const existingUser = await prisma.usuarios.findUnique({
            where: {
                email: email,
            },
        });
        if (existingUser) {
            return res.status(400).json({message: 'El correo ya se encuentra registrado'});
        }
        console.log('Email disponible, continuando...');

        // Validar el rol
        const rolesValidos = ['Cliente', 'Repartidor', 'Admin'];
        if (!rolesValidos.includes(rol)) {
            return res.status(400).json({
                message: 'Rol no válido. Los roles permitidos son: Cliente, Repartidor, Admin'
            });
        }

        // Validar vehículo para repartidores
        if (rol === 'Repartidor' && (!vehiculo || !['Moto', 'Bicicleta'].includes(vehiculo))) {
            return res.status(400).json({
                message: 'Vehículo no válido. Las opciones son: Moto, Bicicleta'
            });
        }

        // Encriptar la contraseña
        console.log('Encriptando contraseña...');
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        console.log('Contraseña encriptada correctamente');
        
        // Convertir telefono, cedula y comuna a números
        const telefonoNum = parseInt(telefono);
        const cedulaNum = parseInt(cedula);
        const comunaNum = parseInt(comuna);
        
        if (isNaN(telefonoNum) || isNaN(cedulaNum) || isNaN(comunaNum)) {
            return res.status(400).json({
                message: 'Teléfono, cédula y comuna deben ser valores numéricos'
            });
        }

        const verificado = true; 

        // Datos para crear el usuario
        console.log('Preparando datos de usuario...');
        const userData = {
            nombreCompleto,
            email,
            contrase_a: hashedPassword, 
            telefono: telefonoNum,
            cedula: cedulaNum,
            direccion,
            rol,
            vehiculo: rol === 'Repartidor' ? vehiculo : null,
            verificado, 
            historialDirecciones: [
                {
                    comuna: comunaNum,
                    barrio: direccion,
                    direccionEspecifica: direccion
                }
            ]
        };
        
        console.log('Intentando crear usuario con datos:', JSON.stringify(userData, null, 2));
        
        // Crear el usuario en la base de datos
        console.log('Creando usuario en la base de datos...');
        const newUser = await prisma.usuarios.create({ 
            data: userData
        });

        console.log('Usuario creado exitosamente:', newUser.id);

        // Generar token de verificación
        const token = jwt.sign(
            {userId: newUser.id, email: newUser.email, rol: newUser.rol},
            process.env.JWT_SECRET,
            {expiresIn: '24h'}
        );

  
        let htmlCorreo = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #ff4b2b;">FastFood</h1>
            </div>
            <h2>¡Bienvenido/a a FastFood!</h2>
            <p>Estimado/a ${nombreCompleto},</p>
            <p>Tu cuenta ha sido creada exitosamente. Ahora puedes disfrutar de todas las funcionalidades de nuestra plataforma.</p>
        `;
        
        // Personalizar mensaje según el rol
        if (rol === 'Admin') {
            htmlCorreo += `
            <p>Como administrador, ahora puedes comenzar a configurar tu restaurante y ofrecer tus productos en la plataforma.</p>
            `;
        } else if (rol === 'Repartidor') {
            htmlCorreo += `
            <p>Como repartidor, ahora puedes comenzar a aceptar entregas y formar parte de nuestro equipo de distribución.</p>
            `;
        } else { 
            htmlCorreo += `
            <p>Como cliente, ahora puedes comenzar a ordenar comida de tus restaurantes favoritos.</p>
            `;
        }
        
        htmlCorreo += `
            <p>Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.</p>
            <p>¡Esperamos que disfrutes de FastFood!</p>
        </div>
        `;

        try {
            console.log('Intentando enviar correo de bienvenida a:', email);
            await sendEmail(email, 'Bienvenido a FastFood', htmlCorreo);
            console.log('Correo de bienvenida enviado');
        } catch (emailError) {
            console.error('Error al enviar correo de bienvenida:', emailError);
        }

        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            token: token,
            user: {
                id: newUser.id,
                nombreCompleto: newUser.nombreCompleto,
                email: newUser.email,
                telefono: newUser.telefono,
                cedula: newUser.cedula,
                direccion: newUser.direccion,
                rol: newUser.rol,
                vehiculo: newUser.vehiculo,
                verificado: newUser.verificado
            },
        });
    } catch (error) {
        console.error('Error al registrar el usuario:', error);
        console.error('Detalles adicionales del error:', JSON.stringify(error, null, 2));

        res.status(500).json({
            message: 'Error al registrar el usuario', 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            prismaError: error.code ? {
                code: error.code,
                meta: error.meta
            } : undefined
        });
    }
};

// Login de usuario 
exports.login = async(req, res) => {
    try {
        console.log('=== INICIO DE LOGIN ===');
        console.log('Body recibido:', req.body);
        
        const {email, password} = req.body;

        // Validaciones básicas
        if (!email || !password) {
            console.log('Error: Email o contraseña faltantes');
            return res.status(400).json({
                message: 'Email y contraseña son requeridos'
            });
        }

        console.log('Buscando usuario con email:', email);

        // Buscar el usuario en la base de datos
        const user = await prisma.usuarios.findUnique({ 
            where: {
                email: email,
            },
        });
        
        console.log('Usuario encontrado:', user ? 'SÍ' : 'NO');
        
        if (!user) {
            console.log('Usuario no encontrado para email:', email);
            return res.status(401).json({message: 'Credenciales inválidas'});
        }

        console.log('Verificando contraseña...');
        console.log('Contraseña hasheada en BD:', user.contrase_a);

        // Verificar la contraseña
        const isPasswordValid = await bcrypt.compare(password, user.contrase_a); 
        
        console.log('Contraseña válida:', isPasswordValid);
        
        if (!isPasswordValid) {
            console.log('Contraseña inválida para usuario:', email);
            return res.status(401).json({message: 'Credenciales inválidas'});
        }

        console.log('Generando token JWT...');

        // Generar token de acceso
        const token = jwt.sign(
            {userId: user.id, email: user.email, rol: user.rol},
            process.env.JWT_SECRET,
            {expiresIn: '24h'}
        );

        console.log('Token generado exitosamente');
        console.log('=== LOGIN EXITOSO ===');

        res.status(200).json({
            message: 'Inicio de sesión exitoso',
            token: token,
            user: {
                id: user.id,
                nombreCompleto: user.nombreCompleto,
                email: user.email,
                telefono: user.telefono,
                cedula: user.cedula,
                direccion: user.direccion,
                rol: user.rol,
                vehiculo: user.vehiculo,
                verificado: user.verificado
            },
        });
    } catch (error) {
        console.error('=== ERROR EN LOGIN ===');
        console.error('Error completo:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        res.status(500).json({
            message: 'Error al iniciar sesión', 
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? {
                stack: error.stack,
                name: error.name
            } : undefined
        });
    }
};

exports.requestPasswordReset = async(req, res) => {
    try {
        const {email} = req.body;

        const user = await prisma.usuarios.findUnique({ 
            where: {
                email: email,
            },
        });
        if (!user) {
            return res.status(200).json({ message: 'Si el correo existe, recibirás instrucciones para recuperar tu contraseña' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expirationDate = new Date(Date.now() + 3600000);

        await prisma.usuarios.update({ 
            where: {id: user.id},
            data: {
                resetToken: token,
                resetTokenExpiry: expirationDate.toISOString(),
            }
        });

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`;

        await sendEmail(
            email,
            'Recuperación de contraseña - FastFood',
            `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #ff4b2b;">FastFood</h1>
                </div>
                <h2>Recuperación de contraseña</h2>
                <p>Estimado/a ${user.nombreCompleto},</p>
                <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Si no has sido tú quien ha realizado esta solicitud, puedes ignorar este correo.</p>
                <p>Para restablecer tu contraseña, haz clic en el siguiente enlace:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background-color: #ff4b2b; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Restablecer contraseña</a>
                </div>
                <p>Este enlace expirará en 1 hora.</p>
                <p>Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:</p>
                <p style="word-break: break-all;">${resetUrl}</p>
            </div>
            `
        );

        res.status(200).json({message: 'Si el correo existe, recibirás instrucciones para recuperar tu contraseña'});
    } catch (error) {
        console.error('Error al recuperar la contraseña:', error);
        res.status(500).json({message: 'Error al procesar la solicitud', error: error.message});
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
  
        const user = await prisma.usuarios.findFirst({ 
            where: {
                resetToken: token,
                resetTokenExpiry: {
                    gt: new Date().toISOString(),
                },
            },
        });
  
        if (!user) {
            return res.status(400).json({ message: 'Token inválido o expirado' });
        }
  
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
  
        await prisma.usuarios.update({ 
            where: { id: user.id },
            data: {
                contrase_a: hashedPassword, 
                resetToken: null,
                resetTokenExpiry: null,
            },
        });
  
        res.status(200).json({ message: 'Contraseña actualizada correctamente' });
    } catch (error) {
        console.error('Error al restablecer contraseña:', error);
        res.status(500).json({ message: 'Error al restablecer contraseña', error: error.message });
    }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await prisma.usuarios.findUnique({ 
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.status(200).json({
      id: user.id,
      nombreCompleto: user.nombreCompleto,
      email: user.email,
      telefono: user.telefono,
      cedula: user.cedula,
      direccion: user.direccion,
      rol: user.rol,
      vehiculo: user.vehiculo,
      imageUrl: user.imageUrl || null
    });
  } catch (error) {
    console.error('Error al obtener información del usuario:', error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
};

exports.validateCedula = async (req, res) => {
  try {
    const { cedula } = req.params;
    
    if (!cedula || cedula.length < 5) {
      return res.status(400).json({ message: 'Formato de cédula inválido' });
    }
    const existingUser = await prisma.usuarios.findFirst({ 
      where: { cedula: parseInt(cedula) }
    });
    
    if (existingUser) {
      return res.status(409).json({ 
        message: 'Esta cédula ya está registrada en el sistema',
        field: 'cedula'
      });
    }

    return res.status(200).json({ 
      message: 'Cédula disponible',
      valid: true
    });
    
  } catch (error) {
    console.error('Error al validar cédula:', error);
    res.status(500).json({ message: 'Error al validar cédula' });
  }
};

exports.validateTelefono = async (req, res) => {
  try {
    const { telefono } = req.params;

    if (!telefono || telefono.length < 6) {
      return res.status(400).json({ message: 'Formato de teléfono inválido' });
    }

    const existingUser = await prisma.usuarios.findFirst({ 
      where: { telefono: parseInt(telefono) }
    });
    
    if (existingUser) {
      return res.status(409).json({ 
        message: 'Este número de teléfono ya está registrado',
        field: 'telefono'
      });
    }

    return res.status(200).json({ 
      message: 'Teléfono disponible',
      valid: true
    });
    
  } catch (error) {
    console.error('Error al validar teléfono:', error);
    res.status(500).json({ message: 'Error al validar teléfono' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'El correo electrónico es requerido' });
    }

    const usuario = await prisma.usuarios.findUnique({ 
      where: { email }
    });

    if (!usuario) {
      return res.status(404).json({ message: 'No existe una cuenta con este correo electrónico' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000);

    await prisma.usuarios.update({ 
      where: { id: usuario.id },
      data: {
        resetToken,
        resetTokenExpiry
      }
    });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password-forgot/${resetToken}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #f4511e;">FastFood</h1>
        </div>
        <h2 style="color: #333;">Recuperación de contraseña</h2>
        <p>Hola ${usuario.nombreCompleto},</p>
        <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #f4511e; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Restablecer contraseña</a>
        </div>
        <p>Este enlace es válido por 1 hora. Si no solicitaste restablecer tu contraseña, puedes ignorar este correo.</p>
        <p style="margin-top: 30px; font-size: 14px; color: #777;">Saludos,<br>El equipo de FastFood</p>
      </div>
    `;

    const emailSent = await sendEmail(
      email,
      'Recuperación de contraseña - FastFood',
      htmlContent
    );

    if (emailSent) {
      return res.status(200).json({ 
        message: 'Se ha enviado un correo con instrucciones para recuperar tu contraseña' 
      });
    } else {
      return res.status(500).json({ 
        message: 'Error al enviar el correo. Por favor, intenta nuevamente.' 
      });
    }

  } catch (error) {
    console.error('Error en forgotPassword:', error);
    return res.status(500).json({ 
      message: 'Error al procesar la solicitud', 
      error: error.message 
    });
  }
};

exports.resetPasswordForgot = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token y nueva contraseña son requeridos' });
    }

    const usuario = await prisma.usuarios.findFirst({ 
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date()
        }
      }
    });

    if (!usuario) {
      return res.status(400).json({ 
        message: 'El enlace de recuperación es inválido o ha expirado' 
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.usuarios.update({ 
      where: { id: usuario.id },
      data: {
        contrase_a: hashedPassword, 
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    return res.status(200).json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error en resetPassword:', error);
    return res.status(500).json({ 
      message: 'Error al restablecer la contraseña', 
      error: error.message 
    });
  }
};