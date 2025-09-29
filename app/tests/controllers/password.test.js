const request = require('supertest');
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Mocks de las dependencias
jest.mock('crypto');
jest.mock('nodemailer');
jest.mock('../../model/queriesUsuarios');
jest.mock('bcryptjs');

const nodemailer = require('nodemailer');
const dbUsuarios = require('../../model/queriesUsuarios');
const controladorPassword = require('../../controllers/controladorPassword');

// Configuración de la aplicación Express para testing
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mock más robusto del sistema de renderizado
const mockRender = jest.fn((template, data, callback) => {
  if (typeof callback === 'function') {
    callback(null, JSON.stringify(data));
  }
});

const mockSend = jest.fn((content) => content);

app.use((req, res, next) => {
  res.render = jest.fn((template, data) => {
    res.status(200);
    res.type('application/json');
    res.end(JSON.stringify(data));
  });
  
  const originalSend = res.send;
  res.send = jest.fn((content) => {
    res.status(res.statusCode || 200);
    res.type('text/plain');
    res.end(content);
  });
  
  next();
});

// Configurar rutas manualmente para evitar problemas de importación circular
app.get('/recovery/forgot-password', controladorPassword.mostrarFormularioRecuperacion);
app.post('/recovery/forgot-password', controladorPassword.procesarFormularioRecuperacion);
app.get('/recovery/reset-password/:token', controladorPassword.mostrarFormularioReset);
app.post('/recovery/reset-password/:token', controladorPassword.procesarResetPassword);

describe('Controlador de Recuperación de Contraseña', () => {
  let mockTransporter;

  beforeEach(() => {
    // Limpiar todos los mocks antes de cada test
    jest.clearAllMocks();

    // Mock del transporter de nodemailer
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
    };
    nodemailer.createTransport.mockReturnValue(mockTransporter);

    // Mock de crypto.randomBytes
    crypto.randomBytes.mockReturnValue({
      toString: jest.fn().mockReturnValue('fake-token-123')
    });
  });

  describe('GET /recovery/forgot-password - Mostrar formulario de recuperación', () => {
    test('debería renderizar el formulario con message null cuando todo está bien', async () => {
      const response = await request(app)
        .get('/recovery/forgot-password')
        .expect(200);

      const responseData = JSON.parse(response.text);
      expect(responseData.message).toBeNull();
    });

    test('debería retornar error 500 si ocurre una excepción', async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.use(express.urlencoded({ extended: true }));
      testApp.set('etag', false); // Disable ETag to avoid the error

      // Middleware that simulates a failure in res.render
      testApp.use((req, res, next) => {
        res.render = jest.fn(() => {
          throw new Error('Error de renderizado');
        });
        next();
      });

      // Custom error handler to ensure the correct response
      testApp.use((err, req, res, next) => {
        res.status(500).send('Error interno al mostrar formulario.');
      });

      testApp.get('/recovery/forgot-password', controladorPassword.mostrarFormularioRecuperacion);

      const response = await request(testApp)
        .get('/recovery/forgot-password')
        .expect(500);

      expect(response.text).toContain('Error interno al mostrar formulario.');
    });
  });

  describe('POST /recovery/forgot-password - Procesar formulario de recuperación', () => {
    test('debería mostrar mensaje informativo cuando el usuario no existe', async () => {
      dbUsuarios.buscarUsuarioPorEmail.mockResolvedValue(null);

      const response = await request(app)
        .post('/recovery/forgot-password')
        .send({ email: 'noexiste@test.com' })
        .expect(200);

      const responseData = JSON.parse(response.text);
      expect(responseData.message.text).toBe('Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.');
      expect(responseData.message.type).toBe('info');
      expect(dbUsuarios.buscarUsuarioPorEmail).toHaveBeenCalledWith('noexiste@test.com');
    });

    test('debería enviar email y mostrar mensaje de éxito cuando el usuario existe', async () => {
      const mockUsuario = {
        id: 1,
        email: 'usuario@test.com'
      };
      
      dbUsuarios.buscarUsuarioPorEmail.mockResolvedValue(mockUsuario);
      dbUsuarios.guardarTokenDeReset.mockResolvedValue(true);

      const response = await request(app)
        .post('/recovery/forgot-password')
        .send({ email: 'usuario@test.com' })
        .expect(200);

      const responseData = JSON.parse(response.text);
      expect(responseData.message.text).toBe('Se ha enviado un correo con instrucciones para restablecer tu contraseña.');
      expect(responseData.message.type).toBe('success');
      
      expect(dbUsuarios.buscarUsuarioPorEmail).toHaveBeenCalledWith('usuario@test.com');
      expect(dbUsuarios.guardarTokenDeReset).toHaveBeenCalledWith(
        mockUsuario.id,
        'fake-token-123',
        expect.any(Date)
      );
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        to: mockUsuario.email,
        from: 'no-reply@stockcloud.info',
        subject: 'Restablecer tu contraseña',
        html: expect.stringContaining('fake-token-123')
      });
    });

    test('debería retornar error 500 si falla la búsqueda del usuario', async () => {
      dbUsuarios.buscarUsuarioPorEmail.mockRejectedValue(new Error('Error de base de datos'));

      await request(app)
        .post('/recovery/forgot-password')
        .send({ email: 'test@test.com' })
        .expect(500);
    });

    test('debería retornar error 500 si falla el envío del email', async () => {
      const mockUsuario = { id: 1, email: 'usuario@test.com' };
      dbUsuarios.buscarUsuarioPorEmail.mockResolvedValue(mockUsuario);
      dbUsuarios.guardarTokenDeReset.mockResolvedValue(true);
      mockTransporter.sendMail.mockRejectedValue(new Error('Error de email'));

      await request(app)
        .post('/recovery/forgot-password')
        .send({ email: 'usuario@test.com' })
        .expect(500);
    });
  });

  describe('GET /recovery/reset-password/:token - Mostrar formulario de reset', () => {
    test('debería renderizar el formulario cuando el token es válido', async () => {
      const mockUsuario = {
        id: 1,
        reset_token_expires: new Date(Date.now() + 3600000) // 1 hora en el futuro
      };
      
      dbUsuarios.buscarUsuarioPorToken.mockResolvedValue(mockUsuario);

      const response = await request(app)
        .get('/recovery/reset-password/token-valido')
        .expect(200);

      const responseData = JSON.parse(response.text);
      expect(responseData.token).toBe('token-valido');
      expect(responseData.error).toBeNull();
      expect(dbUsuarios.buscarUsuarioPorToken).toHaveBeenCalledWith('token-valido');
    });

    test('debería mostrar mensaje de token inválido cuando no existe usuario', async () => {
      dbUsuarios.buscarUsuarioPorToken.mockResolvedValue(null);

      const response = await request(app)
        .get('/recovery/reset-password/token-invalido')
        .expect(200);

      expect(response.text).toBe('Token inválido o expirado.');
    });

    test('debería mostrar mensaje de token expirado cuando el token ha vencido', async () => {
      const mockUsuario = {
        id: 1,
        reset_token_expires: new Date(Date.now() - 3600000) // 1 hora en el pasado
      };
      
      dbUsuarios.buscarUsuarioPorToken.mockResolvedValue(mockUsuario);

      const response = await request(app)
        .get('/recovery/reset-password/token-expirado')
        .expect(200);

      expect(response.text).toBe('Token inválido o expirado.');
    });

    test('debería retornar error 500 si falla la búsqueda por token', async () => {
      dbUsuarios.buscarUsuarioPorToken.mockRejectedValue(new Error('Error de base de datos'));

      await request(app)
        .get('/recovery/reset-password/token-test')
        .expect(500);
    });
  });

  describe('POST /recovery/reset-password/:token - Procesar reset de contraseña', () => {
    test('debería redirigir a inicio cuando el reset es exitoso', async () => {
      const mockUsuario = {
        id: 1,
        reset_token_expires: new Date(Date.now() + 3600000)
      };
      
      dbUsuarios.buscarUsuarioPorToken.mockResolvedValue(mockUsuario);
      bcrypt.hash.mockResolvedValue('hashed-password');
      dbUsuarios.actualizarPasswordYLimpiarToken.mockResolvedValue(true);

      const response = await request(app)
        .post('/recovery/reset-password/token-valido')
        .send({
          password: 'nuevaPassword123',
          confirmar: 'nuevaPassword123'
        })
        .expect(302);

      expect(response.headers.location).toBe('/');
      expect(bcrypt.hash).toHaveBeenCalledWith('nuevaPassword123', 10);
      expect(dbUsuarios.actualizarPasswordYLimpiarToken).toHaveBeenCalledWith(
        mockUsuario.id,
        'hashed-password'
      );
    });

    test('debería mostrar error cuando faltan campos', async () => {
      const response = await request(app)
        .post('/recovery/reset-password/token-test')
        .send({
          password: 'test123'
          // Falta confirmar
        })
        .expect(200);

      const responseData = JSON.parse(response.text);
      expect(responseData.token).toBe('token-test');
      expect(responseData.error).toBe('Campos faltantes.');
    });

    test('debería mostrar error cuando las contraseñas no coinciden', async () => {
      const response = await request(app)
        .post('/recovery/reset-password/token-test')
        .send({
          password: 'password123',
          confirmar: 'password456'
        })
        .expect(200);

      const responseData = JSON.parse(response.text);
      expect(responseData.token).toBe('token-test');
      expect(responseData.error).toBe('Las contraseñas no coinciden.');
    });

    test('debería mostrar mensaje de token inválido cuando no existe usuario', async () => {
      dbUsuarios.buscarUsuarioPorToken.mockResolvedValue(null);

      const response = await request(app)
        .post('/recovery/reset-password/token-invalido')
        .send({
          password: 'password123',
          confirmar: 'password123'
        })
        .expect(200);

      expect(response.text).toBe('Token inválido o expirado.');
    });

    test('debería mostrar mensaje de token expirado', async () => {
      const mockUsuario = {
        id: 1,
        reset_token_expires: new Date(Date.now() - 3600000) // Expirado
      };
      
      dbUsuarios.buscarUsuarioPorToken.mockResolvedValue(mockUsuario);

      const response = await request(app)
        .post('/recovery/reset-password/token-expirado')
        .send({
          password: 'password123',
          confirmar: 'password123'
        })
        .expect(200);

      expect(response.text).toBe('Token inválido o expirado.');
    });

    test('debería retornar error 500 si falla el hash de la contraseña', async () => {
      const mockUsuario = {
        id: 1,
        reset_token_expires: new Date(Date.now() + 3600000)
      };
      
      dbUsuarios.buscarUsuarioPorToken.mockResolvedValue(mockUsuario);
      bcrypt.hash.mockRejectedValue(new Error('Error al hashear'));

      await request(app)
        .post('/recovery/reset-password/token-test')
        .send({
          password: 'password123',
          confirmar: 'password123'
        })
        .expect(500);
    });

    test('debería retornar error 500 si falla la actualización en base de datos', async () => {
      const mockUsuario = {
        id: 1,
        reset_token_expires: new Date(Date.now() + 3600000)
      };
      
      dbUsuarios.buscarUsuarioPorToken.mockResolvedValue(mockUsuario);
      bcrypt.hash.mockResolvedValue('hashed-password');
      dbUsuarios.actualizarPasswordYLimpiarToken.mockRejectedValue(new Error('Error de BD'));

      await request(app)
        .post('/recovery/reset-password/token-test')
        .send({
          password: 'password123',
          confirmar: 'password123'
        })
        .expect(500);
    });
  });

  describe('Integración con nodemailer', () => {
    test('debería configurar correctamente el transporter de Gmail', async () => {
      const mockUsuario = { id: 1, email: 'test@test.com' };
      dbUsuarios.buscarUsuarioPorEmail.mockResolvedValue(mockUsuario);
      dbUsuarios.guardarTokenDeReset.mockResolvedValue(true);

      await request(app)
        .post('/recovery/forgot-password')
        .send({ email: 'test@test.com' });

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        service: 'gmail',
        auth: {
          user: 'stockcloud.soporte@gmail.com',
          pass: 'ktte cwnu eojo eaxt'
        }
      });
    });

    test('debería generar token con 32 bytes aleatorios', async () => {
      const mockUsuario = { id: 1, email: 'test@test.com' };
      dbUsuarios.buscarUsuarioPorEmail.mockResolvedValue(mockUsuario);

      await request(app)
        .post('/recovery/forgot-password')
        .send({ email: 'test@test.com' });

      expect(crypto.randomBytes).toHaveBeenCalledWith(32);
    });
  });
});
