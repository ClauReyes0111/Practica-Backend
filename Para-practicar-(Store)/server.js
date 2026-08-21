// ============================================================
//  server.js  →  El BACKEND. Esto corre en Node, NO en el navegador.
//  Usa Express para las rutas y Mongoose para hablar con MongoDB.
// ============================================================
//
// CONCEPTO 3: require() carga módulos.
//   - "express" es una dependencia externa (vive en node_modules).
//   - "path" viene incluido en Node (módulo nativo).
//   - "dotenv" lee el archivo .env y mete sus valores en process.env.
const express = require("express");
const path = require("path");
require("dotenv").config();

const conectarDB = require("./db");
const Producto = require("./models/Producto");

const PUERTO = process.env.PORT || 3000;

const CARPETA_PUBLICA = path.join(__dirname, "public");
//app es la aplicación Express. En vez de escribir
// una única función gigante que revisa "¿qué URL es esta?", Express nos deja declarar RUTAS por separado, una por una.
const app = express();

// middleware de logging. Express llama a esta función en CADA petición, antes de decidir a qué ruta va. next() le dice
// "ya terminé, seguí con lo siguiente".
app.use((peticion, respuesta, next) => {
  console.log(`${peticion.method} ${peticion.originalUrl}`);
  next();
});

// CONCEPTO 5: express.json() es OTRO middleware: lee el body de la
// petición cuando viene en formato JSON (lo que manda fetch con
// JSON.stringify) y lo deja listo en peticion.body. Sin esto, crear o
// editar un producto llegaría con el body vacío.
app.use(express.json());

// CONCEPTO 6: escapamos los caracteres especiales de regex antes de
// meter lo que escribió el usuario en un new RegExp(). Si no lo
// hiciéramos, alguien podría escribir algo como "(a+)+$" y colgar al
// servidor calculando esa expresión (se llama ataque ReDoS).
function escaparRegExp(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------- RUTAS DE LA API ----------

// CONCEPTO 7: async/await también funciona en rutas de Express. Si la
// promesa de Mongo se rechaza, el try/catch la atrapa y se la pasamos
// a next(error) para que la maneje el middleware de errores de abajo.
app.get("/api/productos", async (peticion, respuesta, next) => {
  try {
    // ?q=teclado  →  peticion.query.q  →  "teclado"
    const q = (peticion.query.q || "").trim();

    // CONCEPTO 8: en vez de .filter() sobre un array en memoria,
    // armamos un FILTRO de Mongo. $or dice "que cumpla al menos una
    // de estas condiciones"; el RegExp con "i" es "sin importar
    // mayúsculas/minúsculas" (equivalente a nuestro .toLowerCase() de antes).
    const filtro = q
      ? {
          $or: [
            { nombre: new RegExp(escaparRegExp(q), "i") },
            { marca: new RegExp(escaparRegExp(q), "i") },
            { categoria: new RegExp(escaparRegExp(q), "i") },
          ],
        }
      : {};

    // .select("-_id -__v") oculta los campos internos de Mongo que el
    // frontend no necesita. .lean() devuelve objetos planos de JS en
    // vez de "documentos" de Mongoose (más liviano para solo leer).
    const resultados = await Producto.find(filtro).select("-_id -__v").lean();

    // CONCEPTO 9: JSON es el idioma común entre backend y frontend.
    // res.json() arma la respuesta con el Content-Type correcto y
    // convierte el objeto a texto JSON por nosotros.
    respuesta.json({ termino: q.toLowerCase(), total: resultados.length, resultados });
  } catch (error) {
    next(error);
  }
});

// CONCEPTO 10: ":id" en la ruta es un PARÁMETRO. Express lo captura y
// lo deja en peticion.params.id. La usamos para pedir UN producto
// puntual (el panel de admin la usa para cargar el formulario de editar).
app.get("/api/productos/:id", async (peticion, respuesta, next) => {
  try {
    const id = Number(peticion.params.id);
    if (Number.isNaN(id)) {
      return respuesta.status(400).json({ error: "El id debe ser un número" });
    }

    const producto = await Producto.findOne({ id }).select("-_id -__v").lean();
    if (!producto) {
      return respuesta.status(404).json({ error: "Producto no encontrado" });
    }

    respuesta.json(producto);
  } catch (error) {
    next(error);
  }
});

// CONCEPTO 11: para crear un producto no le pedimos el "id" a quien
// llena el formulario (se podría repetir o inventar cualquier cosa).
// Lo calculamos nosotros: buscamos el id más alto que exista y le
// sumamos 1. Si la colección está vacía, empezamos en 1.
async function siguienteId() {
  const ultimo = await Producto.findOne().sort({ id: -1 });
  return ultimo ? ultimo.id + 1 : 1;
}

app.post("/api/productos", async (peticion, respuesta, next) => {
  try {
    const id = await siguienteId();
    // Producto.create() valida contra el Schema ANTES de guardar: si
    // falta un campo obligatorio, ni siquiera llega a tocar la base.
    const producto = await Producto.create({ ...peticion.body, id });
    respuesta.status(201).json(producto);
  } catch (error) {
    next(error);
  }
});

// CONCEPTO 12: actualizar y borrar comparten el mismo patrón: buscar
// por "id" y aplicar la operación. findOneAndUpdate con { new: true }
// devuelve el documento YA actualizado (si no, devolvería el viejo).
// runValidators: true hace que Mongoose valide el Schema también al
// actualizar (por defecto solo valida al crear).
app.put("/api/productos/:id", async (peticion, respuesta, next) => {
  try {
    const id = Number(peticion.params.id);
    const { id: _idIgnorado, ...cambios } = peticion.body; // nunca dejamos cambiar el id

    const producto = await Producto.findOneAndUpdate({ id }, cambios, {
      new: true,
      runValidators: true,
    }).select("-_id -__v");

    if (!producto) {
      return respuesta.status(404).json({ error: "Producto no encontrado" });
    }

    respuesta.json(producto);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/productos/:id", async (peticion, respuesta, next) => {
  try {
    const id = Number(peticion.params.id);
    const producto = await Producto.findOneAndDelete({ id });

    if (!producto) {
      return respuesta.status(404).json({ error: "Producto no encontrado" });
    }

    respuesta.status(204).end();
  } catch (error) {
    next(error);
  }
});

// ---------- ARCHIVOS ESTÁTICOS ----------
// CONCEPTO 13: express.static reemplaza todo el bloque de fs.readFile +
// mapa de Content-Type + candado anti path-traversal que teníamos antes.
// Express ya sabe servir archivos de una carpeta, con el tipo MIME
// correcto, y sirve "index.html" automáticamente para "/".
app.use(express.static(CARPETA_PUBLICA));

// ---------- 404 ----------
// Si nada de lo anterior respondió, caemos aquí.
app.use((peticion, respuesta) => {
  respuesta.status(404).type("text/plain; charset=utf-8").send("404 · Esa página no existe");
});

// ---------- MANEJO DE ERRORES ----------
// CONCEPTO 14: un middleware con 4 parámetros (el primero es el error)
// es lo que Express reconoce como manejador de errores. Distinguimos
// los errores de VALIDACIÓN de Mongoose (datos con la forma
// incorrecta, culpa de quien llenó el formulario → 400) del resto
// (culpa nuestra o del servidor → 500).
app.use((error, peticion, respuesta, next) => {
  if (error.name === "ValidationError") {
    return respuesta.status(400).json({ error: error.message });
  }
  console.error(error);
  respuesta.status(500).json({ error: "Algo falló en el servidor" });
});

// CONCEPTO 15: nos conectamos a Mongo ANTES de aceptar peticiones. Si
// la base no está disponible, preferimos que el servidor ni arranque
// a que arranque y falle ruta por ruta.
conectarDB()
  .then(() => {
    app.listen(PUERTO, () => {
      console.log(`\n  Tienda corriendo en → http://localhost:${PUERTO}\n`);
    });
  })
  .catch((error) => {
    console.error("  No se pudo conectar a MongoDB:", error.message);
    process.exit(1);
  });