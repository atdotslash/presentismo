// [ARCHIVO 4] - script.js
const app = {
    state: {
        alumnos: [], materias: [], horarios: [], periodos: [], configuracion: [],
        currentUser: null, currentPanel: 'panel-asistencia'
    },

    init: async function() {
        if (sessionStorage.getItem('logged_in') === 'true') {
            document.getElementById('login-view').classList.remove('active');
            document.getElementById('app-view').classList.add('active');
            document.getElementById('asist-fecha').valueAsDate = new Date();
            document.getElementById('reg-fecha').valueAsDate = new Date();
            await this.loadData();
        }
    },

    login: function() {
        const user = document.getElementById('login-user').value;
        const pass = document.getElementById('login-pass').value;
        if (user === USUARIO && pass === CONTRASENA) {
            sessionStorage.setItem('logged_in', 'true');
            this.init();
        } else {
            document.getElementById('login-error').innerText = 'Credenciales incorrectas';
        }
    },

    logout: function() {
        sessionStorage.removeItem('logged_in');
        location.reload();
    },

    toggleMenu: function() {
        const sidebar = document.getElementById('sidebar');
        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('active');
        } else {
            sidebar.classList.toggle('collapsed');
        }
    },

    showPanel: function(panelId) {
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        document.getElementById(panelId).classList.add('active');
        this.state.currentPanel = panelId;
        if (window.innerWidth <= 768) this.toggleMenu();
        this.populateSelectsForPanel(panelId);
    },

    showSpinner: function(show) {
        document.getElementById('loading-spinner').classList.toggle('hidden', !show);
    },

    apiCall: async function(action, data = {}) {
        this.showSpinner(true);
        try {
            if (!API_URL) return this.mockApiCall(action, data); // Fallback offline/demo

            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action, data }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' } // Apps Script require text/plain para CORS
            });
            const result = await response.json();
            this.showSpinner(false);
            if (!result.success) throw new Error(result.error);
            return result.data;
        } catch (error) {
            this.showSpinner(false);
            console.error("API Error:", error);
            alert("Error de conexión: " + error.message);
            return null;
        }
    },

    mockApiCall: function(action, data) {
        // Simulación de Base de Datos Local para Pruebas (Offline)
        console.warn("Ejecutando en MODO DEMO LOCAL (Sin API_URL configurada)");
        return new Promise(resolve => {
            setTimeout(() => {
                let res = null;
                if (action === 'getDatosIniciales') {
                    res = {
                        alumnos: [
                            {id: 1, nombre_completo: "Pérez, Juan", grado: "5°", division: "5°", grupo_taller: "Grupo A"},
                            {id: 2, nombre_completo: "Gómez, Ana", grado: "5°", division: "5°", grupo_taller: "Grupo B"},
                            {id: 3, nombre_completo: "López, Carlos", grado: "7°", division: "2°", grupo_taller: "Grupo A"}
                        ],
                        materias: [
                            {id: 1, nombre: "Sistemas Operativos 5°5°", grado: "5°", division: "5°", grupo: "", tipo: "curricular"},
                            {id: 2, nombre: "Metodologías de Pruebas de Sistemas 7°2°", grado: "7°", division: "2°", grupo: "Grupo A", tipo: "taller"}
                        ],
                        horarios: [], periodos: [{id: '1erCuatri', nombre: '1er Cuatrimestre'}], configuracion: []
                    };
                } else if (action === 'getReporte') {
                    res = [
                        {alumno_id: 1, nombre: "Pérez, Juan", promedio: "8.50", asistencia_pct: "90.00", valoracion: "TEA", requiere_intensificacion: false}
                    ];
                } else {
                    res = true; // Simular guardado exitoso
                }
                this.showSpinner(false);
                resolve(res);
            }, 500);
        });
    },

    loadData: async function() {
        const data = await this.apiCall('getDatosIniciales');
        if (data) {
            this.state.alumnos = data.alumnos;
            this.state.materias = data.materias;
            this.state.horarios = data.horarios;
            this.state.periodos = data.periodos;
            this.state.configuracion = data.configuracion;
            this.populateGlobalSelects();
            this.loadMateriasDia('asist-materia', document.getElementById('asist-fecha').value);
        }
    },

    populateGlobalSelects: function() {
        const materiasHtml = this.state.materias.map(m => `<option value="${m.id}">${m.nombre}</option>`).join('');
        const alumnosHtml = this.state.alumnos.map(a => `<option value="${a.id}">${a.nombre_completo} (${a.grado}${a.division})</option>`).join('');
        const periodosHtml = this.state.periodos.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');

        ['calif-materia', 'reg-materia', 'seg-materia', 'rep-materia'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerHTML = materiasHtml;
        });

        ['obs-alumno', 'seg-alumno'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerHTML = alumnosHtml;
        });

        ['calif-periodo', 'rep-periodo'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerHTML = periodosHtml;
        });
    },

    populateSelectsForPanel: function(panelId) {
        if (panelId === 'panel-asistencia') {
            this.loadMateriasDia('asist-materia', document.getElementById('asist-fecha').value);
        }
    },

    loadMateriasDia: function(selectId, dateString) {
        const select = document.getElementById(selectId);
        select.innerHTML = '';
        // Simplificación: Cargar todas las materias si no hay cruce de horarios complejo configurado
        this.state.materias.forEach(m => {
            let opt = document.createElement('option');
            opt.value = m.id;
            opt.text = m.nombre;
            select.appendChild(opt);
        });
        this.renderAsistenciaList();
    },

    getAlumnosFiltrados: function(materiaId, grupoFiltro) {
        const materia = this.state.materias.find(m => m.id == materiaId);
        if (!materia) return [];
        return this.state.alumnos.filter(a => {
            const coincideCurso = a.grado == materia.grado && a.division == materia.division;
            if (!coincideCurso) return false;
            if (materia.tipo === 'taller' && grupoFiltro !== 'ALL') {
                return a.grupo_taller === grupoFiltro;
            }
            return true;
        });
    },

    // --- ASISTENCIA ---
    renderAsistenciaList: function() {
        const materiaId = document.getElementById('asist-materia').value;
        const grupo = document.getElementById('asist-grupo').value;
        const alumnos = this.getAlumnosFiltrados(materiaId, grupo);
        const tbody = document.getElementById('tbody-asistencia');
        tbody.innerHTML = '';

        alumnos.forEach(a => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${a.nombre_completo}</td>
                <td><input type="radio" name="ast_${a.id}" value="PRESENTE" checked onchange="app.toggleObsAsistencia(${a.id})"></td>
                <td><input type="radio" name="ast_${a.id}" value="MEDIA FALTA" onchange="app.toggleObsAsistencia(${a.id})"></td>
                <td><input type="radio" name="ast_${a.id}" value="AUSENTE" onchange="app.toggleObsAsistencia(${a.id})"></td>
                <td><input type="radio" name="ast_${a.id}" value="AUSENTE JUSTIFICADO" onchange="app.toggleObsAsistencia(${a.id})"></td>
                <td><input type="radio" name="ast_${a.id}" value="NO APLICA" onchange="app.toggleObsAsistencia(${a.id})"></td>
                <td><input type="text" id="obs_${a.id}" class="obs-input" placeholder="Motivo justificación"></td>
            `;
            tbody.appendChild(tr);
        });
    },

    toggleObsAsistencia: function(alumnoId) {
        const radios = document.getElementsByName(`ast_${alumnoId}`);
        const obsInput = document.getElementById(`obs_${alumnoId}`);
        let estado = "PRESENTE";
        for (let r of radios) { if (r.checked) estado = r.value; }
        if (estado === "AUSENTE JUSTIFICADO") {
            obsInput.classList.add('visible');
            obsInput.required = true;
        } else {
            obsInput.classList.remove('visible');
            obsInput.required = false;
        }
    },

    saveAsistencia: async function() {
        const fecha = document.getElementById('asist-fecha').value;
        const materiaId = document.getElementById('asist-materia').value;
        const grupo = document.getElementById('asist-grupo').value;
        const alumnos = this.getAlumnosFiltrados(materiaId, grupo);
        
        let payload = [];
        for (let a of alumnos) {
            const radios = document.getElementsByName(`ast_${a.id}`);
            let estado = "PRESENTE";
            for (let r of radios) { if (r.checked) estado = r.value; }
            const obs = document.getElementById(`obs_${a.id}`).value;

            if (estado === "AUSENTE JUSTIFICADO" && obs.trim() === "") {
                alert(`Debe ingresar una observación para la justificación de ${a.nombre_completo}`);
                return;
            }

            payload.push({ fecha, alumno_id: a.id, materia_id: materiaId, estado, observacion_ausencia: obs });
        }

        const res = await this.apiCall('saveAsistenciaBatch', payload);
        if (res) alert("Asistencia guardada correctamente.");
    },

    // --- CALIFICACIONES ---
    renderCalificacionesList: function() {
        const materiaId = document.getElementById('calif-materia').value;
        const alumnos = this.getAlumnosFiltrados(materiaId, 'ALL');
        const tbody = document.getElementById('tbody-calificaciones');
        tbody.innerHTML = '';

        alumnos.forEach(a => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${a.nombre_completo}</td>
                <td><input type="number" id="nota_${a.id}" min="0" max="10" step="0.5" placeholder="Nota"></td>
                <td><button class="btn-secondary" onclick="app.addBono(${a.id}, this)">Otorgar +1</button></td>
                <td>-</td>
            `;
            tbody.appendChild(tr);
        });
    },

    addBono: function(alumnoId, btnElement) {
        btnElement.innerText = "Bono Otorgado (+1)";
        btnElement.style.backgroundColor = "var(--tea)";
        btnElement.dataset.bono = "1";
    },

    saveCalificaciones: async function() {
        const materiaId = document.getElementById('calif-materia').value;
        const periodoId = document.getElementById('calif-periodo').value;
        const desc = document.getElementById('calif-desc').value;
        if (!desc) { alert("Debe ingresar una descripción (Ej: TP1)"); return; }

        const alumnos = this.getAlumnosFiltrados(materiaId, 'ALL');
        let payload = [];
        const fecha_registro = new Date().toISOString().split('T')[0];
        
        const identPeriodo = `${periodoId}_${desc}`;

        alumnos.forEach(a => {
            const notaVal = document.getElementById(`nota_${a.id}`).value;
            const btnBono = document.querySelector(`button[onclick="app.addBono(${a.id}, this)"]`);
            const tieneBono = btnBono && btnBono.dataset.bono === "1";

            if (notaVal !== "") {
                payload.push({ alumno_id: a.id, materia_id: materiaId, periodo: identPeriodo, tipo: 'nota', valor: notaVal, fecha_registro });
            }
            if (tieneBono) {
                payload.push({ alumno_id: a.id, materia_id: materiaId, periodo: identPeriodo, tipo: 'bono', valor: 1, fecha_registro });
            }
        });

        if (payload.length === 0) { alert("No hay calificaciones para guardar."); return; }

        const res = await this.apiCall('saveCalificacionesBatch', payload);
        if (res) {
            alert("Calificaciones guardadas.");
            this.renderCalificacionesList(); // Reset
            document.getElementById('calif-desc').value = "";
        }
    },

    // --- OTROS PANELES (CRUD Simples) ---
    saveRegistroClase: async function() {
        const payload = {
            fecha: document.getElementById('reg-fecha').value,
            materia_id: document.getElementById('reg-materia').value,
            temas_desarrollados: document.getElementById('reg-temas').value,
            actividades_realizadas: document.getElementById('reg-actividades').value,
            enlaces_drive: document.getElementById('reg-drive').value,
            observaciones_docente: ""
        };
        if(!payload.temas_desarrollados) { alert("Debe ingresar los temas."); return;}
        const res = await this.apiCall('saveRegistroClase', payload);
        if(res) { alert("Registro guardado."); document.getElementById('reg-temas').value = ""; }
    },

    saveObservacion: async function() {
        const payload = {
            alumno_id: document.getElementById('obs-alumno').value,
            fecha: new Date().toISOString().split('T')[0],
            tipo: document.getElementById('obs-tipo').value,
            descripcion: document.getElementById('obs-desc').value,
            profesor_id: USUARIO
        };
        const res = await this.apiCall('saveObservacion', payload);
        if(res) { alert("Observación guardada."); document.getElementById('obs-desc').value = ""; }
    },

    saveSeguimiento: async function() {
        const payload = {
            alumno_id: document.getElementById('seg-alumno').value,
            materia_id: document.getElementById('seg-materia').value,
            fecha: new Date().toISOString().split('T')[0],
            tema: document.getElementById('seg-tema').value,
            avance: document.getElementById('seg-avance').value,
            notas_adicionales: document.getElementById('seg-notas').value
        };
        const res = await this.apiCall('saveSeguimiento', payload);
        if(res) { alert("Seguimiento guardado."); }
    },

    // --- REPORTES ---
    generarReporte: async function() {
        const materiaId = document.getElementById('rep-materia').value;
        const periodoId = document.getElementById('rep-periodo').value;
        
        const data = await this.apiCall('getReporte', { materia_id: materiaId, periodo_id: periodoId });
        if (!data) return;

        const tbody = document.getElementById('tbody-reportes');
        tbody.innerHTML = '';

        data.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${r.nombre}</td>
                <td><strong>${r.promedio}</strong></td>
                <td>${r.asistencia_pct}%</td>
                <td><span class="badge ${r.valoracion}">${r.valoracion}</span></td>
                <td>${r.requiere_intensificacion ? '<span style="color:var(--ted)">Req. Intensificación</span>' : 'Regular'}</td>
            `;
            tbody.appendChild(tr);
        });
    }
};

window.onload = () => app.init();