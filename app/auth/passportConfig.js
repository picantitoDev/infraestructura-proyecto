const passport = require("passport")
const LocalStrategy = require("passport-local").Strategy
const bcrypt = require("bcryptjs")
const dbUsuarios = require("../model/queriesUsuarios")

passport.use(
  new LocalStrategy(async (usernameOrEmail, password, done) => {
    try {
      const user = await dbUsuarios.buscarUsuarioPorNombreOCorreo(
        usernameOrEmail
      )
      if (!user)
        return done(null, false, { message: "Usuario o correo incorrecto" })

      if (user.estado && user.estado.toLowerCase() !== "activado") {
        return done(null, false, { message: "Este usuario está desactivado" });
      }

      const match = await bcrypt.compare(password, user.password)
      if (!match) return done(null, false, { message: "Contraseña incorrecta" })

      console.log('🔑 Login attempt:', usernameOrEmail);
      console.log('Password match:', match);

      return done(null, user)
    } catch (err) {
      return done(err)
    }
  })
)

passport.serializeUser((user, done) => done(null, user.id))

passport.deserializeUser(async (id, done) => {
  try {
    console.log("🔁 Deserializing user ID:", id)
    const user = await dbUsuarios.buscarUsuarioPorId(id)
    if (!user) console.log("⚠️ Usuario no encontrado en DB durante deserialización")
    else console.log("✅ Usuario deserializado:", user.username)
    done(null, user)
  } catch (err) {
    console.error("❌ Error deserializando usuario:", err)
    done(err)
  }
})

module.exports = passport
