/**
 * @jest-environment node
 */

jest.setTimeout(15000);

const { PDFDocument } = require("pdf-lib");

// --- Mock de fs.readFileSync para el logo ---
// Importante: NO referenciar variables fuera del factory.
jest.mock("fs", () => {
  const mockPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=",
    "base64"
  );
  return {
    readFileSync: jest.fn(() => mockPng),
  };
});

// Importar después de configurar el mock de fs
const pdfGen = require("../../utils/pdfGenerator");

async function loadPdf(u8) {
  return PDFDocument.load(u8);
}

describe("utils/pdfGenerator", () => {
  it("generarComprobantePDF devuelve un PDF válido (Buffer/Uint8Array) y con páginas", async () => {
    const data = [
      {
        tipo_comprobante: "boleta",
        correlativo: 23,
        serie: "B001",
        nombre_cliente: "Juan Pérez",
        dni_cliente: "12345678",
        razon_social: null,
        ruc_cliente: null,
        direccion_cliente: "Av. Siempre Viva 123",
        fecha: "2025-05-10T12:30:00Z",
        id_producto: 10,
        producto: "Café 250g",
        cantidad: 2,
        precio_unitario: "15.00",
        subtotal: "30.00",
      },
    ];

    const pdfBytes = await pdfGen.generarComprobantePDF(data);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(0);

    const pdf = await loadPdf(pdfBytes);
    expect(pdf.getPageCount()).toBeGreaterThan(0);
  });

  it("crearOrdenReposicionPDF devuelve un PDF válido con páginas", async () => {
    const dataProducto = {
      id_producto: 1,
      nombre: "Cacao Premium",
      proveedor_nombre: "Proveedor SAC",
      cantidad_minima: 5,
      stock: 2,
      usuarioResponsable: { username: "tester" },
    };

    const out = await pdfGen.crearOrdenReposicionPDF(dataProducto);
    expect(out).toBeInstanceOf(Uint8Array);
    expect(out.length).toBeGreaterThan(0);

    const pdf = await loadPdf(out);
    expect(pdf.getPageCount()).toBeGreaterThan(0);
  });

  it("generarOrdenPDF devuelve un PDF válido con páginas", async () => {
    const orderData = {
      id_order: 123,
      proveedor: "Proveedor XYZ",
      fecha: new Date("2025-06-15T10:00:00Z").toISOString(),
      estado: "en_curso",
      products: [
        { nombre: "Azúcar", categoria: "Insumos", cantidad: 3 },
        { nombre: "Café", categoria: "Insumos", cantidad: 2 },
      ],
    };

    const out = await pdfGen.generarOrdenPDF(orderData);
    expect(out).toBeInstanceOf(Uint8Array);
    expect(out.length).toBeGreaterThan(0);

    const pdf = await loadPdf(out);
    expect(pdf.getPageCount()).toBeGreaterThan(0);
  });

  it("generarPDFIncidencia devuelve un PDF válido con páginas", async () => {
    const incidencia = {
      id_incidencia: 999,
      fecha_registro: "2025-06-20T08:00:00Z",
      fecha: "2025-06-19T12:00:00Z",
      id_movimiento: 42,
      id_orden: 777,
      descripcion_general:
        "Caja dañada en el transporte. 2 unidades con empaques rotos.",
      detalle_productos: [
        { nombre: "Cacao Premium", cantidad: 2, incidencia: "Empaque roto" },
        { nombre: "Azúcar 1kg", cantidad: 1, incidencia: "Humedad" },
      ],
    };

    const out = await pdfGen.generarPDFIncidencia(incidencia);
    expect(out).toBeInstanceOf(Uint8Array);
    expect(out.length).toBeGreaterThan(0);

    const pdf = await loadPdf(out);
    expect(pdf.getPageCount()).toBeGreaterThan(0);
  });
});
