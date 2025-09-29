/**
 * @jest-environment node
 */

const ExcelJS = require("exceljs");

// Mock de las queries usadas por excelGenerator
jest.mock("../../model/queriesMovimientos", () => ({
  obtenerMovimientosVentas: jest.fn(),
  obtenerMovimientosEntradas: jest.fn(),
  obtenerMovimientosMermas: jest.fn(),
  obtenerMovimientosSobrantes: jest.fn(),
}));

const dbMov = require("../../model/queriesMovimientos");

// Import real del generador (después del mock)
const excelGen = require("../../utils/excelGenerator");

// Util para cargar un buffer xlsx y devolver workbook
async function loadWorkbookFromBuffer(buf) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  return wb;
}

describe("utils/excelGenerator", () => {
  beforeEach(() => jest.clearAllMocks());

  // ---------- Ventas ----------
  it("generarExcelVentas devuelve buffer XLSX con hoja y headers esperados", async () => {
    dbMov.obtenerMovimientosVentas.mockResolvedValue([
      {
        id_movimiento: 1,
        fecha: "2025-01-01T10:00:00Z",
        usuario: "Ana",
        tipo_comprobante: "boleta",
        serie: "B001",
        correlativo: "000123",
        total_venta: 100.5,
        nombre_cliente: "Juan",
        razon_social: "",
        ruc_cliente: "",
        dni_cliente: "12345678",
        direccion_cliente: "Calle 1",
        correo_cliente: "a@b.com",
        id_producto: 99,
        producto: "Café",
        cantidad: 2,
        precio_unitario: 50.25,
        subtotal: 100.5,
        descripcion: "Venta test",
      },
    ]);

    const buf = await excelGen.generarExcelVentas("2025-01-01", "2025-01-31");
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);

    const wb = await loadWorkbookFromBuffer(buf);
    const ws = wb.getWorksheet("Reporte de Ventas");
    expect(ws).toBeTruthy();

    // algunos headers clave (no todos para no volver frágil el test)
    const headers = ws.getRow(1).values.filter(Boolean);
    expect(headers).toEqual(
      expect.arrayContaining([
        "ID Movimiento",
        "Fecha de Venta",
        "Usuario",
        "Tipo Comprobante",
        "Total Venta",
        "Producto",
        "Cantidad",
        "Subtotal",
      ])
    );

    // los datos deben estar en la fila 2
    const row2 = ws.getRow(2);
    // id_movimiento
    expect(row2.getCell("A").value).toBe(1);
    // fecha: solo que sea string "legible" (no validamos formato exacto por locale)
    expect(typeof row2.getCell("B").value).toBe("string");
    // usuario
    expect(row2.getCell("C").value).toBe("Ana");
    // producto
    // la columna exacta depende de la definición, buscamos por cabecera "Producto"
    const productoCol = headers.indexOf("Producto") + 1;
    expect(row2.getCell(productoCol).value).toBe("Café");
  });

  // ---------- Entradas ----------
  it("generarExcelEntradas arma hoja 'Reporte de Entradas' con datos", async () => {
    dbMov.obtenerMovimientosEntradas.mockResolvedValue([
      {
        id_movimiento: 2,
        fecha: "2025-02-01T13:00:00Z",
        usuario: "Luis",
        descripcion: "Compra test",
        total_entrada: 80,
        id_orden: 55,
        razon_social: "Proveedor SRL",
        ruc: "20111111111",
        direccion: "Av. X",
        correo: "prov@correo.com",
        id_producto: 5,
        producto: "Azúcar",
        cantidad: 4,
        precio_unitario: 20,
        subtotal: 80,
      },
    ]);

    const buf = await excelGen.generarExcelEntradas("2025-02-01", "2025-02-28");
    const wb = await loadWorkbookFromBuffer(buf);
    const ws = wb.getWorksheet("Reporte de Entradas");
    expect(ws).toBeTruthy();

    const headers = ws.getRow(1).values.filter(Boolean);
    expect(headers).toEqual(
      expect.arrayContaining([
        "ID Movimiento",
        "Fecha",
        "Usuario",
        "Descripción Movimiento",
        "Total Entrada",
        "ID Orden",
        "Producto",
        "Cantidad",
      ])
    );

    const row2 = ws.getRow(2);
    expect(row2.getCell("A").value).toBe(2); // ID Movimiento
    expect(typeof row2.getCell("B").value).toBe("string"); // Fecha formateada
    expect(row2.getCell("C").value).toBe("Luis"); // Usuario
  });

  // ---------- Mermas ----------
  it("generarExcelMermas crea 'Reporte de Mermas' con filas", async () => {
    dbMov.obtenerMovimientosMermas.mockResolvedValue([
      {
        id_movimiento: 10,
        fecha: "2025-03-02T10:00:00Z",
        usuario: "Sofía",
        motivo: "Vencimiento",
        id_producto: 3,
        producto: "Leche",
        cantidad: 2,
        precio_unitario: 3,
        subtotal: 6,
        descripcion: "Desc",
      },
    ]);

    const buf = await excelGen.generarExcelMermas("2025-03-01", "2025-03-31");
    const wb = await loadWorkbookFromBuffer(buf);
    const ws = wb.getWorksheet("Reporte de Mermas");
    expect(ws).toBeTruthy();

    const headers = ws.getRow(1).values.filter(Boolean);
    expect(headers).toEqual(
      expect.arrayContaining(["ID Movimiento", "Fecha", "Usuario", "Motivo", "Producto", "Cantidad"])
    );

    const row2 = ws.getRow(2);
    expect(row2.getCell("A").value).toBe(10);
    expect(row2.getCell("C").value).toBe("Sofía");
    expect(row2.getCell(headers.indexOf("Motivo") + 1).value).toBe("Vencimiento");
  });

  // ---------- Sobrantes ----------
  it("generarExcelSobrantes crea 'Reporte de Sobrantes' con filas", async () => {
    dbMov.obtenerMovimientosSobrantes.mockResolvedValue([
      {
        id_movimiento: 20,
        fecha: "2025-04-02T10:00:00Z",
        usuario: "Marcos",
        motivo: "Ajuste inventario",
        id_producto: 7,
        producto: "Cacao",
        cantidad: 1,
        precio_unitario: 10,
        subtotal: 10,
        descripcion: "ok",
      },
    ]);

    const buf = await excelGen.generarExcelSobrantes("2025-04-01", "2025-04-30");
    const wb = await loadWorkbookFromBuffer(buf);
    const ws = wb.getWorksheet("Reporte de Sobrantes");
    expect(ws).toBeTruthy();

    const headers = ws.getRow(1).values.filter(Boolean);
    expect(headers).toEqual(
      expect.arrayContaining(["ID Movimiento", "Fecha", "Usuario", "Motivo", "Producto", "Cantidad"])
    );

    const row2 = ws.getRow(2);
    expect(row2.getCell("A").value).toBe(20);
    expect(row2.getCell("C").value).toBe("Marcos");
    expect(row2.getCell(headers.indexOf("Producto") + 1).value).toBe("Cacao");
  });

  // ---------- Todos ----------
  it("generarExcelTodos arma workbook con hojas Ventas/Entradas/Mermas/Sobrantes", async () => {
    dbMov.obtenerMovimientosVentas.mockResolvedValue([{ id_movimiento: 1, producto: "P1" }]);
    dbMov.obtenerMovimientosEntradas.mockResolvedValue([{ id_movimiento: 2, producto: "P2", fecha: "2025-05-01T12:00:00Z" }]);
    dbMov.obtenerMovimientosMermas.mockResolvedValue([{ id_movimiento: 3, producto: "P3", fecha: "2025-05-02T12:00:00Z" }]);
    dbMov.obtenerMovimientosSobrantes.mockResolvedValue([{ id_movimiento: 4, producto: "P4", fecha: "2025-05-03T12:00:00Z" }]);

    const buf = await excelGen.generarExcelTodos("2025-05-01", "2025-05-31");
    const wb = await loadWorkbookFromBuffer(buf);

    const wsVentas = wb.getWorksheet("Ventas");
    const wsEntradas = wb.getWorksheet("Entradas");
    const wsMermas = wb.getWorksheet("Mermas");
    const wsSobrantes = wb.getWorksheet("Sobrantes");

    expect(wsVentas && wsEntradas && wsMermas && wsSobrantes).toBeTruthy();

    // cantidad de filas = 1 header + N data
    expect(wsVentas.actualRowCount).toBe(2);
    expect(wsEntradas.actualRowCount).toBe(2);
    expect(wsMermas.actualRowCount).toBe(2);
    expect(wsSobrantes.actualRowCount).toBe(2);
  });

  // ---------- Vacíos ----------
  it("funciones devuelven XLSX válido aunque no hayan filas", async () => {
    dbMov.obtenerMovimientosVentas.mockResolvedValue([]);
    const buf = await excelGen.generarExcelVentas("2025-06-01", "2025-06-30");
    expect(Buffer.isBuffer(buf)).toBe(true);
    const wb = await loadWorkbookFromBuffer(buf);
    const ws = wb.getWorksheet("Reporte de Ventas");
    expect(ws.actualRowCount).toBe(1); // solo header
  });
});
