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

// CONCEPTO 5: escapamos los caracteres especiales de regex antes de
// meter lo que escribió el usuario en un new RegExp(). Si no lo
// hiciéramos, alguien podría escribir algo como "(a+)+$" y colgar al
// servidor calculando esa expresión (se llama ataque ReDoS).
function escaparRegExp(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------- RUTA 1: la API ----------
// CONCEPTO 6: async/await también funciona en rutas de Express. Si la
// promesa de Mongo se rechaza, el try/catch la atrapa y se la pasamos
// a next(error) para que la maneje el middleware de errores de abajo.
app.get("/api/productos", async (peticion, respuesta, next) => {
  try {
    // ?q=teclado  →  peticion.query.q  →  "teclado"
    const q = (peticion.query.q || "").trim();

    // CONCEPTO 7: en vez de .filter() sobre un array en memoria,
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

    // CONCEPTO 8: JSON es el idioma común entre backend y frontend.
    // res.json() arma la respuesta con el Content-Type correcto y
    // convierte el objeto a texto JSON por nosotros.
    respuesta.json({ termino: q.toLowerCase(), total: resultados.length, resultados });
  } catch (error) {
    next(error);
  }
});

// ---------- RUTA 2: archivos estáticos (html, css, js del navegador) ----------
// CONCEPTO 9: express.static reemplaza todo el bloque de fs.readFile +
// mapa de Content-Type + candado anti path-traversal que teníamos antes.
// Express ya sabe servir archivos de una carpeta, con el tipo MIME
// correcto, y sirve "index.html" automáticamente para "/".
app.use(express.static(CARPETA_PUBLICA));

//RUTA 3: 404 
// Si nada de lo anterior respondió, caemos aquí.
app.use((peticion, respuesta) => {
  respuesta.status(404).type("text/plain; charset=utf-8").send("404 · Esa página no existe");
});

// ---------- RUTA 4: manejo de errores ----------
// CONCEPTO 10: un middleware con 4 parámetros (el primero es el error)
// es lo que Express reconoce como manejador de errores. Cualquier
// next(error) de arriba termina acá, en vez de tumbar el servidor.
app.use((error, peticion, respuesta, next) => {
  console.error(error);
  respuesta.status(500).json({ error: "Algo falló en el servidor" });
});

// CONCEPTO 11: nos conectamos a Mongo ANTES de aceptar peticiones. Si
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