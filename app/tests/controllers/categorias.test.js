const request = require('supertest');
const express = require('express');
const controladorCategorias = require('../../controllers/controladorCategorias');
const dbCategorias = require('../../model/queriesCategorias');

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterAll(() => {
  console.error.mockRestore();
  console.log.mockRestore();
});

jest.mock('../../model/queriesCategorias');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', './views');

const rutaCategorias = require('../../routes/rutaCategorias');
app.use('/categorias', rutaCategorias);

describe('Controlador de Categorías', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /categorias - obtenerCategorias', () => {
    it('debería renderizar la vista de categorías con datos exitosamente', async () => {
      const mockCategorias = [
        { id: 1, nombre: 'Electrónicos', estado: 'activa' },
        { id: 2, nombre: 'Ropa', estado: 'inactiva' }
      ];

      dbCategorias.obtenerCategorias.mockResolvedValue(mockCategorias);

      const response = await request(app).get('/categorias').expect(200);

      expect(dbCategorias.obtenerCategorias).toHaveBeenCalled();
      expect(response.text).toContain('Categorías');
    });

    it('debería manejar errores y devolver status 500', async () => {
      dbCategorias.obtenerCategorias.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/categorias').expect(500);
      expect(response.text).toContain('Error al obtener las categorias');
    });
  });

  describe('POST /categorias - crearCategoria', () => {
    it('debería crear una nueva categoría exitosamente', async () => {
      dbCategorias.crearCategoria.mockResolvedValue();

      const response = await request(app)
        .post('/categorias')
        .send({ nombre: 'Nueva Categoría' })
        .expect(302);

      expect(dbCategorias.crearCategoria).toHaveBeenCalledWith('Nueva Categoría');
      expect(response.headers.location).toBe('/categorias');
    });

    it('debería manejar errores al crear categoría', async () => {
      dbCategorias.crearCategoria.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/categorias')
        .send({ nombre: 'Nueva Categoría' })
        .expect(500);

      expect(response.text).toContain('Error al crear la categoría');
    });
  });

  describe('PUT /categorias/:id - renombrarCategoria', () => {
    it('debería renombrar una categoría exitosamente', async () => {
      dbCategorias.renombrarCategoria.mockResolvedValue();

      await request(app)
        .put('/categorias/1')
        .send({ nombre: 'Categoría Renombrada' })
        .expect(200);

      // Aceptamos string o number
      expect(dbCategorias.renombrarCategoria).toHaveBeenCalledWith(
        expect.anything(),
        'Categoría Renombrada'
      );
    });

    it('debería rechazar nombres vacíos', async () => {
      const response = await request(app)
        .put('/categorias/1')
        .send({ nombre: '' })
        .expect(400);

      expect(response.text).toContain('El nombre no puede estar vacío');
      expect(dbCategorias.renombrarCategoria).not.toHaveBeenCalled();
    });

    it('debería rechazar nombres que solo contengan espacios', async () => {
      const response = await request(app)
        .put('/categorias/1')
        .send({ nombre: '   ' })
        .expect(400);

      expect(response.text).toContain('El nombre no puede estar vacío');
      expect(dbCategorias.renombrarCategoria).not.toHaveBeenCalled();
    });

    it('debería trimear espacios en blanco del nombre', async () => {
      dbCategorias.renombrarCategoria.mockResolvedValue();

      await request(app)
        .put('/categorias/1')
        .send({ nombre: '  Categoría con espacios  ' })
        .expect(200);

      expect(dbCategorias.renombrarCategoria).toHaveBeenCalledWith(
        expect.anything(),
        'Categoría con espacios'
      );
    });

    it('debería manejar errores de base de datos', async () => {
      dbCategorias.renombrarCategoria.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put('/categorias/1')
        .send({ nombre: 'Nuevo Nombre' })
        .expect(500);

      expect(response.text).toContain('Error al renombrar la categoría');
    });
  });

  describe('PATCH /categorias/:id/estado - cambiarEstadoCategoria', () => {
    it('debería cambiar el estado de una categoría a "activa" exitosamente', async () => {
      dbCategorias.cambiarEstadoCategoria.mockResolvedValue();

      await request(app)
        .patch('/categorias/1/estado')
        .send({ estado: 'activa' })
        .expect(200);

      expect(dbCategorias.cambiarEstadoCategoria).toHaveBeenCalledWith(
        expect.anything(),
        'activa'
      );
    });

    it('debería cambiar el estado de una categoría a "inactiva" exitosamente', async () => {
      dbCategorias.cambiarEstadoCategoria.mockResolvedValue();

      await request(app)
        .patch('/categorias/1/estado')
        .send({ estado: 'inactiva' })
        .expect(200);

      expect(dbCategorias.cambiarEstadoCategoria).toHaveBeenCalledWith(
        expect.anything(),
        'inactiva'
      );
    });

    it('debería rechazar estados inválidos', async () => {
      const response = await request(app)
        .patch('/categorias/1/estado')
        .send({ estado: 'invalido' })
        .expect(400);

      expect(response.text).toContain('Estado inválido');
      expect(dbCategorias.cambiarEstadoCategoria).not.toHaveBeenCalled();
    });

    it('debería manejar error específico de productos activos con stock', async () => {
      const errorMessage = 'No se puede desactivar: hay 3 producto(s) activos con stock en esta categoría';
      dbCategorias.cambiarEstadoCategoria.mockRejectedValue(new Error(errorMessage));

      const response = await request(app)
        .patch('/categorias/1/estado')
        .send({ estado: 'inactiva' })
        .expect(400);

      expect(response.body.message).toBe(errorMessage);
    });

    it('debería manejar errores generales de base de datos', async () => {
      dbCategorias.cambiarEstadoCategoria.mockRejectedValue(new Error('General database error'));

      const response = await request(app)
        .patch('/categorias/1/estado')
        .send({ estado: 'activa' })
        .expect(500);

      expect(response.text).toContain('Error al cambiar el estado de la categoría');
    });

    it('debería rechazar estados undefined o null', async () => {
      await request(app).patch('/categorias/1/estado').send({}).expect(400);
      await request(app).patch('/categorias/1/estado').send({ estado: null }).expect(400);

      expect(dbCategorias.cambiarEstadoCategoria).not.toHaveBeenCalled();
    });
  });
});

describe('Tests unitarios para funciones del controlador', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = { body: {}, params: {} };
    mockRes = {
      render: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      sendStatus: jest.fn(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('renombrarCategoria - unitario', () => {
    it('debería extraer ID y nombre correctamente', async () => {
      mockReq.params = { id: '123' };
      mockReq.body = { nombre: 'Nombre Actualizado' };
      dbCategorias.renombrarCategoria.mockResolvedValue();

      await controladorCategorias.renombrarCategoria(mockReq, mockRes);

      expect(dbCategorias.renombrarCategoria).toHaveBeenCalledWith(
        expect.anything(),
        'Nombre Actualizado'
      );
      expect(mockRes.sendStatus).toHaveBeenCalledWith(200);
    });
  });

  describe('cambiarEstadoCategoria - unitario', () => {
    it('debería extraer ID y estado correctamente', async () => {
      mockReq.params = { id: '456' };
      mockReq.body = { estado: 'inactiva' };
      dbCategorias.cambiarEstadoCategoria.mockResolvedValue();

      await controladorCategorias.cambiarEstadoCategoria(mockReq, mockRes);

      expect(dbCategorias.cambiarEstadoCategoria).toHaveBeenCalledWith(
        expect.anything(),
        'inactiva'
      );
      expect(mockRes.sendStatus).toHaveBeenCalledWith(200);
    });
  });
});
