const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const controladorUsuarios = require('../../controllers/controladorUsuarios');
const dbUsuarios = require('../../model/queriesUsuarios');
const dbAuditoria = require('../../model/queriesAuditoria');

// Mock all dependencies
jest.mock('bcryptjs');
jest.mock('../../model/queriesUsuarios');
jest.mock('../../model/queriesAuditoria');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up view engine
app.set('view engine', 'ejs');
app.set('views', './views');

// Mock middleware to simulate authenticated user
app.use((req, res, next) => {
  req.user = { id: 1, username: 'testuser', rol: 'admin' };
  next();
});

// Import and use routes
const rutaUsuarios = require('../../routes/rutaUsuarios');
app.use('/usuarios', rutaUsuarios);

describe('Controlador de Usuarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset console.log and console.error mocks
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  describe('GET /usuarios - obtenerUsuarios', () => {
    it('debería renderizar la vista de usuarios con datos de usuarios y auditorías', async () => {
      const mockUsuarios = [
        { id: 1, username: 'admin', email: 'admin@test.com', rol: 'admin', estado: 'activo' },
        { id: 2, username: 'user1', email: 'user1@test.com', rol: 'usuario', estado: 'activo' }
      ];
      
      const mockAuditorias = [
        { id_auditoria: 1, accion: 'login', username: 'admin', id_producto: 123, nombre_producto: 'Producto X', campos_modificados: {}, fecha: new Date() }
      ];

      dbUsuarios.obtenerUsuarios.mockResolvedValue(mockUsuarios);
      dbAuditoria.obtenerAuditoriasConUsuarios.mockResolvedValue(mockAuditorias);

      const response = await request(app)
        .get('/usuarios')
        .expect(200);

      expect(dbUsuarios.obtenerUsuarios).toHaveBeenCalledTimes(1);
      expect(dbAuditoria.obtenerAuditoriasConUsuarios).toHaveBeenCalledTimes(1);
      expect(response.text).toContain('Lista de Usuarios');
      expect(response.text).toContain('Auditoría de productos');
    });



    it('debería manejar errores y devolver status 500', async () => {
      dbUsuarios.obtenerUsuarios.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/usuarios')
        .expect(500);

      expect(response.text).toContain('Error al obtener los datos de usuarios');
    });

    it('debería manejar error en auditorías específicamente', async () => {
      const mockUsuarios = [{ id: 1, username: 'test' }];
      dbUsuarios.obtenerUsuarios.mockResolvedValue(mockUsuarios);
      dbAuditoria.obtenerAuditoriasConUsuarios.mockRejectedValue(new Error('Audit error'));

      const response = await request(app)
        .get('/usuarios')
        .expect(500);

      expect(response.text).toContain('Error al obtener los datos de usuarios');
    });
  });

  describe('GET /usuarios/nuevo - crearUsuarioGet', () => {
    it('debería renderizar el formulario de crear usuario con lista de usuarios', async () => {
      const mockUsuarios = [
        { id: 1, username: 'admin', rol: 'admin' }
      ];

      dbUsuarios.obtenerUsuarios.mockResolvedValue(mockUsuarios);

      const response = await request(app)
        .get('/usuarios/nuevo')
        .expect(200);

      expect(dbUsuarios.obtenerUsuarios).toHaveBeenCalledTimes(1);
      expect(response.text).toContain('usuarios');
    });

    it('debería manejar errores al cargar el formulario', async () => {
      dbUsuarios.obtenerUsuarios.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/usuarios/nuevo')
        .expect(500);

      expect(response.text).toContain('Error al cargar formulario');
    });
  });

  describe('POST /usuarios/nuevo - crearUsuarioPost', () => {
    const validUserData = {
      username: 'newuser',
      password: 'password123',
      email: 'newuser@test.com',
      rol: 'usuario'
    };

    it('debería crear un nuevo usuario exitosamente', async () => {
      // Mock que no existe usuario con ese nombre o email
      dbUsuarios.buscarUsuarioPorNombre.mockResolvedValue(null);
      dbUsuarios.buscarUsuarioPorEmail.mockResolvedValue(null);
      dbUsuarios.crearUsuario.mockResolvedValue();
      bcrypt.hash.mockResolvedValue('hashedpassword123');

      const response = await request(app)
        .post('/usuarios/nuevo')
        .send(validUserData)
        .expect(302); // Redirect

      expect(response.headers.location).toBe('/usuarios');
      expect(dbUsuarios.buscarUsuarioPorNombre).toHaveBeenCalledWith('newuser');
      expect(dbUsuarios.buscarUsuarioPorEmail).toHaveBeenCalledWith('newuser@test.com');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(dbUsuarios.crearUsuario).toHaveBeenCalledWith({
        username: 'newuser',
        password: 'hashedpassword123',
        email: 'newuser@test.com',
        rol: 'usuario'
      });
    });

    it('debería validar campos obligatorios - username faltante', async () => {
      const invalidData = { ...validUserData };
      delete invalidData.username;

      const response = await request(app)
        .post('/usuarios/nuevo')
        .send(invalidData)
        .expect(400);

      expect(response.text).toContain('Faltan campos obligatorios');
      expect(dbUsuarios.crearUsuario).not.toHaveBeenCalled();
    });

    it('debería validar campos obligatorios - password faltante', async () => {
      const invalidData = { ...validUserData };
      delete invalidData.password;

      const response = await request(app)
        .post('/usuarios/nuevo')
        .send(invalidData)
        .expect(400);

      expect(response.text).toContain('Faltan campos obligatorios');
    });

    it('debería validar campos obligatorios - email faltante', async () => {
      const invalidData = { ...validUserData };
      delete invalidData.email;

      const response = await request(app)
        .post('/usuarios/nuevo')
        .send(invalidData)
        .expect(400);

      expect(response.text).toContain('Faltan campos obligatorios');
    });

    it('debería validar campos obligatorios - rol faltante', async () => {
      const invalidData = { ...validUserData };
      delete invalidData.rol;

      const response = await request(app)
        .post('/usuarios/nuevo')
        .send(invalidData)
        .expect(400);

      expect(response.text).toContain('Faltan campos obligatorios');
    });

    it('debería rechazar usuario existente por nombre', async () => {
      dbUsuarios.buscarUsuarioPorNombre.mockResolvedValue({ id: 1, username: 'newuser' });

      const response = await request(app)
        .post('/usuarios/nuevo')
        .send(validUserData)
        .expect(409);

      expect(response.text).toContain('El nombre de usuario ya está en uso');
      expect(dbUsuarios.crearUsuario).not.toHaveBeenCalled();
    });

    it('debería rechazar email existente', async () => {
      dbUsuarios.buscarUsuarioPorNombre.mockResolvedValue(null);
      dbUsuarios.buscarUsuarioPorEmail.mockResolvedValue({ id: 1, email: 'newuser@test.com' });

      const response = await request(app)
        .post('/usuarios/nuevo')
        .send(validUserData)
        .expect(409);

      expect(response.text).toContain('El correo electrónico ya está en uso');
      expect(dbUsuarios.crearUsuario).not.toHaveBeenCalled();
    });

    it('debería manejar errores en el hash de password', async () => {
      dbUsuarios.buscarUsuarioPorNombre.mockResolvedValue(null);
      dbUsuarios.buscarUsuarioPorEmail.mockResolvedValue(null);
      bcrypt.hash.mockRejectedValue(new Error('Hash error'));

      // Mock next function to capture error
      const mockNext = jest.fn();
      const mockReq = { body: validUserData };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        redirect: jest.fn()
      };

      await controladorUsuarios.crearUsuarioPost(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('debería logear los datos del usuario (debug)', async () => {
      dbUsuarios.buscarUsuarioPorNombre.mockResolvedValue(null);
      dbUsuarios.buscarUsuarioPorEmail.mockResolvedValue(null);
      dbUsuarios.crearUsuario.mockResolvedValue();
      bcrypt.hash.mockResolvedValue('hashedpassword123');

      await request(app)
        .post('/usuarios/nuevo')
        .send(validUserData)
        .expect(302);

      expect(console.log).toHaveBeenCalledWith('newuser');
      expect(console.log).toHaveBeenCalledWith('password123');
      expect(console.log).toHaveBeenCalledWith('newuser@test.com');
      expect(console.log).toHaveBeenCalledWith('usuario');
    });
  });

  describe('GET /usuarios/editar/:id - editarUsuarioGet', () => {
    it('debería renderizar el formulario de editar usuario', async () => {
      const mockUsuario = { id: 1, username: 'testuser', email: 'test@test.com', rol: 'usuario' };
      const mockUsuarios = [mockUsuario];

      dbUsuarios.buscarUsuarioPorId.mockResolvedValue(mockUsuario);
      dbUsuarios.obtenerUsuarios.mockResolvedValue(mockUsuarios);

      const response = await request(app)
        .get('/usuarios/editar/1')
        .expect(200);

      expect(dbUsuarios.buscarUsuarioPorId).toHaveBeenCalledWith('1');
      expect(dbUsuarios.obtenerUsuarios).toHaveBeenCalledTimes(1);
      expect(response.text).toContain('usuario');
    });

    it('debería devolver 404 si el usuario no existe', async () => {
      dbUsuarios.buscarUsuarioPorId.mockResolvedValue(null);
      dbUsuarios.obtenerUsuarios.mockResolvedValue([]);

      const response = await request(app)
        .get('/usuarios/editar/999')
        .expect(404);

      expect(response.text).toContain('Usuario no encontrado');
    });

    it('debería manejar errores de base de datos', async () => {
      dbUsuarios.obtenerUsuarios.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/usuarios/editar/1')
        .expect(500);

      expect(response.text).toContain('Error interno');
    });

    it('debería manejar error específico al buscar usuario por ID', async () => {
      dbUsuarios.obtenerUsuarios.mockResolvedValue([]);
      dbUsuarios.buscarUsuarioPorId.mockRejectedValue(new Error('User search error'));

      const response = await request(app)
        .get('/usuarios/editar/1')
        .expect(500);

      expect(response.text).toContain('Error interno');
    });
  });

  describe('POST /usuarios/editar/:id - editarUsuarioPost', () => {
    const updateData = {
      username: 'updateduser',
      email: 'updated@test.com',
      rol: 'admin',
      estado: 'activo'
    };

    it('debería actualizar un usuario exitosamente', async () => {
      dbUsuarios.actualizarUsuario.mockResolvedValue();

      const response = await request(app)
        .post('/usuarios/editar/1')
        .send(updateData)
        .expect(302);

      expect(response.headers.location).toBe('/usuarios');
      expect(dbUsuarios.actualizarUsuario).toHaveBeenCalledWith('1', updateData);
    });

    it('debería manejar errores al actualizar usuario', async () => {
      dbUsuarios.actualizarUsuario.mockRejectedValue(new Error('Update error'));

      const response = await request(app)
        .post('/usuarios/editar/1')
        .send(updateData)
        .expect(500);

      expect(response.text).toContain('Error al actualizar usuario');
    });

    it('debería manejar campos faltantes gracefully', async () => {
      const partialData = { username: 'partialuser' };
      dbUsuarios.actualizarUsuario.mockResolvedValue();

      const response = await request(app)
        .post('/usuarios/editar/1')
        .send(partialData)
        .expect(302);

      expect(dbUsuarios.actualizarUsuario).toHaveBeenCalledWith('1', {
        username: 'partialuser',
        email: undefined,
        rol: undefined,
        estado: undefined
      });
    });
  });

  describe('Casos edge y validaciones adicionales', () => {
    it('debería manejar strings vacíos como campos obligatorios', async () => {
      const emptyStringData = {
        username: '',
        password: 'validpass',
        email: 'valid@email.com',
        rol: 'usuario'
      };

      const response = await request(app)
        .post('/usuarios/nuevo')
        .send(emptyStringData)
        .expect(400);

      expect(response.text).toContain('Faltan campos obligatorios');
    });

    it('debería manejar campos con solo espacios como inválidos', async () => {
      const whitespaceData = {
        username: '   ',
        password: 'validpass',
        email: 'valid@email.com',
        rol: 'usuario'
      };

      const response = await request(app)
        .post('/usuarios/nuevo')
        .send(whitespaceData)
        .expect(400);

      expect(response.text).toContain('Faltan campos obligatorios');
    });

    it('debería manejar IDs inválidos en rutas de edición', async () => {
      await request(app)
        .get('/usuarios/editar/abc')
        .expect(500); // Likely database error with invalid ID
    });
  });
});

describe('Tests unitarios para funciones del controlador', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      user: { id: 1, username: 'testuser', rol: 'admin' }
    };
    mockRes = {
      render: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      sendStatus: jest.fn(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('crearUsuarioGet - Tests unitarios', () => {
    it('debería llamar a render con usuarios', async () => {
      const mockUsuarios = [{ id: 1, username: 'test' }];
      dbUsuarios.obtenerUsuarios.mockResolvedValue(mockUsuarios);

      await controladorUsuarios.crearUsuarioGet(mockReq, mockRes);

      expect(mockRes.render).toHaveBeenCalledWith('crearUsuario', { usuarios: mockUsuarios });
    });
  });

  describe('obtenerUsuarios - Tests unitarios', () => {
    it('debería llamar a render con usuarios y auditorías', async () => {
      const mockUsuarios = [{ id: 1, username: 'test' }];
      const mockAuditorias = [{ id: 1, accion: 'login' }];
      
      dbUsuarios.obtenerUsuarios.mockResolvedValue(mockUsuarios);
      dbAuditoria.obtenerAuditoriasConUsuarios.mockResolvedValue(mockAuditorias);

      await controladorUsuarios.obtenerUsuarios(mockReq, mockRes);

      expect(mockRes.render).toHaveBeenCalledWith('usuarios', { 
        usuarios: mockUsuarios, 
        auditorias: mockAuditorias,
        user: mockReq.user
      });
    });
  });

  describe('editarUsuarioGet - Tests unitarios', () => {
    it('debería renderizar con datos correctos del usuario', async () => {
      const mockUsuario = { id: 1, username: 'testuser' };
      const mockUsuarios = [mockUsuario];
      mockReq.params.id = '1';

      dbUsuarios.buscarUsuarioPorId.mockResolvedValue(mockUsuario);
      dbUsuarios.obtenerUsuarios.mockResolvedValue(mockUsuarios);

      await controladorUsuarios.editarUsuarioGet(mockReq, mockRes);

      expect(mockRes.render).toHaveBeenCalledWith('editarUsuario', {
        usuario: mockUsuario,
        usuarios: mockUsuarios,
        usuarioActual: mockReq.user
      });
    });
  });

  describe('editarUsuarioPost - Tests unitarios', () => {
    it('debería actualizar usuario y redirigir', async () => {
      mockReq.params.id = '1';
      mockReq.body = {
        username: 'updated',
        email: 'updated@test.com',
        rol: 'admin',
        estado: 'activo'
      };
      dbUsuarios.actualizarUsuario.mockResolvedValue();

      await controladorUsuarios.editarUsuarioPost(mockReq, mockRes);

      expect(dbUsuarios.actualizarUsuario).toHaveBeenCalledWith('1', mockReq.body);
      expect(mockRes.redirect).toHaveBeenCalledWith('/usuarios');
    });
  });
});
