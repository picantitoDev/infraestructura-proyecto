const bcrypt = require("bcryptjs")
const dbUsuarios = require("../model/queriesUsuarios")
const dbAuditoria = require("../model/queriesAuditoria") 

async function crearUsuarioGet(req, res) {
  try {
    const usuarios = await dbUsuarios.obtenerUsuarios()
    res.render("crearUsuario", { usuarios })
  } catch (error) {
    console.error("Error al cargar formulario:", error)
    res.status(500).send("Error al cargar formulario")
  }
}

const crearUsuarioPost = async (req, res, next) => {
  try {
    const { username, password, email, rol } = req.body
    console.log(username)
    console.log(password)
    console.log(email)
    console.log(rol)
    // Validación simple
    if (
      !username?.trim() ||
      !password?.trim() ||
      !email?.trim() ||
      !rol?.trim()
    ) {
      return res.status(400).send("Faltan campos obligatorios");
    }

    // Verifica si el usuario ya existe
    const usuarioExistente = await dbUsuarios.buscarUsuarioPorNombre(username)
    if (usuarioExistente) {
      return res.status(409).send("El nombre de usuario ya está en uso.")
    }

    const emailExistente = await dbUsuarios.buscarUsuarioPorEmail(email)
    if (emailExistente) {
      return res.status(409).send("El correo electrónico ya está en uso.")
    }

    // Encripta la contraseña
    const hashedPassword = await bcrypt.hash(password, 10)

    // Crea el usuario en la base de datos
    await dbUsuarios.crearUsuario({
      username,
      password: hashedPassword,
      email,
      rol,
    })

    res.redirect("/usuarios")
  } catch (error) {
    next(error)
  }
}

const obtenerUsuarios = async (req, res) => {
  try {
    const usuarios = await dbUsuarios.obtenerUsuarios()
    const auditorias = await dbAuditoria.obtenerAuditoriasConUsuarios() // nueva función

    res.render("usuarios", { usuarios, auditorias, user: req.user })
  } catch (error) {
    console.error("Error al obtener usuarios o auditorías:", error)
    res.status(500).send("Error al obtener los datos de usuarios")
  }
}


async function editarUsuarioGet(req, res) {
  try {
    const id = req.params.id;
    const usuarios = await dbUsuarios.obtenerUsuarios()
    const usuario = await dbUsuarios.buscarUsuarioPorId(id);

    if (!usuario) return res.status(404).send("Usuario no encontrado");

    res.render("editarUsuario", { usuario, usuarios, usuarioActual: req.user, });
  } catch (error) {
    console.error("Error al cargar edición de usuario:", error);
    res.status(500).send("Error interno");
  }
}

async function editarUsuarioPost(req, res) {
  try {
    const id = req.params.id;
    const { username, email, rol, estado } = req.body;

    await dbUsuarios.actualizarUsuario(id, { username, email, rol, estado });

    res.redirect("/usuarios");
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).send("Error al actualizar usuario");
  }
}


module.exports = {
  crearUsuarioPost,
  obtenerUsuarios,
  crearUsuarioGet,
  editarUsuarioGet,
  editarUsuarioPost
}
