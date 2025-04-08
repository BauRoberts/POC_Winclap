import React, { useState, useEffect, useCallback } from "react";
import Papa from "papaparse";

const CotejoDatos = () => {
  const [brkawayData, setBrkawayData] = useState([]);
  const [xtractData, setXtractData] = useState([]);
  const [coincidencias, setCoincidencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [configuracion, setConfiguracion] = useState({
    // Valores por defecto para facilitar las pruebas
    campoBrkawayMonto: "Costo Total",
    campoXtractMonto: "Total",
    toleranciaMonto: 2,
    campoBrkawayUsuario: "Creator Email",
    campoXtractUsuario: "Correo Proveedor 1",
    modoBusqueda: "usuariosPrimero", // 'montosPrimero' o 'usuariosPrimero'
    coincidenciaParcial: true, // Nueva opción para coincidencia parcial
    patternCoincidencia: "_\\d+$", // Coincidencia por el número al final
  });

  // Función para cargar y procesar los archivos CSV
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);

        // Cargar Fake_Brkaway_Data.csv
        const brkawayCsvResponse = await fetch("/Fake_Brkaway_Data.csv");
        const brkawayCsvContent = await brkawayCsvResponse.text();
        const brkawayResult = Papa.parse(brkawayCsvContent, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
        });

        // Cargar Fake_Xtract_Data.csv
        const xtractCsvResponse = await fetch("/Fake_Xtract_Data.csv");
        const xtractCsvContent = await xtractCsvResponse.text();
        const xtractResult = Papa.parse(xtractCsvContent, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
        });

        console.log("Datos Brkaway cargados:", brkawayResult.data.length);
        console.log("Datos Xtract cargados:", xtractResult.data.length);

        setBrkawayData(brkawayResult.data);
        setXtractData(xtractResult.data);
        setLoading(false);
      } catch (err) {
        console.error("Error al cargar los datos:", err);
        setError(
          "Error al cargar los datos. Por favor, verifica los archivos."
        );
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  // Lógica principal para buscar coincidencias
  const buscarCoincidencias = useCallback(() => {
    const {
      campoBrkawayMonto,
      campoXtractMonto,
      toleranciaMonto,
      campoBrkawayUsuario,
      campoXtractUsuario,
      modoBusqueda,
      coincidenciaParcial,
      patternCoincidencia,
    } = configuracion;

    const resultados = [];

    // Función para verificar coincidencia de usuarios
    const verificarCoincidenciaUsuario = (usuarioBrkaway, usuarioXtract) => {
      // Si no tenemos alguno de los valores, no hay coincidencia
      if (!usuarioBrkaway || !usuarioXtract) return false;

      // Convertir a cadena y limpiar
      const strBrkaway = String(usuarioBrkaway).trim().toLowerCase();
      const strXtract = String(usuarioXtract).trim().toLowerCase();

      // Coincidencia exacta
      if (strBrkaway === strXtract) return true;

      // Si está habilitada la coincidencia parcial
      if (coincidenciaParcial) {
        // Método 1: Coincidencia por patrón específico
        try {
          const regexBrkaway = new RegExp(patternCoincidencia);
          const regexXtract = new RegExp(patternCoincidencia);

          const matchBrkaway = strBrkaway.match(regexBrkaway);
          const matchXtract = strXtract.match(regexXtract);

          // Si ambos tienen el patrón y coincide
          if (
            matchBrkaway &&
            matchXtract &&
            matchBrkaway[0] === matchXtract[0]
          ) {
            return true;
          }
        } catch (error) {
          console.error("Error en expresión regular:", error);
        }

        // Método 2: Verificar si uno contiene al otro
        if (strBrkaway.includes(strXtract) || strXtract.includes(strBrkaway)) {
          return true;
        }

        // Método 3: Verificar números al final
        const numBrkaway = strBrkaway.match(/\d+$/);
        const numXtract = strXtract.match(/\d+$/);

        if (numBrkaway && numXtract && numBrkaway[0] === numXtract[0]) {
          return true;
        }
      }

      return false;
    };

    // Para cada registro en el primer dataset
    brkawayData.forEach((registroBrkaway) => {
      const montoBrkaway = registroBrkaway[campoBrkawayMonto];
      const usuarioBrkaway = registroBrkaway[campoBrkawayUsuario];

      // Buscar coincidencias en el segundo dataset
      xtractData.forEach((registroXtract) => {
        const montoXtract = registroXtract[campoXtractMonto];
        const usuarioXtract = registroXtract[campoXtractUsuario];

        // Verificar coincidencia de monto con tolerancia
        const diferenciaMonto = Math.abs(montoBrkaway - montoXtract);
        const coincideMonto = diferenciaMonto <= toleranciaMonto;

        // Verificar coincidencia de usuario usando la función mejorada
        const coincideUsuario = verificarCoincidenciaUsuario(
          usuarioBrkaway,
          usuarioXtract
        );

        // Decidir si incluir esta coincidencia basado en el modo de búsqueda
        let incluirCoincidencia = false;

        if (modoBusqueda === "montosPrimero") {
          // Si buscamos primero por monto, incluir si coincide el monto
          incluirCoincidencia = coincideMonto;
        } else if (modoBusqueda === "usuariosPrimero") {
          // Si buscamos primero por usuario, incluir si coincide el usuario
          incluirCoincidencia = coincideUsuario;
        }

        if (incluirCoincidencia) {
          resultados.push({
            brkaway: registroBrkaway,
            xtract: registroXtract,
            diferenciaMonto,
            coincideMonto,
            coincideUsuario,
            detalleCoincidencia:
              coincidenciaParcial &&
              coincideUsuario &&
              usuarioBrkaway !== usuarioXtract
                ? `Coincidencia parcial: ${usuarioBrkaway} ≈ ${usuarioXtract}`
                : null,
          });
        }
      });
    });

    setCoincidencias(resultados);
  }, [configuracion, brkawayData, xtractData]);

  // Función para buscar coincidencias cuando cambian los datos o la configuración
  useEffect(() => {
    if (brkawayData.length > 0 && xtractData.length > 0) {
      buscarCoincidencias();
    }
  }, [brkawayData, xtractData, buscarCoincidencias]);

  // Función para cambiar la configuración de coincidencia
  const cambiarConfiguracion = (e) => {
    const { name, value, type, checked } = e.target;
    setConfiguracion((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : name === "toleranciaMonto"
          ? Number(value)
          : value,
    }));
  };

  // Función para exportar los resultados
  const exportarResultados = () => {
    const csvContent = Papa.unparse(
      coincidencias.map((c) => ({
        "ID Brkaway": c.brkaway["Deliverable ID"] || "",
        [configuracion.campoBrkawayMonto]:
          c.brkaway[configuracion.campoBrkawayMonto],
        [configuracion.campoBrkawayUsuario]:
          c.brkaway[configuracion.campoBrkawayUsuario],
        "ID Xtract": c.xtract.ID,
        [configuracion.campoXtractMonto]:
          c.xtract[configuracion.campoXtractMonto],
        [configuracion.campoXtractUsuario]:
          c.xtract[configuracion.campoXtractUsuario],
        "Diferencia Monto": c.diferenciaMonto,
        "Coincide Usuario": c.coincideUsuario ? "Sí" : "No",
        "Coincide Monto": c.coincideMonto ? "Sí" : "No",
      }))
    );

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "resultados_coincidencias.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Botón de depuración
  const depurarDatos = () => {
    console.log("Configuración actual:", configuracion);
    console.log("Primer registro Brkaway:", brkawayData[0]);
    console.log("Primer registro Xtract:", xtractData[0]);

    // Mostrar campos disponibles para ayudar al usuario
    console.log("Campos disponibles en Brkaway:", Object.keys(brkawayData[0]));
    console.log("Campos disponibles en Xtract:", Object.keys(xtractData[0]));

    // Mostrar algunos campos clave para verificar
    try {
      const muestraB = brkawayData.slice(0, 3);
      const muestraX = xtractData.slice(0, 3);

      console.log(
        "Muestra de montos Brkaway:",
        muestraB.map((r) => r[configuracion.campoBrkawayMonto])
      );
      console.log(
        "Muestra de montos Xtract:",
        muestraX.map((r) => r[configuracion.campoXtractMonto])
      );
      console.log(
        "Muestra de usuarios Brkaway:",
        muestraB.map((r) => r[configuracion.campoBrkawayUsuario])
      );
      console.log(
        "Muestra de usuarios Xtract:",
        muestraX.map((r) => r[configuracion.campoXtractUsuario])
      );
    } catch (error) {
      console.error("Error al mostrar muestras:", error);
    }
  };

  // Si está cargando, mostrar indicador
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-8 max-w-md mx-auto bg-white rounded-lg shadow-lg">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-solid mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800">
            Cargando datos...
          </h2>
          <p className="text-gray-600 mt-2">
            Estamos procesando los archivos CSV
          </p>
        </div>
      </div>
    );
  }

  // Si hay error, mostrar mensaje
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-8 max-w-md mx-auto bg-white rounded-lg shadow-lg border-l-4 border-red-500">
          <svg
            className="w-16 h-16 text-red-500 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <h2 className="text-xl font-semibold text-gray-800">Error</h2>
          <p className="text-red-600 mt-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 bg-gray-50 min-h-screen">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Cotejo de Datos entre Plataformas
        </h1>
        <p className="text-gray-600 max-w-3xl mx-auto">
          Esta herramienta permite cotejar información entre dos fuentes de
          datos distintas (Brkaway y Xtract), identificando coincidencias en
          montos y usuarios.
        </p>
      </header>

      {/* Panel principal con pestañas */}
      <div className="bg-white rounded-lg shadow mb-8">
        {/* Pestañas de navegación */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button className="py-4 px-6 bg-blue-500 text-white font-medium rounded-t-lg">
              Configuración
            </button>
            <button className="py-4 px-6 text-gray-600 font-medium hover:bg-gray-100 rounded-t-lg">
              Datos Cargados ({brkawayData.length + xtractData.length}{" "}
              registros)
            </button>
          </div>
        </div>

        {/* Contenido principal - Panel de configuración */}
        <div className="p-6">
          {/* Sección 1: Estrategia de búsqueda */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b">
              1. Estrategia de Búsqueda
            </h2>
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">
                ¿Cómo desea iniciar la búsqueda de coincidencias?
              </label>
              <div className="flex space-x-4">
                <div className="flex-1 border rounded-lg p-4 bg-gray-50 hover:shadow-md transition cursor-pointer">
                  <label className="inline-flex items-center w-full cursor-pointer">
                    <input
                      type="radio"
                      name="modoBusqueda"
                      value="montosPrimero"
                      checked={configuracion.modoBusqueda === "montosPrimero"}
                      onChange={cambiarConfiguracion}
                      className="form-radio h-5 w-5 text-blue-600"
                    />
                    <div className="ml-3">
                      <span className="block text-gray-800 font-medium">
                        Primero por montos
                      </span>
                      <span className="text-sm text-gray-500">
                        Busca montos similares y luego verifica si corresponden
                        al mismo usuario
                      </span>
                    </div>
                  </label>
                </div>
                <div className="flex-1 border rounded-lg p-4 bg-gray-50 hover:shadow-md transition cursor-pointer">
                  <label className="inline-flex items-center w-full cursor-pointer">
                    <input
                      type="radio"
                      name="modoBusqueda"
                      value="usuariosPrimero"
                      checked={configuracion.modoBusqueda === "usuariosPrimero"}
                      onChange={cambiarConfiguracion}
                      className="form-radio h-5 w-5 text-blue-600"
                    />
                    <div className="ml-3">
                      <span className="block text-gray-800 font-medium">
                        Primero por usuarios
                      </span>
                      <span className="text-sm text-gray-500">
                        Busca usuarios similares y luego verifica si tienen
                        montos coincidentes
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Sección 2: Configuración de campos */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b">
              2. Selección de Campos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Columna Brkaway */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-lg text-blue-700 mb-2">
                  Brkaway
                </h3>

                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-medium mb-1">
                    Campo de monto:
                  </label>
                  <select
                    name="campoBrkawayMonto"
                    value={configuracion.campoBrkawayMonto}
                    onChange={cambiarConfiguracion}
                    className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="SUM of Cost">SUM of Cost</option>
                    <option value="SUM of Extra Cost">SUM of Extra Cost</option>
                    <option value="Costo Total">Costo Total</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">
                    Campo de usuario:
                  </label>
                  <select
                    name="campoBrkawayUsuario"
                    value={configuracion.campoBrkawayUsuario}
                    onChange={cambiarConfiguracion}
                    className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Client Name">Client Name</option>
                    <option value="Creator Email">Creator Email</option>
                    <option value="Creator Full Name">Creator Full Name</option>
                    <option value="Owner Full Name">Owner Full Name</option>
                  </select>
                </div>
              </div>

              {/* Columna Xtract */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-lg text-green-700 mb-2">
                  Xtract
                </h3>

                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-medium mb-1">
                    Campo de monto:
                  </label>
                  <select
                    name="campoXtractMonto"
                    value={configuracion.campoXtractMonto}
                    onChange={cambiarConfiguracion}
                    className="w-full p-2 border rounded focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="Subtotal (sin IVA)">
                      Subtotal (sin IVA)
                    </option>
                    <option value="Total">Total</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">
                    Campo de usuario:
                  </label>
                  <select
                    name="campoXtractUsuario"
                    value={configuracion.campoXtractUsuario}
                    onChange={cambiarConfiguracion}
                    className="w-full p-2 border rounded focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="Razón Social Cliente">
                      Razón Social Cliente
                    </option>
                    <option value="Razón Social Proveedor">
                      Razón Social Proveedor
                    </option>
                    <option value="Correo Proveedor 1">
                      Correo Proveedor 1
                    </option>
                    <option value="mail">mail</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Sección 3: Configuración de tolerancias */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b">
              3. Configuración de Tolerancias
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tolerancia de montos */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-2">
                  Tolerancia en montos
                </h3>
                <div className="mb-2">
                  <label className="block text-gray-700 text-sm mb-1">
                    Diferencia máxima permitida:
                  </label>
                  <input
                    type="number"
                    name="toleranciaMonto"
                    value={configuracion.toleranciaMonto}
                    onChange={cambiarConfiguracion}
                    min="0"
                    max="100"
                    className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Una tolerancia de 0 requerirá coincidencias exactas en los
                  montos. Valores mayores permiten pequeñas diferencias.
                </p>
              </div>

              {/* Coincidencia parcial de usuarios */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-2">
                  Coincidencia de usuarios
                </h3>
                <div className="mb-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      id="coincidenciaParcial"
                      name="coincidenciaParcial"
                      checked={configuracion.coincidenciaParcial}
                      onChange={(e) =>
                        setConfiguracion({
                          ...configuracion,
                          coincidenciaParcial: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 block text-gray-700">
                      Habilitar coincidencia parcial
                    </span>
                  </label>
                </div>

                <div
                  className={
                    !configuracion.coincidenciaParcial ? "opacity-50" : ""
                  }
                >
                  <label className="block text-gray-700 text-sm mb-1">
                    Patrón de coincidencia:
                  </label>
                  <input
                    type="text"
                    name="patternCoincidencia"
                    value={configuracion.patternCoincidencia}
                    onChange={cambiarConfiguracion}
                    placeholder="Patrón de coincidencia (regex)"
                    className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    disabled={!configuracion.coincidenciaParcial}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Patrón actual: buscar coincidencia por el número al final
                    (ej: "_0")
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-center space-x-4 mt-6">
            <button
              onClick={depurarDatos}
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-full flex items-center"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z"
                ></path>
              </svg>
              Verificar Datos
            </button>
            <button
              onClick={() => {
                // Forzar una coincidencia para verificar que el mecanismo funciona
                if (brkawayData.length > 0 && xtractData.length > 0) {
                  const coincidenciaPrueba = {
                    brkaway: brkawayData[0],
                    xtract: xtractData[0],
                    diferenciaMonto: 0,
                    coincideMonto: true,
                    coincideUsuario: true,
                    detalleCoincidencia: "Coincidencia forzada para prueba",
                  };

                  setCoincidencias([coincidenciaPrueba]);
                }
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-full flex items-center"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                ></path>
              </svg>
              Forzar Coincidencia de Prueba
            </button>
          </div>
        </div>
      </div>

      {/* Resumen de datos cargados */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Datos Cargados
          </h2>
          <div className="flex space-x-4">
            <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg flex items-center">
              <span className="font-medium mr-1">Brkaway:</span>{" "}
              {brkawayData.length} registros
            </div>
            <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg flex items-center">
              <span className="font-medium mr-1">Xtract:</span>{" "}
              {xtractData.length} registros
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <details className="border rounded-lg overflow-hidden">
            <summary className="cursor-pointer bg-gray-100 p-3 font-medium flex items-center hover:bg-gray-200">
              <div className="w-3 h-3 border-t-2 border-r-2 border-gray-700 transform rotate-45 mr-2"></div>
              Ver muestra de datos de Brkaway
            </summary>
            <div className="p-3 overflow-x-auto">
              {brkawayData.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(brkawayData[0])
                        .slice(0, 5)
                        .map((key) => (
                          <th
                            key={key}
                            className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {key}
                          </th>
                        ))}
                      {Object.keys(brkawayData[0]).length > 5 && (
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ...
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {brkawayData.slice(0, 3).map((row, index) => (
                      <tr
                        key={index}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        {Object.values(row)
                          .slice(0, 5)
                          .map((val, idx) => (
                            <td
                              key={idx}
                              className="px-3 py-2 whitespace-nowrap text-sm text-gray-700"
                            >
                              {val !== null && val !== undefined
                                ? String(val).substring(0, 30)
                                : ""}
                              {val !== null &&
                              val !== undefined &&
                              String(val).length > 30
                                ? "..."
                                : ""}
                            </td>
                          ))}
                        {Object.values(row).length > 5 && (
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                            ...
                          </td>
                        )}
                      </tr>
                    ))}
                    {brkawayData.slice(0, 3).map((row, index) => (
                      <tr
                        key={index}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        {Object.values(row)
                          .slice(0, 5)
                          .map((val, idx) => (
                            <td
                              key={idx}
                              className="px-3 py-2 whitespace-nowrap text-sm text-gray-700"
                            >
                              {val !== null && val !== undefined
                                ? String(val).substring(0, 30)
                                : ""}
                              {val !== null &&
                              val !== undefined &&
                              String(val).length > 30
                                ? "..."
                                : ""}
                            </td>
                          ))}
                        {Object.values(row).length > 5 && (
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                            ...
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No hay datos disponibles</p>
              )}
              {brkawayData.length > 3 && (
                <p className="mt-2 text-xs text-gray-500">
                  Mostrando 3 de {brkawayData.length} registros...
                </p>
              )}
            </div>
          </details>

          <details className="border rounded-lg overflow-hidden">
            <summary className="cursor-pointer bg-gray-100 p-3 font-medium flex items-center hover:bg-gray-200">
              <div className="w-3 h-3 border-t-2 border-r-2 border-gray-700 transform rotate-45 mr-2"></div>
              Ver muestra de datos de Xtract
            </summary>
            <div className="p-3 overflow-x-auto">
              {xtractData.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(xtractData[0])
                        .slice(0, 5)
                        .map((key) => (
                          <th
                            key={key}
                            className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {key}
                          </th>
                        ))}
                      {Object.keys(xtractData[0]).length > 5 && (
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ...
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {xtractData.slice(0, 3).map((row, index) => (
                      <tr
                        key={index}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        {Object.values(row)
                          .slice(0, 5)
                          .map((val, idx) => (
                            <td
                              key={idx}
                              className="px-3 py-2 whitespace-nowrap text-sm text-gray-700"
                            >
                              {val !== null && val !== undefined
                                ? String(val).substring(0, 30)
                                : ""}
                              {val !== null &&
                              val !== undefined &&
                              String(val).length > 30
                                ? "..."
                                : ""}
                            </td>
                          ))}
                        {Object.values(row).length > 5 && (
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                            ...
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No hay datos disponibles</p>
              )}
              {xtractData.length > 3 && (
                <p className="mt-2 text-xs text-gray-500">
                  Mostrando 3 de {xtractData.length} registros...
                </p>
              )}
            </div>
          </details>
        </div>
      </div>

      {/* Resultados */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <svg
            className="w-6 h-6 mr-2 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            ></path>
          </svg>
          Resultados del Cotejo
        </h2>

        {coincidencias.length === 0 ? (
          <div className="bg-gray-50 p-8 text-center rounded-lg border border-gray-200">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              ></path>
            </svg>
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              No se encontraron coincidencias
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Prueba ajustando los criterios de búsqueda o aumentando la
              tolerancia para obtener resultados.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-6">
              <div className="flex items-center">
                <div className="bg-green-100 rounded-full p-2 mr-3">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-green-800">
                    {configuracion.modoBusqueda === "montosPrimero"
                      ? `Se encontraron ${coincidencias.length} coincidencias por monto:`
                      : `Se encontraron ${coincidencias.length} coincidencias por usuario:`}
                  </h3>
                  <p className="text-sm text-green-700 mt-1">
                    {configuracion.modoBusqueda === "montosPrimero"
                      ? `${
                          coincidencias.filter((c) => c.coincideUsuario).length
                        } también coinciden en usuario`
                      : `${
                          coincidencias.filter((c) => c.coincideMonto).length
                        } también coinciden en monto`}
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      ID Brkaway
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {configuracion.campoBrkawayMonto}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {configuracion.campoBrkawayUsuario}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      ID Xtract
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {configuracion.campoXtractMonto}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {configuracion.campoXtractUsuario}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Dif. Monto
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      Usuario
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      Monto
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {coincidencias.map((coincidencia, index) => (
                    <tr
                      key={index}
                      className={
                        index % 2 === 0
                          ? "bg-white hover:bg-gray-50"
                          : "bg-gray-50 hover:bg-gray-100"
                      }
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {coincidencia.brkaway["Deliverable ID"] || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {coincidencia.brkaway[configuracion.campoBrkawayMonto]}
                      </td>
                      <td className="px-4 py-3 whitespace-normal text-sm text-gray-700">
                        <div>
                          {
                            coincidencia.brkaway[
                              configuracion.campoBrkawayUsuario
                            ]
                          }
                        </div>
                        {coincidencia.detalleCoincidencia && (
                          <div className="text-xs text-blue-600 mt-1">
                            Patrón:{" "}
                            {
                              (String(
                                coincidencia.brkaway[
                                  configuracion.campoBrkawayUsuario
                                ]
                              ).match(
                                new RegExp(configuracion.patternCoincidencia)
                              ) || ["-"])[0]
                            }
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {coincidencia.xtract.ID}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {coincidencia.xtract[configuracion.campoXtractMonto]}
                      </td>
                      <td className="px-4 py-3 whitespace-normal text-sm text-gray-700">
                        <div>
                          {
                            coincidencia.xtract[
                              configuracion.campoXtractUsuario
                            ]
                          }
                        </div>
                        {coincidencia.detalleCoincidencia && (
                          <div className="text-xs text-blue-600 mt-1">
                            Patrón:{" "}
                            {
                              (String(
                                coincidencia.xtract[
                                  configuracion.campoXtractUsuario
                                ]
                              ).match(
                                new RegExp(configuracion.patternCoincidencia)
                              ) || ["-"])[0]
                            }
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {coincidencia.diferenciaMonto.toFixed(2)}
                      </td>
                      <td
                        className={`px-4 py-3 whitespace-nowrap text-sm font-medium text-center ${
                          coincidencia.coincideUsuario
                            ? "text-green-800 bg-green-100"
                            : "text-red-800 bg-red-100"
                        }`}
                      >
                        {coincidencia.coincideUsuario
                          ? coincidencia.detalleCoincidencia
                            ? "Parcial"
                            : "Exacta"
                          : "No"}
                      </td>
                      <td
                        className={`px-4 py-3 whitespace-nowrap text-sm font-medium text-center ${
                          coincidencia.coincideMonto
                            ? "text-green-800 bg-green-100"
                            : "text-red-800 bg-red-100"
                        }`}
                      >
                        {coincidencia.coincideMonto ? "Sí" : "No"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Resumen y botón de exportar */}
            <div className="mt-6 flex justify-between items-center">
              <div className="text-gray-700">
                <div className="font-medium">Resumen:</div>
                {configuracion.modoBusqueda === "montosPrimero" ? (
                  <>
                    <div>Coincidencias por monto: {coincidencias.length}</div>
                    <div>
                      Coincidencias por monto y usuario:{" "}
                      {coincidencias.filter((c) => c.coincideUsuario).length}
                    </div>
                  </>
                ) : (
                  <>
                    <div>Coincidencias por usuario: {coincidencias.length}</div>
                    <div>
                      Coincidencias por usuario y monto:{" "}
                      {coincidencias.filter((c) => c.coincideMonto).length}
                    </div>
                  </>
                )}
              </div>

              {coincidencias.length > 0 && (
                <button
                  onClick={exportarResultados}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-full flex items-center"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    ></path>
                  </svg>
                  Exportar Resultados CSV
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer con información */}
      <footer className="mt-8 text-center text-gray-500 text-sm">
        <p>
          Herramienta de cotejo de datos desarrollada como Prueba de Concepto
          (POC)
        </p>
        <p className="mt-1">
          Permite identificar coincidencias entre datos de Brkaway y Xtract
        </p>
      </footer>
    </div>
  );
};

export default CotejoDatos;
