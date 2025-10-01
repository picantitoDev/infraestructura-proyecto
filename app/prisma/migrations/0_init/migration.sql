-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."auditoria_producto" (
    "id_auditoria" SERIAL NOT NULL,
    "id_producto" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "accion" TEXT NOT NULL,
    "campos_modificados" JSONB NOT NULL,
    "fecha" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_producto_pkey" PRIMARY KEY ("id_auditoria")
);

-- CreateTable
CREATE TABLE "public"."categoria" (
    "id_categoria" SERIAL NOT NULL,
    "nombre" VARCHAR(55) NOT NULL,
    "estado" VARCHAR(10) NOT NULL DEFAULT 'activa',

    CONSTRAINT "categoria_pkey" PRIMARY KEY ("id_categoria")
);

-- CreateTable
CREATE TABLE "public"."cliente" (
    "id_cliente" SERIAL NOT NULL,
    "nombre_cliente" VARCHAR(100),
    "razon_social" VARCHAR(100),
    "dni_cliente" VARCHAR(15),
    "ruc_cliente" VARCHAR(20),
    "direccion_cliente" VARCHAR(150),
    "correo_cliente" VARCHAR(100),

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id_cliente")
);

-- CreateTable
CREATE TABLE "public"."incidencia" (
    "id_incidencia" SERIAL NOT NULL,
    "id_movimiento" INTEGER NOT NULL,
    "descripcion_general" TEXT,
    "detalle_productos" JSONB,
    "fecha_registro" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "id_orden" INTEGER,
    "fecha" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incidencia_pkey" PRIMARY KEY ("id_incidencia")
);

-- CreateTable
CREATE TABLE "public"."movimiento" (
    "id_movimiento" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "fecha" TIMESTAMP(6) NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "movimiento_pkey" PRIMARY KEY ("id_movimiento")
);

-- CreateTable
CREATE TABLE "public"."movimiento_ajuste" (
    "id_movimiento" INTEGER NOT NULL,
    "tipo_ajuste" VARCHAR(255),
    "motivo" TEXT,

    CONSTRAINT "movimiento_ajuste_pkey" PRIMARY KEY ("id_movimiento")
);

-- CreateTable
CREATE TABLE "public"."movimiento_entrada" (
    "id_movimiento" INTEGER NOT NULL,
    "id_proveedor" INTEGER,
    "total" DECIMAL(10,2),
    "id_orden" INTEGER,

    CONSTRAINT "movimiento_entrada_pkey" PRIMARY KEY ("id_movimiento")
);

-- CreateTable
CREATE TABLE "public"."movimiento_venta" (
    "id_movimiento" INTEGER NOT NULL,
    "id_cliente" INTEGER,
    "total" DECIMAL(12,2),
    "tipo_comprobante" VARCHAR(50),
    "serie" VARCHAR(10),
    "correlativo" INTEGER,

    CONSTRAINT "movimiento_venta_pkey" PRIMARY KEY ("id_movimiento")
);

-- CreateTable
CREATE TABLE "public"."orden_reabastecimiento" (
    "id_order" SERIAL NOT NULL,
    "id_proveedor" INTEGER NOT NULL,
    "products" JSON,
    "fecha" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'en_curso',
    "id_usuario" INTEGER,

    CONSTRAINT "orden_reabastecimiento_pkey" PRIMARY KEY ("id_order")
);

-- CreateTable
CREATE TABLE "public"."producto" (
    "id_producto" SERIAL NOT NULL,
    "id_proveedor" INTEGER NOT NULL,
    "id_categoria" INTEGER NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "cantidad_minima" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL,
    "estado" VARCHAR(50),
    "precio_unitario" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "producto_pkey" PRIMARY KEY ("id_producto")
);

-- CreateTable
CREATE TABLE "public"."producto_movimiento" (
    "id_movimiento" INTEGER NOT NULL,
    "id_producto" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "precio_unitario" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "producto_movimiento_pkey" PRIMARY KEY ("id_movimiento","id_producto")
);

-- CreateTable
CREATE TABLE "public"."proveedor" (
    "id_proveedor" SERIAL NOT NULL,
    "razon_social" VARCHAR(255) NOT NULL,
    "ruc" VARCHAR(20) NOT NULL,
    "numero_telefono" VARCHAR(20),
    "correo" VARCHAR(255),
    "direccion" VARCHAR(255),

    CONSTRAINT "proveedor_pkey" PRIMARY KEY ("id_proveedor")
);

-- CreateTable
CREATE TABLE "public"."serie_comprobante" (
    "tipo_comprobante" VARCHAR(20) NOT NULL,
    "serie" VARCHAR(10),
    "ultimo_correlativo" INTEGER,

    CONSTRAINT "serie_comprobante_pkey" PRIMARY KEY ("tipo_comprobante")
);

-- CreateTable
CREATE TABLE "public"."usuarios" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "email" TEXT,
    "rol" TEXT NOT NULL,
    "reset_token" TEXT,
    "reset_token_expires" TIMESTAMP(6),
    "estado" VARCHAR(20) NOT NULL DEFAULT 'Activado',
    "nivel_acceso" VARCHAR(20) NOT NULL DEFAULT 'basico',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."usuarios"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."usuarios"("email");

-- AddForeignKey
ALTER TABLE "public"."auditoria_producto" ADD CONSTRAINT "auditoria_producto_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "public"."producto"("id_producto") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."auditoria_producto" ADD CONSTRAINT "auditoria_producto_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."incidencia" ADD CONSTRAINT "fk_movimiento" FOREIGN KEY ("id_movimiento") REFERENCES "public"."movimiento"("id_movimiento") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."incidencia" ADD CONSTRAINT "fk_orden_reabastecimiento" FOREIGN KEY ("id_orden") REFERENCES "public"."orden_reabastecimiento"("id_order") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."movimiento" ADD CONSTRAINT "fk_usuario" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."movimiento_ajuste" ADD CONSTRAINT "fk_movimiento" FOREIGN KEY ("id_movimiento") REFERENCES "public"."movimiento"("id_movimiento") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."movimiento_entrada" ADD CONSTRAINT "fk_movimiento" FOREIGN KEY ("id_movimiento") REFERENCES "public"."movimiento"("id_movimiento") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."movimiento_entrada" ADD CONSTRAINT "fk_proveedor" FOREIGN KEY ("id_proveedor") REFERENCES "public"."proveedor"("id_proveedor") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."movimiento_entrada" ADD CONSTRAINT "movimiento_entrada_id_orden_fkey" FOREIGN KEY ("id_orden") REFERENCES "public"."orden_reabastecimiento"("id_order") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."movimiento_venta" ADD CONSTRAINT "movimiento_venta_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "public"."cliente"("id_cliente") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."movimiento_venta" ADD CONSTRAINT "movimiento_venta_id_movimiento_fkey" FOREIGN KEY ("id_movimiento") REFERENCES "public"."movimiento"("id_movimiento") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."orden_reabastecimiento" ADD CONSTRAINT "fk_proveedor" FOREIGN KEY ("id_proveedor") REFERENCES "public"."proveedor"("id_proveedor") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."orden_reabastecimiento" ADD CONSTRAINT "fk_usuario" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."producto" ADD CONSTRAINT "fk_categoria" FOREIGN KEY ("id_categoria") REFERENCES "public"."categoria"("id_categoria") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."producto" ADD CONSTRAINT "fk_proveedor" FOREIGN KEY ("id_proveedor") REFERENCES "public"."proveedor"("id_proveedor") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."producto_movimiento" ADD CONSTRAINT "fk_movimiento" FOREIGN KEY ("id_movimiento") REFERENCES "public"."movimiento"("id_movimiento") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."producto_movimiento" ADD CONSTRAINT "fk_producto" FOREIGN KEY ("id_producto") REFERENCES "public"."producto"("id_producto") ON DELETE CASCADE ON UPDATE NO ACTION;

