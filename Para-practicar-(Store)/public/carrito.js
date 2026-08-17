// ============================================================
//  carrito.js  →  Lógica de la pantalla "Tu carrito"
// ============================================================
// Esta pantalla NO carga app.js. Por eso algunas cosas chiquitas
// (como formatearPrecio) están repetidas acá — es una función
// corta, no vale la pena complicarnos por compartirla todavía.

// ---------- 1. Referencias al HTML ----------
const $lineasCarrito = document.querySelector("#lineas-carrito");
const $totalCarrito = document.querySelector("#total-carrito");

// ---------- 2. El ESTADO ----------
// CONCEPTO 24: esta pantalla no "crea" el carrito, solo lo LEE.
// Es el mismo localStorage que llenó app.js en la otra pantalla.
// Por eso el carrito "viaja" solo entre index.html y carrito.html:
// ambas leen y escriben la misma clave "carrito".
let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

// ---------- 3. Pintar en pantalla ----------
function pintarCarrito() {
  if (carrito.length === 0) {
    $lineasCarrito.innerHTML = `
      <div class="vacio">
        <h2>Tu carrito está vacío</h2>
        <p>Agrega productos desde la <a href="/">página principal</a>.</p>
      </div>`;
    $totalCarrito.textContent = "";
    return;
  }

  $lineasCarrito.innerHTML = carrito.map(plantillaLinea).join("");

  // CONCEPTO 25: .reduce() para sumar precio × cantidad de cada línea.
  // Es el mismo patrón que actualizarContador() en app.js (ahí sumaba
  // cantidades; acá sumamos precios), pero aplicado a otra cuenta.
  const total = carrito.reduce((suma, linea) => suma + linea.precio * linea.cantidad, 0);
  $totalCarrito.innerHTML = `Total: <strong>${formatearPrecio(total)}</strong>`;
}

function plantillaLinea(linea) {
  const subtotal = linea.precio * linea.cantidad;

  return `
    <article class="producto">
      <div class="producto__info">
        <h2 class="producto__nombre">${linea.nombre}</h2>
        <p class="producto__envio">Cantidad: ${linea.cantidad}</p>
        <p class="producto__precio">${formatearPrecio(subtotal)}</p>
      </div>

      <div class="producto__accion">
        <!-- data-id: igual que en app.js, así el botón "recuerda" la línea -->
        <button class="btn-agregar btn-eliminar" data-id="${linea.id}">Eliminar</button>
      </div>
    </article>`;
}

function formatearPrecio(valor) {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: "USD",
  }).format(valor);
}

// ---------- 4. Eliminar una línea ----------
function eliminarDelCarrito(id) {
  // CONCEPTO 26: no existe "borrar este elemento" directo en un array.
  // El patrón normal en JS es .filter(): te quedás con TODOS los
  // elementos EXCEPTO el que querés sacar (el que cumple id === id
  // queda afuera porque la función devuelve false para ese).
  carrito = carrito.filter((linea) => linea.id !== id);

  // Volvemos a guardar el array ya actualizado, y repintamos.
  localStorage.setItem("carrito", JSON.stringify(carrito));
  pintarCarrito();
}

// ---------- 5. Eventos ----------
// Misma DELEGACIÓN que en app.js: escuchamos en el contenedor
// permanente, no en los botones (que se destruyen y recrean).
$lineasCarrito.addEventListener("click", (evento) => {
  const boton = evento.target.closest(".btn-eliminar");
  if (!boton) return;

  eliminarDelCarrito(Number(boton.dataset.id));
});

// ---------- 6. Arranque ----------
pintarCarrito();