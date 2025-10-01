const ExcelJS = require("exceljs")
const dbMovimientos = require("../model/queriesMovimientos")

async function generarExcelVentas(desde, hasta) {
  const rows = await dbMovimientos.obtenerMovimientosVentas(desde, hasta);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reporte de Ventas');

  worksheet.columns = [
    { header: 'ID Movimiento', key: 'id_movimiento', width: 15 },
    { header: 'Fecha de Venta', key: 'fecha', width: 20 },
    { header: 'Usuario', key: 'usuario', width: 20 },
    { header: 'Tipo Comprobante', key: 'tipo_comprobante', width: 20 },
    { header: 'Serie', key: 'serie', width: 10 },
    { header: 'Correlativo', key: 'correlativo', width: 15 },
    { header: 'Total Venta', key: 'total_venta', width: 15 },
    { header: 'Cliente - Nombre', key: 'nombre_cliente', width: 25 },
    { header: 'Cliente - Razón Social', key: 'razon_social', width: 25 },
    { header: 'Cliente - RUC', key: 'ruc_cliente', width: 18 },
    { header: 'Cliente - DNI', key: 'dni_cliente', width: 18 },
    { header: 'Cliente - Dirección', key: 'direccion_cliente', width: 30 },
    { header: 'Cliente - Correo', key: 'correo_cliente', width: 25 },
    { header: 'ID Producto', key: 'id_producto', width: 15 },
    { header: 'Producto', key: 'producto', width: 30 },
    { header: 'Cantidad', key: 'cantidad', width: 10 },
    { header: 'Precio Unitario', key: 'precio_unitario', width: 15 },
    { header: 'Subtotal', key: 'subtotal', width: 15 },
    { header: 'Descripción Movimiento', key: 'descripcion', width: 30 }
  ];

  rows.forEach(row => {
    worksheet.addRow({
      ...row,
      fecha: new Date(row.fecha).toLocaleString('es-PE') // formato legible
    });
  });

  return workbook.xlsx.writeBuffer();
}

async function generarExcelEntradas(desde, hasta) {
  const rows = await dbMovimientos.obtenerMovimientosEntradas(desde, hasta);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reporte de Entradas');

  worksheet.columns = [
    { header: 'ID Movimiento', key: 'id_movimiento', width: 15 },
    { header: 'Fecha', key: 'fecha', width: 20 },
    { header: 'Usuario', key: 'usuario', width: 20 },
    { header: 'Descripción Movimiento', key: 'descripcion', width: 30 },
    { header: 'Total Entrada', key: 'total_entrada', width: 15 },
    { header: 'ID Orden', key: 'id_orden', width: 12 },
    { header: 'Proveedor - Razón Social', key: 'razon_social', width: 25 },
    { header: 'Proveedor - RUC', key: 'ruc', width: 15 },
    { header: 'Proveedor - Dirección', key: 'direccion', width: 30 },
    { header: 'Proveedor - Correo', key: 'correo', width: 25 },
    { header: 'ID Producto', key: 'id_producto', width: 12 },
    { header: 'Producto', key: 'producto', width: 30 },
    { header: 'Cantidad', key: 'cantidad', width: 10 },
    { header: 'Precio Unitario', key: 'precio_unitario', width: 15 },
    { header: 'Subtotal', key: 'subtotal', width: 15 }
  ];

  rows.forEach(row => {
    worksheet.addRow({
      ...row,
      fecha: new Date(row.fecha).toLocaleString('es-PE') // formato legible
    });
  });

  return workbook.xlsx.writeBuffer();
}

async function generarExcelMermas(desde, hasta) {
  const rows = await dbMovimientos.obtenerMovimientosMermas(desde, hasta);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reporte de Mermas');

  worksheet.columns = [
    { header: 'ID Movimiento', key: 'id_movimiento', width: 15 },
    { header: 'Fecha', key: 'fecha', width: 20 },
    { header: 'Usuario', key: 'usuario', width: 20 },
    { header: 'Motivo', key: 'motivo', width: 30 },
    { header: 'ID Producto', key: 'id_producto', width: 12 },
    { header: 'Producto', key: 'producto', width: 25 },
    { header: 'Cantidad', key: 'cantidad', width: 12 },
    { header: 'Precio Unitario', key: 'precio_unitario', width: 15 },
    { header: 'Subtotal', key: 'subtotal', width: 15 },
    { header: 'Descripción', key: 'descripcion', width: 30 },
  ];

  rows.forEach(row => {
    worksheet.addRow({
      ...row,
      fecha: new Date(row.fecha).toLocaleString('es-PE'),
    });
  });

  return workbook.xlsx.writeBuffer();
}

async function generarExcelSobrantes(desde, hasta) {
  const rows = await dbMovimientos.obtenerMovimientosSobrantes(desde, hasta);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reporte de Sobrantes');

  worksheet.columns = [
    { header: 'ID Movimiento', key: 'id_movimiento', width: 15 },
    { header: 'Fecha', key: 'fecha', width: 20 },
    { header: 'Usuario', key: 'usuario', width: 20 },
    { header: 'Motivo', key: 'motivo', width: 30 },
    { header: 'ID Producto', key: 'id_producto', width: 12 },
    { header: 'Producto', key: 'producto', width: 25 },
    { header: 'Cantidad', key: 'cantidad', width: 12 },
    { header: 'Precio Unitario', key: 'precio_unitario', width: 15 },
    { header: 'Subtotal', key: 'subtotal', width: 15 },
    { header: 'Descripción', key: 'descripcion', width: 30 },
  ];

  rows.forEach(row => {
    worksheet.addRow({
      ...row,
      fecha: new Date(row.fecha).toLocaleString('es-PE'),
    });
  });

  return workbook.xlsx.writeBuffer();
}

async function generarExcelTodos(desde, hasta) {
  const [
    ventas,
    entradas,
    mermas,
    sobrantes
  ] = await Promise.all([
    dbMovimientos.obtenerMovimientosVentas(desde, hasta),
    dbMovimientos.obtenerMovimientosEntradas(desde, hasta),
    dbMovimientos.obtenerMovimientosMermas(desde, hasta),
    dbMovimientos.obtenerMovimientosSobrantes(desde, hasta)
  ]);

  const workbook = new ExcelJS.Workbook();

  // --- Ventas ---
  const hojaVentas = workbook.addWorksheet('Ventas');
  hojaVentas.columns = [
    { header: 'ID Movimiento', key: 'id_movimiento', width: 15 },
    { header: 'Fecha de Venta', key: 'fecha', width: 20 },
    { header: 'Usuario', key: 'usuario', width: 20 },
    { header: 'Tipo Comprobante', key: 'tipo_comprobante', width: 20 },
    { header: 'Serie', key: 'serie', width: 10 },
    { header: 'Correlativo', key: 'correlativo', width: 15 },
    { header: 'Total Venta', key: 'total_venta', width: 15 },
    { header: 'Cliente - Nombre', key: 'nombre_cliente', width: 25 },
    { header: 'Cliente - Razón Social', key: 'razon_social', width: 25 },
    { header: 'Cliente - RUC', key: 'ruc_cliente', width: 18 },
    { header: 'Cliente - DNI', key: 'dni_cliente', width: 18 },
    { header: 'Cliente - Dirección', key: 'direccion_cliente', width: 30 },
    { header: 'Cliente - Correo', key: 'correo_cliente', width: 25 },
    { header: 'ID Producto', key: 'id_producto', width: 15 },
    { header: 'Producto', key: 'producto', width: 30 },
    { header: 'Cantidad', key: 'cantidad', width: 10 },
    { header: 'Precio Unitario', key: 'precio_unitario', width: 15 },
    { header: 'Subtotal', key: 'subtotal', width: 15 },
    { header: 'Descripción Movimiento', key: 'descripcion', width: 30 }
  ];
  ventas.forEach(row => hojaVentas.addRow(row));

  // --- Entradas ---
  const hojaEntradas = workbook.addWorksheet('Entradas');
  hojaEntradas.columns = [
    { header: 'ID Movimiento', key: 'id_movimiento', width: 15 },
    { header: 'Fecha', key: 'fecha', width: 20 },
    { header: 'Usuario', key: 'usuario', width: 20 },
    { header: 'Descripción Movimiento', key: 'descripcion', width: 30 },
    { header: 'Total Entrada', key: 'total_entrada', width: 15 },
    { header: 'ID Orden', key: 'id_orden', width: 12 },
    { header: 'Proveedor - Razón Social', key: 'razon_social', width: 25 },
    { header: 'Proveedor - RUC', key: 'ruc', width: 15 },
    { header: 'Proveedor - Dirección', key: 'direccion', width: 30 },
    { header: 'Proveedor - Correo', key: 'correo', width: 25 },
    { header: 'ID Producto', key: 'id_producto', width: 12 },
    { header: 'Producto', key: 'producto', width: 30 },
    { header: 'Cantidad', key: 'cantidad', width: 10 },
    { header: 'Precio Unitario', key: 'precio_unitario', width: 15 },
    { header: 'Subtotal', key: 'subtotal', width: 15 }
  ];
  entradas.forEach(row => {
    hojaEntradas.addRow({
      ...row,
      fecha: new Date(row.fecha).toLocaleString('es-PE')
    });
  });

  // --- Mermas ---
  const hojaMermas = workbook.addWorksheet('Mermas');
  hojaMermas.columns = [
    { header: 'ID Movimiento', key: 'id_movimiento', width: 15 },
    { header: 'Fecha', key: 'fecha', width: 20 },
    { header: 'Usuario', key: 'usuario', width: 20 },
    { header: 'Motivo', key: 'motivo', width: 30 },
    { header: 'ID Producto', key: 'id_producto', width: 12 },
    { header: 'Producto', key: 'producto', width: 25 },
    { header: 'Cantidad', key: 'cantidad', width: 12 },
    { header: 'Precio Unitario', key: 'precio_unitario', width: 15 },
    { header: 'Subtotal', key: 'subtotal', width: 15 },
    { header: 'Descripción', key: 'descripcion', width: 30 },
  ];
  mermas.forEach(row => {
    hojaMermas.addRow({
      ...row,
      fecha: new Date(row.fecha).toLocaleString('es-PE')
    });
  });

  // --- Sobrantes ---
  const hojaSobrantes = workbook.addWorksheet('Sobrantes');
  hojaSobrantes.columns = [
    { header: 'ID Movimiento', key: 'id_movimiento', width: 15 },
    { header: 'Fecha', key: 'fecha', width: 20 },
    { header: 'Usuario', key: 'usuario', width: 20 },
    { header: 'Motivo', key: 'motivo', width: 30 },
    { header: 'ID Producto', key: 'id_producto', width: 12 },
    { header: 'Producto', key: 'producto', width: 25 },
    { header: 'Cantidad', key: 'cantidad', width: 12 },
    { header: 'Precio Unitario', key: 'precio_unitario', width: 15 },
    { header: 'Subtotal', key: 'subtotal', width: 15 },
    { header: 'Descripción', key: 'descripcion', width: 30 },
  ];
  sobrantes.forEach(row => {
    hojaSobrantes.addRow({
      ...row,
      fecha: new Date(row.fecha).toLocaleString('es-PE')
    });
  });

  return workbook.xlsx.writeBuffer();
}


module.exports = {
    generarExcelVentas,
    generarExcelEntradas,
    generarExcelMermas,
    generarExcelSobrantes,
    generarExcelTodos
}