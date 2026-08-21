const express = require("express");
const path = require("path");
const productos = require("./productos");
const PUERTO = 3001;
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

// la API
app.get("/api/productos", (peticion, respuesta) => {
  // ?q=teclado  →  peticion.query.q  →  "teclado"
  const q = (peticion.query.q || "").trim().toLowerCase();

  // .filter() recorre el array y se queda solo con los elementos donde la función devuelve true. NO modifica el original.
  const resultados = q
    ? productos.filter((producto) => {
        const texto = `${producto.nombre} ${producto.marca} ${producto.categoria}`.toLowerCase();
        return texto.includes(q);
      })
    : productos;

  // JSON es el idioma común entre backend y frontend.
  // res.json() arma la respuesta con el Content-Type correcto y convierte el objeto a texto JSON por nosotros.
  respuesta.json({ termino: q, total: resultados.length, resultados });
});


app.use(express.static(CARPETA_PUBLICA));

//RUTA 3: 404 
// Si nada de lo anterior respondió, caemos aquí.
app.use((peticion, respuesta) => {
  respuesta.status(404).type("text/plain; charset=utf-8").send("404 · Esa página no existe");
});

app.listen(PUERTO, () => {
  console.log(`\n  Tienda corriendo en → http://localhost:${PUERTO}\n`);
});
