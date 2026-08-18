// ============================================================
//  server.js  →  El BACKEND. Esto corre en Node, NO en el navegador.
//  Ahora usando Express: un framework que nos ahorra escribir a mano
//  el enrutamiento y el manejo de archivos estáticos que antes hacíamos
//  con el módulo nativo "http".
// ============================================================
//
// CONCEPTO 3: require() carga módulos.
//   - "express" es una dependencia externa (vive en node_modules,
//     por eso NO lleva ./ adelante).
//   - "path" viene incluido en Node (módulo nativo).
//   - "./productos" es NUESTRO archivo (por eso lleva ./).
const express = require("express");
const path = require("path");

const productos = require("./productos");

const PUERTO = process.env.PORT || 3000;

const CARPETA_PUBLICA = path.join(__dirname, "public");

// CONCEPTO 4: app es nuestra aplicación Express. En vez de escribir
// una única función gigante que revisa "¿qué URL es esta?", Express
// nos deja declarar RUTAS por separado, una por una.
const app = express();

// CONCEPTO 4b: middleware de logging. Express llama a esta función
// en CADA petición, antes de decidir a qué ruta va. next() le dice
// "ya terminé, seguí con lo siguiente".
app.use((peticion, respuesta, next) => {
  console.log(`${peticion.method} ${peticion.originalUrl}`);
  next();
});

// ---------- RUTA 1: la API ----------
app.get("/api/productos", (peticion, respuesta) => {
  // ?q=teclado  →  peticion.query.q  →  "teclado"
  const q = (peticion.query.q || "").trim().toLowerCase();

  // CONCEPTO 5: .filter() recorre el array y se queda solo con los
  // elementos donde la función devuelve true. NO modifica el original.
  const resultados = q
    ? productos.filter((producto) => {
        const texto = `${producto.nombre} ${producto.marca} ${producto.categoria}`.toLowerCase();
        return texto.includes(q);
      })
    : productos;

  // CONCEPTO 6: JSON es el idioma común entre backend y frontend.
  // res.json() arma la respuesta con el Content-Type correcto y
  // convierte el objeto a texto JSON por nosotros.
  respuesta.json({ termino: q, total: resultados.length, resultados });
});

// ---------- RUTA 2: archivos estáticos (html, css, js del navegador) ----------
// CONCEPTO 7: express.static reemplaza todo el bloque de fs.readFile +
// mapa de Content-Type + candado anti path-traversal que teníamos antes.
// Express ya sabe servir archivos de una carpeta, con el tipo MIME
// correcto, y sirve "index.html" automáticamente para "/".
app.use(express.static(CARPETA_PUBLICA));

// ---------- RUTA 3: 404 ----------
// Si nada de lo anterior respondió, caemos aquí.
app.use((peticion, respuesta) => {
  respuesta.status(404).type("text/plain; charset=utf-8").send("404 · Esa página no existe");
});

app.listen(PUERTO, () => {
  console.log(`\n  Tienda corriendo en → http://localhost:${PUERTO}\n`);
});
