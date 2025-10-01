const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function registrarCliente({
  nombre_cliente,
  razon_social,
  dni_cliente,
  ruc_cliente,
  direccion_cliente,
  correo_cliente,
}) {
  const cliente = await prisma.cliente.create({
    data: {
      nombre_cliente,
      razon_social,
      dni_cliente,
      ruc_cliente,
      direccion_cliente,
      correo_cliente,
    },
    select: {
      id_cliente: true, // para devolver solo el id
    },
  })

  return cliente.id_cliente
}

async function buscarPorDNI(dni) {
  return await prisma.cliente.findUnique({
    where: { dni_cliente: dni },
  })
}

async function buscarPorRUC(ruc) {
  return await prisma.cliente.findUnique({
    where: { ruc_cliente: ruc },
  })
}

async function actualizarDatosContacto(id_cliente, { correo_cliente, direccion_cliente }) {
  await prisma.cliente.update({
    where: { id_cliente },
    data: {
      correo_cliente,
      direccion_cliente,
    },
  })
}

module.exports = {
  registrarCliente,
  buscarPorDNI,
  buscarPorRUC,
  actualizarDatosContacto,
}
