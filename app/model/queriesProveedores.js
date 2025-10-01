const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Obtener todos los proveedores
async function obtenerProveedores() {
  return await prisma.proveedor.findMany({
    orderBy: { id_proveedor: 'asc' }
  })
}

// Insertar proveedor
async function insertarProveedor({ razon_social, ruc, numero_telefono, correo, direccion }) {
  await prisma.proveedor.create({
    data: { razon_social, ruc, numero_telefono, correo, direccion }
  })
}

// Obtener proveedor por ID
async function obtenerProveedorPorId(id) {
  return await prisma.proveedor.findUnique({
    where: { id_proveedor: id }
  })
}

// Actualizar proveedor
async function actualizarProveedor(id, datos) {
  const { razon_social, ruc, numero_telefono, correo, direccion } = datos
  await prisma.proveedor.update({
    where: { id_proveedor: id },
    data: { razon_social, ruc, numero_telefono, correo, direccion }
  })
}

module.exports = {
  obtenerProveedores,
  insertarProveedor,
  obtenerProveedorPorId,
  actualizarProveedor
}
