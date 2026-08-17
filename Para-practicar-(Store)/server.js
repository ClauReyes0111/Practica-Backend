// ============================================================
//  server.js  →  El BACKEND. Esto corre en Node, NO en el navegador.
// ============================================================
//
// CONCEPTO 3: require() carga módulos.
//   - "http", "fs", "path" vienen incluidos en Node (módulos nativos).
//   - "./productos" es NUESTRO archivo (por eso lleva ./).
const http = require("http");   // crear servidores web
const fs = require("fs");       // file system: leer archivos del disco
const path = require("path");   // armar rutas de archivos sin romper nada

const productos = require("./productos");

const PUERTO = 3000;

// Mapa de extensión → Content-Type, para que el navegador sepa qué recibe.
const TIPOS_MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

const CARPETA_PUBLICA = path.join(__dirname, "public");

// CONCEPTO 4: un servidor es una FUNCIÓN que recibe (peticion, respuesta).
// Node la ejecuta cada vez que alguien entra. Eso es un CALLBACK:
// una función que tú escribes y OTRO decide cuándo llamarla.
const servidor = http.createServer((peticion, respuesta) => {
  const url = new URL(peticion.url, `http://${peticion.headers.host}`);

  console.log(`${peticion.method} ${url.pathname}${url.search}`);

  // ---------- RUTA 1: la API ----------
  if (url.pathname === "/api/productos") {
    // ?q=teclado  →  url.searchParams.get("q")  →  "teclado"
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();

    // CONCEPTO 5: .filter() recorre el array y se queda solo con los
    // elementos donde la función devuelve true. NO modifica el original.
    const resultados = q
      ? productos.filter((producto) => {
          const texto = `${producto.nombre} ${producto.marca} ${producto.categoria}`.toLowerCase();
          return texto.includes(q);
        })
      : productos;

    // CONCEPTO 6: JSON es el idioma común entre backend y frontend.
    // JSON.stringify convierte objetos de JS → texto.
    respuesta.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    respuesta.end(JSON.stringify({ termino: q, total: resultados.length, resultados }));
    return; // importante: cortar aquí para no seguir ejecutando abajo
  }

  // ---------- RUTA 2: archivos estáticos (html, css, js del navegador) ----------
  const archivoPedido = url.pathname === "/" ? "/index.html" : url.pathname;
  const rutaCompleta = path.join(CARPETA_PUBLICA, path.normalize(archivoPedido));

  // Pequeño candado: nunca servir archivos fuera de /public.
  if (!rutaCompleta.startsWith(CARPETA_PUBLICA)) {
    respuesta.writeHead(403).end("Prohibido");
    return;
  }

  // CONCEPTO 7: ASINCRONÍA. fs.readFile no devuelve el archivo:
  // le pasas un callback y Node te avisa cuando el disco terminó.
  // Mientras tanto, el servidor sigue atendiendo a otras personas.
  fs.readFile(rutaCompleta, (error, contenido) => {
    if (error) {
      respuesta.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      respuesta.end("404 · Esa página no existe");
      return;
    }
    const tipo = TIPOS_MIME[path.extname(rutaCompleta)] || "text/plain";
    respuesta.writeHead(200, { "Content-Type": tipo });
    respuesta.end(contenido);
  });
});

servidor.listen(PUERTO, () => {
  console.log(`\n  Tienda corriendo en → http://localhost:${PUERTO}\n`);
});
