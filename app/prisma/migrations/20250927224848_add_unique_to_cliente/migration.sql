/*
  Warnings:

  - A unique constraint covering the columns `[dni_cliente]` on the table `cliente` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ruc_cliente]` on the table `cliente` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "cliente_dni_cliente_key" ON "public"."cliente"("dni_cliente");

-- CreateIndex
CREATE UNIQUE INDEX "cliente_ruc_cliente_key" ON "public"."cliente"("ruc_cliente");
