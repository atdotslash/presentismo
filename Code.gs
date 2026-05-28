// [ARCHIVO 1] - Code.gs
// Desplegar como Aplicación Web (Web App) con acceso para "Cualquier persona"

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    const payload = params.data;
    let result = {};

    switch (action) {
      case 'getDatosIniciales':
        result = {
          alumnos: getSheetData('alumnos'),
          materias: getSheetData('materias'),
          horarios: getSheetData('horarios'),
          periodos: getSheetData('periodos'),
          configuracion: getSheetData('configuracion')
        };
        break;
      case 'saveAsistenciaBatch':
        result = saveBatch('asistencia', payload, ['fecha', 'alumno_id', 'materia_id', 'estado', 'observacion_ausencia']);
        break;
      case 'saveCalificacionesBatch':
        result = saveBatch('calificaciones', payload, ['alumno_id', 'materia_id', 'periodo', 'tipo', 'valor', 'fecha_registro']);
        break;
      case 'saveObservacion':
        result = saveRow('observaciones', payload, ['alumno_id', 'fecha', 'tipo', 'descripcion', 'profesor_id']);
        break;
      case 'saveRegistroClase':
        result = saveRow('registro_clases', payload, ['fecha', 'materia_id', 'temas_desarrollados', 'actividades_realizadas', 'enlaces_drive', 'observaciones_docente']);
        break;
      case 'saveSeguimiento':
        result = saveRow('seguimiento_academico', payload, ['alumno_id', 'materia_id', 'fecha', 'tema', 'avance', 'notas_adicionales']);
        break;
      case 'getReporte':
        result = generarReporte(payload.materia_id, payload.periodo_id);
        break;
      default:
        throw new Error("Acción no válida");
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true, data: result })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("API Sistema de Gestión Escolar Activa.").setMimeType(ContentService.MimeType.TEXT);
}

function getSheetData(sheetName) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    let obj = {};
    headers.forEach((header, index) => { obj[header] = row[index]; });
    return obj;
  });
}

function saveBatch(sheetName, records, columns) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  if (!sheet || records.length === 0) return false;
  
  const rows = records.map(record => columns.map(col => record[col] !== undefined ? record[col] : ''));
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, columns.length).setValues(rows);
  return true;
}

function saveRow(sheetName, record, columns) {
  return saveBatch(sheetName, [record], columns);
}

function generarReporte(materia_id, periodo_id) {
  const alumnos = getSheetData('alumnos');
  const asistencia = getSheetData('asistencia').filter(a => a.materia_id == materia_id);
  const calificaciones = getSheetData('calificaciones').filter(c => c.materia_id == materia_id && c.periodo == periodo_id);
  
  const config = getSheetData('configuracion');
  const asistMinimaReq = parseFloat(config.find(c => c.clave === 'asistencia_minima')?.valor || 75);

  return alumnos.map(alumno => {
    // Calcular Asistencia
    const asisAlumno = asistencia.filter(a => a.alumno_id == alumno.id);
    let totalValidos = 0;
    let presentes = 0;
    
    asisAlumno.forEach(a => {
      if (a.estado !== 'NO APLICA') totalValidos++;
      if (a.estado === 'PRESENTE' || a.estado === 'AUSENTE JUSTIFICADO') presentes++;
      if (a.estado === 'MEDIA FALTA') presentes += 0.5;
    });

    const porcentajeAsistencia = totalValidos > 0 ? (presentes / totalValidos) * 100 : 100; // Si no hay clases, 100%

    // Calcular Calificaciones
    const notasAlumno = calificaciones.filter(c => c.alumno_id == alumno.id);
    const notasNumericas = notasAlumno.filter(c => c.tipo === 'nota').map(c => parseFloat(c.valor));
    const bonos = notasAlumno.filter(c => c.tipo === 'bono').length; // Cada bono es +1

    let promedio = 0;
    if (notasNumericas.length > 0) {
      const sumaNotas = notasNumericas.reduce((a, b) => a + b, 0);
      promedio = sumaNotas / notasNumericas.length;
      promedio += bonos; // Sumar bonos al promedio
      if (promedio > 10) promedio = 10;
    }

    // Valoración TEA/TEP/TED
    let valoracion = 'TEP';
    if (totalValidos > 0 && presentes === 0) {
      valoracion = 'TED'; // 0% de asistencia real
    } else if (promedio >= 7 && porcentajeAsistencia >= asistMinimaReq) {
      valoracion = 'TEA';
    } else {
      valoracion = 'TEP';
    }

    return {
      alumno_id: alumno.id,
      nombre: alumno.nombre_completo,
      promedio: promedio.toFixed(2),
      asistencia_pct: porcentajeAsistencia.toFixed(2),
      valoracion: valoracion,
      requiere_intensificacion: (promedio < 7 || porcentajeAsistencia < asistMinimaReq)
    };
  });
}