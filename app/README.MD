# 📦 Sistema de Gestión de Inventario

Este proyecto es un **sistema de gestión de inventario** desarrollado con **Node.js, Express y Prisma**. Permite administrar productos, usuarios y operaciones relacionadas con inventarios de manera eficiente y escalable.  

## 🚀 Características principales

- Gestión de productos, categorías y stock.  
- Autenticación y autorización con **Passport (estrategia local)**.  
- Seguridad con **CSRF tokens** y **bcryptjs** para contraseñas.  
- Generación de reportes en **PDF** y **Excel**.  
- Programación de tareas automáticas con **node-cron**.  
- Persistencia de datos con **PostgreSQL** y **Prisma ORM**.  
- Sesiones de usuario con **express-session** y almacenamiento en PostgreSQL.  
- Sistema de notificaciones por correo con **Nodemailer**.  
- Vistas dinámicas con **EJS y express-ejs-layouts**.  
- Logging centralizado con **Winston**.  

---

## 📂 Estructura del proyecto (referencial)

```
agile-dev/
│── app.js              # Punto de entrada de la aplicación
│── prisma/             # Esquemas y migraciones de la base de datos
│── controllers/        # Lógica de negocio
│── routes/             # Rutas de la aplicación
│── views/              # Plantillas EJS
│── public/             # Archivos estáticos (CSS, JS, imágenes)
│── tests/              # Pruebas con Jest + Supertest
│── .env                # Variables de entorno
│── package.json
```

---

## ⚙️ Requisitos previos

- [Node.js](https://nodejs.org/) v18+  
- [PostgreSQL](https://www.postgresql.org/)  
- [Prisma CLI](https://www.prisma.io/docs/getting-started)  

---

## 📦 Instalación

1. Clonar el repositorio:

   ```bash
   git clone https://github.com/tuusuario/agile-dev.git
   cd agile-dev
   ```

2. Instalar dependencias:

   ```bash
   npm install
   ```

3. Configurar variables de entorno en un archivo **.env**:

   ```env
   DATABASE_URL="postgresql://usuario:password@localhost:5432/agiledev"
   SESSION_SECRET="clave-secreta"
   EMAIL_HOST="smtp.tuemail.com"
   EMAIL_USER="usuario@tuemail.com"
   EMAIL_PASS="password"
   ```

4. Ejecutar migraciones de base de datos:

   ```bash
   npx prisma migrate dev
   ```

---

## ▶️ Uso

- Iniciar en modo desarrollo:

  ```bash
  npm start
  ```

- Acceder a la aplicación en: [http://localhost:3000](http://localhost:3000)

---

## 🧪 Pruebas

El proyecto utiliza **Jest** y **Supertest** para pruebas unitarias e integrales.

- Ejecutar pruebas:

  ```bash
  npm test
  ```

- Ejecutar en modo watch:

  ```bash
  npm run test:watch
  ```

- Generar reporte de cobertura:

  ```bash
  npm run test:coverage
  ```

Los reportes de cobertura se almacenan en la carpeta `/coverage`.

---

## 📊 Tecnologías usadas

- **Backend:** Node.js, Express  
- **ORM:** Prisma  
- **Base de datos:** PostgreSQL  
- **Autenticación:** Passport.js  
- **Vistas:** EJS + Layouts  
- **Reportes:** pdf-lib, pdfkit, exceljs  
- **Email:** Nodemailer  
- **Pruebas:** Jest, Supertest  
- **Logging:** Winston  

---

## 📄 Licencia

Este proyecto está bajo la licencia **ISC**.  
