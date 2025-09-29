const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Buscar usuario por username
const buscarUsuarioPorNombre = async (nombre) => {
  try {
    return await prisma.usuarios.findUnique({
      where: { username: nombre }
    })
  } catch (error) {
    console.error('Error al buscar usuario por nombre:', error)
    throw error
  }
}

// Buscar usuario por email
const buscarUsuarioPorEmail = async (email) => {
  try {
    return await prisma.usuarios.findUnique({
      where: { email }
    })
  } catch (error) {
    console.error('Error al buscar usuario por email:', error)
    throw error
  }
}

// Obtener todos los usuarios
async function obtenerUsuarios() {
  try {
    return await prisma.usuarios.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        username: true,
        email: true,
        rol: true,
        estado: true,
        nivel_acceso: true
        // Excluimos password por seguridad
      }
    })
  } catch (error) {
    console.error('Error al obtener usuarios:', error)
    throw error
  }
}

// Buscar por username o email
const buscarUsuarioPorNombreOCorreo = async (input) => {
  try {
    return await prisma.usuarios.findFirst({
      where: {
        OR: [
          { username: input },
          { email: input }
        ]
      }
    })
  } catch (error) {
    console.error('Error al buscar usuario por nombre o correo:', error)
    throw error
  }
}

// Buscar por ID
const buscarUsuarioPorId = async (id) => {
  try {
    // Convertir a número si viene como string
    const userId = parseInt(id)
    if (isNaN(userId)) {
      throw new Error('ID de usuario inválido')
    }
    
    return await prisma.usuarios.findUnique({
      where: { id: userId }
    })
  } catch (error) {
    console.error('Error al buscar usuario por ID:', error)
    throw error
  }
}

// Crear usuario
const crearUsuario = async ({ username, password, email, rol, nivel_acceso = 'basico', estado = 'Activado' }) => {
  try {
    return await prisma.usuarios.create({
      data: {
        username,
        password,
        email,
        rol,
        nivel_acceso,
        estado
      },
      select: {
        id: true,
        username: true,
        email: true,
        rol: true,
        estado: true,
        nivel_acceso: true
        // No devolvemos password por seguridad
      }
    })
  } catch (error) {
    console.error('Error al crear usuario:', error)
    throw error
  }
}

// Actualizar usuario
async function actualizarUsuario(id, { username, email, rol, estado, nivel_acceso }) {
  try {
    // Convertir a número si viene como string
    const userId = parseInt(id)
    if (isNaN(userId)) {
      throw new Error('ID de usuario inválido')
    }

    // Filtrar campos undefined para evitar sobrescribir con null
    const dataToUpdate = {}
    if (username !== undefined) dataToUpdate.username = username
    if (email !== undefined) dataToUpdate.email = email
    if (rol !== undefined) dataToUpdate.rol = rol
    if (estado !== undefined) dataToUpdate.estado = estado
    if (nivel_acceso !== undefined) dataToUpdate.nivel_acceso = nivel_acceso

    return await prisma.usuarios.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        username: true,
        email: true,
        rol: true,
        estado: true,
        nivel_acceso: true
      }
    })
  } catch (error) {
    console.error('Error al actualizar usuario:', error)
    throw error
  }
}

// Guardar token y expiración
const guardarTokenDeReset = async (id, token, expires) => {
  try {
    // Convertir a número si viene como string
    const userId = parseInt(id)
    if (isNaN(userId)) {
      throw new Error('ID de usuario inválido')
    }

    // Asegurar que expires sea un objeto Date válido
    let expirationDate
    if (expires instanceof Date) {
      expirationDate = expires
    } else if (typeof expires === 'string' || typeof expires === 'number') {
      expirationDate = new Date(expires)
    } else {
      throw new Error('Fecha de expiración inválida')
    }

    if (isNaN(expirationDate.getTime())) {
      throw new Error('Fecha de expiración inválida')
    }

    return await prisma.usuarios.update({
      where: { id: userId },
      data: {
        reset_token: token,
        reset_token_expires: expirationDate
      }
    })
  } catch (error) {
    console.error('Error al guardar token de reset:', error)
    throw error
  }
}

// Buscar usuario por token válido (no vencido)
const buscarUsuarioPorToken = async (token) => {
  try {
    if (!token) {
      throw new Error('Token requerido')
    }

    return await prisma.usuarios.findFirst({
      where: {
        reset_token: token,
        reset_token_expires: {
          gt: new Date() // Mayor que la fecha actual
        }
      }
    })
  } catch (error) {
    console.error('Error al buscar usuario por token:', error)
    throw error
  }
}

// Restablecer contraseña y limpiar token
const actualizarPasswordYLimpiarToken = async (id, newPassword) => {
  try {
    // Convertir a número si viene como string
    const userId = parseInt(id)
    if (isNaN(userId)) {
      throw new Error('ID de usuario inválido')
    }

    if (!newPassword) {
      throw new Error('Nueva contraseña requerida')
    }

    return await prisma.usuarios.update({
      where: { id: userId },
      data: {
        password: newPassword,
        reset_token: null,
        reset_token_expires: null
      },
      select: {
        id: true,
        username: true,
        email: true
      }
    })
  } catch (error) {
    console.error('Error al actualizar contraseña:', error)
    throw error
  }
}

// Función para cerrar conexión Prisma (útil en tests o al cerrar app)
const cerrarConexion = async () => {
  await prisma.$disconnect()
}

module.exports = {
  buscarUsuarioPorNombre,
  buscarUsuarioPorEmail,
  obtenerUsuarios,
  buscarUsuarioPorNombreOCorreo,
  buscarUsuarioPorId,
  crearUsuario,
  actualizarUsuario,
  guardarTokenDeReset,
  buscarUsuarioPorToken,
  actualizarPasswordYLimpiarToken,
  cerrarConexion
}
