// ---------- 1. Referencias al HTML (el DOM) ----------
// document.querySelector busca con selectores de CSS: "#id", ".clase"
const $busqueda = document.querySelector("#busqueda");
const $btnBuscar = document.querySelector("#btn-buscar");
const $resultados = document.querySelector("#resultados");
const $resumen = document.querySelector("#resumen");
const $contadorCarrito = document.querySelector("#contador-carrito");
const $aviso = document.querySelector("#aviso");
const $btnCarrito = document.querySelector("#btn-carrito");

// ---------- 2. El ESTADO de la app ----------
// Regla de oro: el estado manda, la pantalla solo lo refleja.
// Cambio el estado → vuelvo a pintar. Nunca al revés.
let productosVisibles = []; // lo último que respondió el servidor

// CONCEPTO 20: al arrancar, en vez de empezar siempre vacío,
// preguntamos si el navegador tiene algo guardado de una visita anterior.
// localStorage.getItem() devuelve el TEXTO guardado, o null si nunca se guardó nada.
// JSON.parse() convierte ese texto de vuelta en array/objeto de JS.
// El "|| []" es un salvavidas: si getItem devuelve null, usamos un array vacío
// en lugar de que JSON.parse explote intentando parsear "null" de forma rara.
let carrito = JSON.parse(localStorage.getItem("carrito")) || []; // [{ id, nombre, precio, cantidad }]

// ---------- 3. Pedirle datos al servidor ----------
// async/await: "espera este resultado, pero no congeles el navegador".
async function buscarProductos(termino = "") {
  try {
    // fetch hace la petición HTTP. encodeURIComponent evita romper la URL
    // si el usuario escribe espacios o acentos.
    const respuesta = await fetch(`/api/productos?q=${encodeURIComponent(termino)}`);
    if (!respuesta.ok) throw new Error(`El servidor respondió ${respuesta.status}`);

    // .json() convierte el texto JSON → objeto de JavaScript
    const datos = await respuesta.json();

    productosVisibles = datos.resultados;
    pintarResumen(datos);
    pintarProductos(datos.resultados);
  } catch (error) {
    console.error(error);
    $resumen.textContent = "";
    $resultados.innerHTML = `
      <div class="vacio">
        <h2>No pudimos cargar los productos</h2>
        <p>Revisa que el servidor siga corriendo en la terminal e intenta de nuevo.</p>
      </div>`;
  }
}

// ---------- 4. Pintar en pantalla ----------
function pintarResumen({ termino, total }) {
  $resumen.innerHTML = termino
    ? `<strong>${total}</strong> resultado${total === 1 ? "" : "s"} para “${termino}”`
    : `<strong>${total}</strong> productos disponibles`;
}

function pintarProductos(lista) {
  if (lista.length === 0) {
    $resultados.innerHTML = `
      <div class="vacio">
        <h2>Sin coincidencias</h2>
        <p>Prueba con menos palabras o busca por categoría: tecnología, hogar, accesorios.</p>
      </div>`;
    return;
  }

  // .map() transforma cada producto en un pedazo de HTML,
  // .join("") pega todos esos pedazos en un solo string.
  $resultados.innerHTML = lista.map(plantillaProducto).join("");
}

function plantillaProducto(producto) {
  const cantidadEnCarrito = contarEnCarrito(producto.id);
  const ahorro = producto.precioAnterior
    ? Math.round((1 - producto.precio / producto.precioAnterior) * 100)
    : 0;

  // Template literal: texto con `backticks` donde ${...} inserta valores.
  return `
    <article class="producto">
      <div class="producto__foto">${producto.imagen}</div>

      <div class="producto__info">
        <p class="producto__marca">${producto.marca} · ${producto.categoria}</p>
        <h2 class="producto__nombre">${producto.nombre}</h2>

        <div class="producto__valoracion">
          <span class="producto__estrellas">${dibujarEstrellas(producto.rating)}</span>
          <span>${producto.rating.toFixed(1)}</span>
          <span>(${producto.resenas.toLocaleString("es-PA")})</span>
        </div>

        <p class="producto__precio">
          ${formatearPrecio(producto.precio)}
          ${producto.precioAnterior ? `<span class="producto__antes">${formatearPrecio(producto.precioAnterior)}</span>` : ""}
          ${ahorro ? `<span class="producto__ahorro">-${ahorro}%</span>` : ""}
        </p>

        <p class="producto__envio">
          ${producto.envioGratis ? "<strong>Envío gratis</strong> · llega en 2 días" : "Envío $4.99 · llega en 4 días"}
        </p>
      </div>

      <div class="producto__accion">
        <!-- data-id: así el botón "recuerda" a qué producto pertenece -->
        <button class="btn-agregar" data-id="${producto.id}">Agregar al carrito</button>
        <span class="producto__enCarrito">${cantidadEnCarrito ? `${cantidadEnCarrito} en el carrito` : ""}</span>
      </div>
    </article>`;
}

function dibujarEstrellas(rating) {
  const llenas = Math.round(rating);
  // "★".repeat(4) → "★★★★"
  return "★".repeat(llenas) + "☆".repeat(5 - llenas);
}

function formatearPrecio(valor) {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: "USD",
  }).format(valor);
}

// ---------- 5. El carrito ----------
function contarEnCarrito(id) {
  const linea = carrito.find((item) => item.id === id);
  return linea ? linea.cantidad : 0;
}

function agregarAlCarrito(id) {
  const producto = productosVisibles.find((p) => p.id === id);
  if (!producto) return;

  const linea = carrito.find((item) => item.id === id);
  if (linea) {
    linea.cantidad += 1; // ya estaba: solo sube la cantidad
  } else {
    carrito.push({ id: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: 1 });
  }

  // CONCEPTO 21: localStorage.setItem() SOLO guarda texto, nunca objetos directo.
  // Por eso convertimos el array con JSON.stringify() antes de guardarlo.
  // Esto se ejecuta cada vez que el carrito cambia, así queda sincronizado.
  localStorage.setItem("carrito", JSON.stringify(carrito));

  actualizarContador();
  mostrarAviso(`Agregado: ${producto.nombre}`);
}

function actualizarContador() {
  // .reduce() aplasta el array en UN solo valor (aquí, la suma).
  const totalUnidades = carrito.reduce((suma, item) => suma + item.cantidad, 0);
  $contadorCarrito.textContent = totalUnidades;

  $contadorCarrito.classList.remove("pulso");
  void $contadorCarrito.offsetWidth; // truco para reiniciar la animación
  $contadorCarrito.classList.add("pulso");
}

let temporizadorAviso;
function mostrarAviso(texto) {
  $aviso.textContent = texto;
  $aviso.classList.add("visible");
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => $aviso.classList.remove("visible"), 2200);
}

// ---------- 6. Eventos ----------
// DELEGACIÓN: los botones "Agregar" se crean y destruyen todo el tiempo,
// así que escuchamos en el CONTENEDOR, que sí es permanente.
$resultados.addEventListener("click", (evento) => {
  const boton = evento.target.closest(".btn-agregar");
  if (!boton) return; // el clic fue en otro lado

  agregarAlCarrito(Number(boton.dataset.id));

  boton.textContent = "✓ Agregado";
  boton.classList.add("agregado");
  setTimeout(() => {
    boton.textContent = "Agregar al carrito";
    boton.classList.remove("agregado");
  }, 900);

  // Refrescar solo el textito de "N en el carrito" de esta tarjeta
  const etiqueta = boton.parentElement.querySelector(".producto__enCarrito");
  const cantidad = contarEnCarrito(Number(boton.dataset.id));
  etiqueta.textContent = `${cantidad} en el carrito`;
});

// Buscar con el botón
$btnBuscar.addEventListener("click", () => buscarProductos($busqueda.value));

// Buscar con Enter
$busqueda.addEventListener("keydown", (evento) => {
  if (evento.key === "Enter") buscarProductos($busqueda.value);
});

// Buscar mientras escribe, pero esperando 300 ms sin teclear (debounce),
// para no bombardear al servidor con una petición por letra.
let temporizadorBusqueda;
$busqueda.addEventListener("input", () => {
  clearTimeout(temporizadorBusqueda);
  temporizadorBusqueda = setTimeout(() => buscarProductos($busqueda.value), 300);
});

// CONCEPTO 23: navegar a otra página desde JavaScript.
// window.location.href = "..." es lo mismo que si escribieras esa URL
// en la barra de direcciones: el navegador RECARGA hacia esa página nueva.
$btnCarrito.addEventListener("click", () => {
  window.location.href = "carrito.html";
});

// ---------- 7. Arranque ----------
// CONCEPTO 22: el estado (carrito) ya se recuperó de localStorage al declarar
// la variable, pero la PANTALLA (el número en la barra) no se entera sola.
// Hay que forzar un primer "reflejo" al arrancar, igual que hacemos
// cada vez que el carrito cambia.
actualizarContador();
buscarProductos();