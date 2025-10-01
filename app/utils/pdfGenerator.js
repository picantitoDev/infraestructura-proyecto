const PDFLib = require("pdf-lib")
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require("fs")
const { DateTime } = require("luxon")

async function generarComprobantePDF(data) {
  const { PDFDocument, rgb, StandardFonts } = PDFLib

  // Create a new PDF document
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842]) // A4 size
  const { width, height } = page.getSize()

  // Load fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Colors
  const blueColor = rgb(0, 0.2, 0.6)
  const blackColor = rgb(0, 0, 0)

  // Logo (Blue Square Placeholder)
  const pngImageBytes = fs.readFileSync("public/stockLogo.png")
  const pngImage = await pdfDoc.embedPng(pngImageBytes)
  const pngDims = pngImage.scale(0.5) // Scale to 50% of original size, adjust as needed

  // Draw the image
  page.drawImage(pngImage, {
    x: 40,
    y: height - 100, // Adjust y-coordinate to account for image height
    width: pngDims.width,
    height: pngDims.height,
  })

  // Stock Cloud Title
  page.drawText("BRAVO S.A.C", {
    x: 135,
    y: height - 60,
    size: 18,
    font: fontBold,
    color: blueColor,
  })

  // Subtitle
  page.drawText("Teléfono 993767893 Chimbote-Perú", {
    x: 135,
    y: height - 80,
    size: 10,
    font,
  })

  page.drawText("Urb. Nicolas Garatea Mz. 75, Chimbote 02710", {
    x: 135,
    y: height - 95,
    size: 10,
    font,
  })

  const rectX = width - 250 // Left position of the rectangle
  const rectY = height - 100 // Top position of the rectangle
  const rectWidth = 210 // Width of the rectangle
  const rectHeight = 80 // Height of the rectangle

  // Calculate the horizontal center position of the rectangle
  const centerX = rectX + rectWidth / 2

  // Adjust the vertical spacing (reduce the line height)
  const lh = rectHeight / 3.5 // Decreased the spacing to bring the text closer

  // Padding at the top of the rectangle
  const paddingTop = 5 // Adjust this value for more or less padding

  // Draw the rectangle (Boleta Box)
  page.drawRectangle({
    x: rectX,
    y: rectY,
    width: rectWidth,
    height: rectHeight,
    borderColor: blackColor,
    borderWidth: 1,
  })

  console.log("Data: " + data[0])
  const tipoComprobante =
    data[0].tipo_comprobante === "boleta" ? "BOLETA" : "FACTURA"

  // Asegúrate de que el correlativo tenga 8 dígitos (relleno con ceros a la izquierda)
  const correlativoFormateado = String(data[0].correlativo).padStart(8, "0")

  // Ejemplo: B001-00002345
  const numeroComprobante = `${data[0].serie}-${correlativoFormateado}`

  const texts = [
    "R.U.C. No. 20610557113",
    `${tipoComprobante} DE VENTA ELECTRONICA`,
    numeroComprobante,
  ]

  // Draw each line of text, centered horizontally and evenly spaced vertically
  texts.forEach((text, index) => {
    const textWidth = fontBold.widthOfTextAtSize(text, 10) // Calculate text width for centering
    const xPos = centerX - textWidth / 2 // Center the text horizontally
    const yPos = rectY + rectHeight - (index + 1) * lh + lh / 2 + paddingTop // Evenly space the text vertically with top padding

    page.drawText(text, {
      x: xPos,
      y: yPos - 11.5,
      size: 10,
      font: fontBold,
    })
  })

  // Data formateada

  const clientePlaceholder =
    data[0].tipo_comprobante === "boleta" ? "SEÑOR(ES):" : "RAZÓN SOCIAL:"

  const documentoPlaceholder =
    data[0].tipo_comprobante === "boleta" ? "DNI:" : "RUC:"

  const cliente =
    data[0].tipo_comprobante === "boleta"
      ? data[0].nombre_cliente
      : data[0].razon_social

  const documento =
    data[0].tipo_comprobante === "boleta"
      ? data[0].dni_cliente
      : data[0].ruc_cliente

  const isoDate = data[0].fecha
  const date = new Date(isoDate)

  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0") // los meses van de 0 a 11
  const year = date.getFullYear()

  const fechaFormateada = `${day}/${month}/${year}`

  const direccion = data[0].direccion_cliente
  // Customer Data
  const customerInfo = [
    { label: `${clientePlaceholder}`, value: `${cliente}` },
    { label: `${documentoPlaceholder}`, value: `${documento}` },
    { label: "FECHA EMISIÓN:", value: `${fechaFormateada}` },
    { label: "DIRECCIÓN:", value: `${direccion}` },
    { label: "TIPO MONEDA:", value: "PEN" },
  ]

  let startY = height - 140
  customerInfo.forEach((item) => {
    page.drawText(item.label, { x: 50, y: startY, size: 10, font: fontBold })
    page.drawText(item.value, { x: 150, y: startY, size: 10, font })
    startY -= 20
  })

  // Table Headers
  const tableStartY = startY - 30
  const colX = [50, 120, 280, 360, 470]

  const headers = [
    "CODIGO",
    "DESCRIPCION",
    "CANTIDAD",
    "PRECIO UNITARIO",
    "PRECIO VENTA",
  ]

  // Blue background for the header with white text
  page.drawRectangle({
    x: colX[0] - 5, // Adding padding to the left
    y: tableStartY - 5, // Adding padding to the top
    width: colX[colX.length - 1] + 35, // Adding padding to the right
    height: 20, // Height of the header
    color: rgb(0.11764705882, 0.16470588235, 0.52549019607), // Blue color
    borderColor: rgb(0, 0, 0), // Black border
    borderWidth: 0.5, // Thin border (0.5 points)
  })

  for (let i = 0; i < colX.length; i++) {
    // Skip the first column's left border as it's already part of the rectangle
    if (i > 0) {
      page.drawLine({
        start: { x: colX[i] - 5, y: tableStartY - 5 },
        end: { x: colX[i] - 5, y: tableStartY + 15 }, // 20px height
        thickness: 0.5,
        color: rgb(0, 0, 0), // Black line
      })
    }
  }

  headers.forEach((text, i) => {
    let xPosition = colX[i]

    // For columns 3, 4, and 5 (indices 2, 3, 4), move text to the right
    if (i === 2) {
      xPosition = colX[i] + 7 // Add 15 points to move right
    }

    page.drawText(text, {
      x: xPosition,
      y: tableStartY,
      size: 10,
      font: fontBold,
      color: rgb(1, 1, 1), // White text color
      borderColor: rgb(0, 0, 0), // Black border
      borderWidth: 0.5, // Thin border (0.5 points)
    })
  })

  // Table Rows
  const products = data.map((item, index) => [
    `PROD${String(item.id_producto).padStart(3, "0")}`,
    item.producto,
    item.cantidad.toString(),
    `S/ ${parseFloat(item.precio_unitario).toFixed(2)}`,
    `S/ ${parseFloat(item.subtotal).toFixed(2)}`,
  ])

  const total = data.reduce((sum, item) => sum + parseFloat(item.subtotal), 0)
  products.push(["", "", "", "TOTAL", `S/ ${total.toFixed(2)}`])

  // Loop through each product and add to the table
  let rowY = tableStartY - 20
  products.forEach((row, rowIndex) => {
    if (
      rowIndex === products.length - 1 &&
      data[0].tipo_comprobante === "factura"
    ) {
      const totalVenta = parseFloat(total)
      const subtotal = (totalVenta / 1.18).toFixed(2)
      const igv = (totalVenta - subtotal).toFixed(2)

      const resumen = [
        ["", "", "", "SUBTOTAL", `S/ ${igv}`],
        ["", "", "", "IGV (18%)", `S/ ${subtotal}`],
      ]

      resumen.forEach((resumenRow) => {
        page.drawRectangle({
          x: colX[0] - 5,
          y: rowY - 5,
          width: colX[colX.length - 1] + 35,
          height: 20,
          color: rgb(0.99607843137, 0.94509803921, 0.81960784313),
          borderColor: rgb(0, 0, 0),
          borderWidth: 0.5,
        })

        resumenRow.forEach((cell, i) => {
          page.drawText(String(cell), {
            x: colX[i],
            y: rowY,
            size: 10,
            font: font,
            color: rgb(0, 0, 0),
          })
        })

        for (let i = 0; i < colX.length; i++) {
          if (i === colX.length - 1) {
            page.drawLine({
              start: { x: colX[i] - 5, y: rowY - 5 },
              end: { x: colX[i] - 5, y: rowY + 15 },
              thickness: 0.5,
              color: rgb(0, 0, 0),
            })
          }
        }

        rowY -= 20 // Ajustar posición para la siguiente fila
      })
    }
    // If it's the last row, add a yellow background with black text
    if (rowIndex === products.length - 1) {
      page.drawRectangle({
        x: colX[0] - 5, // Adding padding to the left
        y: rowY - 5, // Adding padding to the top
        width: colX[colX.length - 1] + 35, // Adding padding to the right
        height: 20, // Height of the row
        color: rgb(0.99607843137, 0.94509803921, 0.81960784313), // Yellow background for the last row
        borderColor: rgb(0, 0, 0), // Black border
        borderWidth: 0.5, // Thin border (0.5 points)
      })
      row.forEach((cell, i) => {
        page.drawText(cell, {
          x: colX[i],
          y: rowY,
          size: 10,
          font: fontBold,
          color: rgb(0, 0, 0), // Black text for the total row
          borderColor: rgb(0, 0, 0), // Black border
          borderWidth: 0.5, // Thin border (0.5 points)
        })
      })
      for (let i = 0; i < colX.length; i++) {
        if (i === colX.length - 1) {
          page.drawLine({
            start: { x: colX[i] - 5, y: rowY - 5 },
            end: { x: colX[i] - 5, y: rowY + 15 }, // 20px height
            thickness: 0.5,
            color: rgb(0, 0, 0), // Black line
          })
        }
      }
    } else {
      // Fila de producto
      const descriptionIndex = 1 // Assuming description is in column index 1
      const maxWidth = 155 // Max width for description column
      const lineHeight = 12 // Height per text line
      const baseRowHeight = 20 // Base row height
      const padding = 5 // Padding for borders

      // Calculate needed height for this row
      let rowHeight = baseRowHeight
      const lines = wrapText(row[descriptionIndex], maxWidth, font, 10)
      if (row[descriptionIndex]) {
        if (lines.length > 1) {
          rowHeight = baseRowHeight + (lines.length - 1) * lineHeight
        }
      }

      let bonus = 0
      if (lines.length > 1) {
        bonus = lines.length * 5 + 1.5
      }

      // Draw rectangle with dynamic height
      page.drawRectangle({
        x: colX[0] - padding,
        y: rowY - padding - bonus,
        width: colX[colX.length - 1] + 35,
        height: rowHeight,
        color: rgb(1, 1, 1),
        borderColor: rgb(0, 0, 0),
        borderWidth: 0.5,
      })

      // Escritura de campos
      row.forEach((cell, i) => {
        let xPosition = colX[i]
        if (i === 2) xPosition = colX[i] + 35
        if (i > 2) xPosition = colX[i] + 15

        if (i === descriptionIndex) {
          // Handle multi-line description
          const lines = wrapText(cell, maxWidth, font, 10)
          lines.forEach((line, lineIndex) => {
            page.drawText(line, {
              x: xPosition,
              y: rowY - lineIndex * lineHeight,
              size: 10,
              font: font,
              color: rgb(0, 0, 0),
            })
          })
        } else {
          // Regular single-line cells
          page.drawText(cell, {
            x: xPosition,
            y: rowY,
            size: 10,
            font: font,
            color: rgb(0, 0, 0),
          })
        }
      })

      if (lines.length > 1) {
        linePlus = lines.length * 20
      }

      // Lineas verticales with dynamic height
      for (let i = 0; i < colX.length; i++) {
        if (i > 0) {
          page.drawLine({
            start: {
              x: colX[i] - padding,
              y: rowY + rowHeight - padding,
            }, // Top of line
            end: { x: colX[i] - padding, y: rowY - padding - 2 * bonus }, // Bottom of line
            thickness: 0.2,
            color: rgb(0, 0, 0),
          })
        }
      }

      rowY -= rowHeight
    }
  })

  // Amount in Words
  const textoNatural = numberToText(total)
  const str = "Son : " + textoNatural.toUpperCase() + " SOLES"
  page.drawText(str, {
    x: 50,
    y: rowY - 40,
    size: 10,
    font: fontBold,
  })

  // Footer Values
  const igv = total / 1.18
  const subtotal = total - igv

  const footerInfo = [
    `Total Valor de Venta - Operaciones Gravadas: S/ ${igv.toFixed(2)}`,
    `Total Valor de Venta - Operaciones Inafecta: S/ 0.00`,
    `IGV: S/ ${subtotal.toFixed(2)}`,
    `Importe Total: S/ ${total.toFixed(2)}`,
  ]

  let footerY = rowY - 80
  footerInfo.forEach((text, i) => {
    const textWidth = font.widthOfTextAtSize(text, 10) // Calculate text width for right alignment
    let xPos = 540 - textWidth // Default to 20px padding from the right edge of the page

    // If it's the third line (i === 2), move the text a bit to the right
    if (i === 2) {
      xPos += 4 // Adjust the horizontal position (move to the right by 10px)
    }

    page.drawText(text, {
      x: xPos - 2,
      y: footerY,
      size: 10,
      font: i === 3 ? fontBold : font, // Bold the last line
    })
    footerY -= 20
  })

  // Serialize PDF
  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}

function wrapText(text, maxWidth, font, fontSize) {
  const words = text.split(" ")
  const lines = []
  let currentLine = words[0]

  for (let i = 1; i < words.length; i++) {
    const word = words[i]
    const width = font.widthOfTextAtSize(currentLine + " " + word, fontSize)
    if (width < maxWidth) {
      currentLine += " " + word
    } else {
      lines.push(currentLine)
      currentLine = word
    }
  }
  lines.push(currentLine)
  return lines
}
function numberToText(number) {
  const units = [
    "",
    "uno",
    "dos",
    "tres",
    "cuatro",
    "cinco",
    "seis",
    "siete",
    "ocho",
    "nueve",
  ]

  const teens = [
    "",
    "once",
    "doce",
    "trece",
    "catorce",
    "quince",
    "dieciséis",
    "diecisiete",
    "dieciocho",
    "diecinueve",
  ]

  const tens = [
    "",
    "diez",
    "veinte",
    "treinta",
    "cuarenta",
    "cincuenta",
    "sesenta",
    "setenta",
    "ochenta",
    "noventa",
  ]

  const hundreds = [
    "",
    "ciento",
    "doscientos",
    "trescientos",
    "cuatrocientos",
    "quinientos",
    "seiscientos",
    "setecientos",
    "ochocientos",
    "novecientos",
  ]

  const numToString = (num) => {
    if (num === 0) return "cero"
    if (num < 10) return units[num]
    if (num < 20) return teens[num - 10]

    if (num < 30 && num > 20) {
      return "veinti" + units[num % 10]
    }

    if (num < 100) {
      const decena = tens[Math.floor(num / 10)]
      const unidad = num % 10
      return decena + (unidad !== 0 ? " y " + units[unidad] : "")
    }

    if (num < 1000) {
      if (num === 100) return "cien"
      const centena = hundreds[Math.floor(num / 100)]
      const resto = num % 100
      return centena + (resto !== 0 ? " " + numToString(resto) : "")
    }

    if (num < 1000000) {
      const miles = Math.floor(num / 1000)
      const resto = num % 1000
      let milesText = miles === 1 ? "mil" : numToString(miles) + " mil"
      return milesText + (resto !== 0 ? " " + numToString(resto) : "")
    }

    return "Número demasiado grande"
  }

  const formatDecimalPart = (decimalPart) => {
    const decimalStr = decimalPart.toString().padStart(2, "0").substring(0, 2)
    const decimalNum = parseInt(decimalStr)
    return ` con ${decimalStr}/100`
  }

  const integerPart = Math.floor(number)
  const decimalPart = Math.round((number - integerPart) * 100)
  const integerText = numToString(integerPart)
  const decimalText = formatDecimalPart(decimalPart)

  const finalText = integerText.replace(/^uno mil/, "un mil") + decimalText
  return finalText.charAt(0).toUpperCase() + finalText.slice(1)
}

async function crearOrdenReposicionPDF(dataProducto) {
  const { PDFDocument, rgb, StandardFonts } = PDFLib

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842]) // Tamaño A4
  const { width, height } = page.getSize()

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let y = height - 50

  // Título
  page.drawText("SOLICITUD DE REPOSICIÓN", {
    x: 595 / 2 - 120.5,
    y,
    size: 20,
    font: boldFont,
    color: rgb(0, 0, 0.6),
  })

  // Subtítulo
  y -= 25
  page.drawText("Stock por debajo del nivel mínimo", {
    x: 595 / 2 - 77.5,
    y,
    size: 12,
    font,
    color: rgb(0.4, 0.4, 0.4),
  })

  // Fecha
  y -= 30
  const fecha = formatoFechaGeneracion()
  page.drawText(`${fecha}`, {
    x: 350,
    y,
    size: 10,
    font,
    color: rgb(0.3, 0.3, 0.3),
  })

  // Datos
  y -= 40
  const data = [
    ["Código:", `PROD-${String(dataProducto.id_producto).padStart(3, "0")}`],
    ["Producto:", `${dataProducto.nombre}`],
    ["Proveedor:", `${dataProducto.proveedor_nombre}`],
    ["Stock Mínimo:", `${dataProducto.cantidad_minima}`],
    ["Stock Actual:", `${dataProducto.stock}`],
    ["Cantidad a Reponer:", `${dataProducto.cantidad_minima * 3}`],
    ["Usuario Encargado:", `${dataProducto.usuarioResponsable.username}`],
  ]

  for (const [label, value] of data) {
    page.drawText(label, {
      x: 50,
      y,
      size: 12,
      font: boldFont,
    })
    page.drawText(value, {
      x: 180,
      y,
      size: 12,
      font,
      color: label === "Stock Actual:" ? rgb(1, 0, 0) : rgb(0, 0, 0),
    })
    y -= 25
  }

  // Alerta
  y -= 20
  page.drawRectangle({
    x: 50,
    y,
    width: 500,
    height: 30,
    color: rgb(1, 0.8, 0.8),
  })
  page.drawText("¡ATENCIÓN: Stock crítico!", {
    x: 594 / 2 - 65,
    y: y + 10.5,
    size: 12,
    font: boldFont,
    color: rgb(1, 0, 0),
  })

  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}

function formatoFechaGeneracion(fecha = DateTime.now().minus({ hours: 5 })) {
  const dias = [
    "domingo",
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
  ]
  const meses = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ]

  if (typeof fecha === "string") {
    fecha = DateTime.fromISO(fecha)
  }

  const diaSemana = dias[fecha.weekday % 7]
  const diaMes = fecha.day
  const mes = meses[fecha.month - 1]
  const anio = fecha.year

  return `Generado: ${diaSemana}, ${diaMes} de ${mes} de ${anio}`
}

async function generarOrdenPDF(orderData) {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size in points (210mm x 297mm)
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Document layout constants
    const MARGIN_LEFT = 50;
    const LINE_HEIGHT_LARGE = 30;
    const LINE_HEIGHT_MEDIUM = 20;
    const LINE_HEIGHT_SMALL = 15;
    const TITLE_FONT_SIZE = 18;
    const HEADER_FONT_SIZE = 14;
    const BODY_FONT_SIZE = 12;
    const DETAIL_FONT_SIZE = 11;
    
    // Initialize cursor position
    let cursorY = 800;

    // Add order header information
    page.drawText(`Orden No. ${orderData.id_order}`, { 
      x: MARGIN_LEFT, 
      y: cursorY, 
      size: TITLE_FONT_SIZE, 
      font, 
      color: rgb(0, 0, 0) 
    });
    cursorY -= LINE_HEIGHT_LARGE;

    // Add supplier information
    page.drawText(`Proveedor: ${orderData.proveedor}`, { 
      x: MARGIN_LEFT, 
      y: cursorY, 
      size: BODY_FONT_SIZE, 
      font 
    });
    cursorY -= LINE_HEIGHT_MEDIUM;

    // Add formatted date
    const formattedDate = new Date(orderData.fecha).toLocaleDateString();
    page.drawText(`Fecha: ${formattedDate}`, { 
      x: MARGIN_LEFT, 
      y: cursorY, 
      size: BODY_FONT_SIZE, 
      font 
    });
    cursorY -= LINE_HEIGHT_MEDIUM;

    // Add order status
    let str = ""
    if(orderData.estado === "en_curso"){
      str = "En Curso"
    }else if(orderData.estado === "finalizada"){
      str = "Finalizada"
    }

    page.drawText(`Estado: ${str}`, { 
      x: MARGIN_LEFT, 
      y: cursorY, 
      size: BODY_FONT_SIZE, 
      font 
    });
    cursorY -= LINE_HEIGHT_LARGE; // Extra space before products

    // Add products section header
    page.drawText(`Productos:`, { 
      x: MARGIN_LEFT, 
      y: cursorY, 
      size: HEADER_FONT_SIZE, 
      font 
    });
    cursorY -= LINE_HEIGHT_MEDIUM;

    // Add product list with indentation
    orderData.products.forEach(product => {
      const productText = `- ${product.nombre} (${product.categoria}) x${product.cantidad}`;
      page.drawText(productText, {
        x: MARGIN_LEFT + 10, // Indented from main margin
        y: cursorY, 
        size: DETAIL_FONT_SIZE, 
        font
      });
      cursorY -= LINE_HEIGHT_SMALL;
    });

    // Finalize and return the PDF
    return await pdfDoc.save();
    
  } catch (error) {
    console.error('Failed to generate order PDF:', error);
    throw new Error('PDF generation failed');
  }
}


async function generarPDFIncidencia(incidencia){
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const MARGIN_LEFT = 50;
  const LINE_HEIGHT_LARGE = 30;
  const LINE_HEIGHT_MEDIUM = 20;
  const LINE_HEIGHT_SMALL = 15;
  const TITLE_FONT_SIZE = 18;
  const HEADER_FONT_SIZE = 14;
  const BODY_FONT_SIZE = 12;
  const DETAIL_FONT_SIZE = 11;

  let cursorY = 800;

  // Título
  page.drawText(`Incidencia No. ${incidencia.id_incidencia}`, {
    x: MARGIN_LEFT,
    y: cursorY,
    size: TITLE_FONT_SIZE,
    font,
    color: rgb(0, 0, 0),
  });
  cursorY -= LINE_HEIGHT_LARGE;

  // Fechas
  const fechaRegistro = new Date(incidencia.fecha_registro).toLocaleDateString('es-PE');
  const fecha = new Date(incidencia.fecha).toLocaleDateString('es-PE');
  page.drawText(`Fecha de registro: ${fechaRegistro}`, {
    x: MARGIN_LEFT,
    y: cursorY,
    size: BODY_FONT_SIZE,
    font,
  });
  cursorY -= LINE_HEIGHT_MEDIUM;

  page.drawText(`Fecha del movimiento: ${fecha}`, {
    x: MARGIN_LEFT,
    y: cursorY,
    size: BODY_FONT_SIZE,
    font,
  });
  cursorY -= LINE_HEIGHT_MEDIUM;

  // Movimiento y Orden
  page.drawText(`Movimiento asociado: ${incidencia.id_movimiento}`, {
    x: MARGIN_LEFT,
    y: cursorY,
    size: BODY_FONT_SIZE,
    font,
  });
  cursorY -= LINE_HEIGHT_MEDIUM;

  if (incidencia.id_orden) {
    page.drawText(`Orden asociada: ${incidencia.id_orden}`, {
      x: MARGIN_LEFT,
      y: cursorY,
      size: BODY_FONT_SIZE,
      font,
    });
    cursorY -= LINE_HEIGHT_MEDIUM;
  }

  // Descripción general
  if (incidencia.descripcion_general) {
    cursorY -= LINE_HEIGHT_MEDIUM;
    page.drawText(`Descripción General:`, {
      x: MARGIN_LEFT,
      y: cursorY,
      size: HEADER_FONT_SIZE,
      font,
    });
    cursorY -= LINE_HEIGHT_SMALL;
    
    const texto = incidencia.descripcion_general;
    const palabras = texto.split(' ');
    let linea = '';
    const maxCharsPerLine = 90;

    palabras.forEach(palabra => {
      if ((linea + palabra).length < maxCharsPerLine) {
        linea += palabra + ' ';
      } else {
        page.drawText(linea.trim(), {
          x: MARGIN_LEFT + 10,
          y: cursorY,
          size: DETAIL_FONT_SIZE,
          font,
        });
        cursorY -= LINE_HEIGHT_SMALL;
        linea = palabra + ' ';
      }
    });
    if (linea.trim()) {
      page.drawText(linea.trim(), {
        x: MARGIN_LEFT + 10,
        y: cursorY,
        size: DETAIL_FONT_SIZE,
        font,
      });
      cursorY -= LINE_HEIGHT_SMALL;
    }
  }

  // Detalles de productos
  if (incidencia.detalle_productos && incidencia.detalle_productos.length > 0) {
    cursorY -= LINE_HEIGHT_MEDIUM;
    page.drawText(`Detalle de productos con incidencia:`, {
      x: MARGIN_LEFT,
      y: cursorY,
      size: HEADER_FONT_SIZE,
      font,
    });
    cursorY -= LINE_HEIGHT_MEDIUM;

    incidencia.detalle_productos.forEach(prod => {
      const nombre = prod.nombre || 'Producto';
      const cantidad = prod.cantidad || '-';
      const textoIncidencia = prod.incidencia || 'Sin descripción';

      page.drawText(`- ${nombre} x${cantidad}`, {
        x: MARGIN_LEFT + 10,
        y: cursorY,
        size: DETAIL_FONT_SIZE,
        font,
      });
      cursorY -= LINE_HEIGHT_SMALL;

      page.drawText(`Incidencia: ${textoIncidencia}`, {
      x: MARGIN_LEFT + 20,
      y: cursorY,
      size: DETAIL_FONT_SIZE,
      font,
      color: rgb(1, 0, 0),
    });
      cursorY -= LINE_HEIGHT_SMALL;
    });
  }

  return await pdfDoc.save();
}

module.exports = {
  generarComprobantePDF,
  crearOrdenReposicionPDF,
  generarOrdenPDF,
  generarPDFIncidencia
}
