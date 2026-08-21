// ============================================================
//  admin.js  →  Panel de productos: crear, editar y borrar.
//  Esta es la pantalla que de verdad "usa" la base de datos: antes,
//  con el array en memoria, no había forma de guardar cambios de
//  manera permanente. Ahora sí, porque MongoDB vive fuera del
//  proceso de Node y sobrevive aunque reinicies el servidor.
// ============================================================

// ---------- 1. Referencias al HTML ----------
// CONCEPTO 27: agarramos TODOS los campos del formulario de una vez.
// El campo oculto "campo-id" es el que nos dice si estamos creando
// (vacío) o editando (tiene un id).
const $form = document.querySelector("#form-producto");
const $campoId = document.querySelector("#campo-id");
const $campoNombre = document.querySelector("#campo-nombre");
const $campoMarca = document.querySelector("#campo-marca");
const $campoCategoria = document.querySelector("#campo-categoria");
const $campoPrecio = document.querySelector("#campo-precio");
const $campoPrecioAnterior = document.querySelector("#campo-precioAnterior");
const $campoRating = document.querySelector("#campo-rating");
const $campoResenas = document.querySelector("#campo-resenas");
const $campoImagen = document.querySelector("#campo-imagen");
const $campoEnvioGratis = document.querySelector("#campo-envioGratis");
const $btnGuardar = document.querySelector("#btn-guardar");
const $btnCancelar = document.querySelector("#btn-cancelar");
const $formError = document.querySelector("#form-error");
const $cuerpoTabla = document.querySelector("#cuerpo-tabla");

// ---------- 2. Traer y pintar los productos ----------
// CONCEPTO 28: async/await para pedirle la lista al backend. Es el
// mismo patrón que usa app.js para pintar la tienda, solo que aquí
// vamos a una tabla en vez de tarjetas.
async function cargarProductos() {
  const respuesta = await fetch("/api/productos");
  const datos = await respuesta.json();
  pintarTabla(datos.resultados);
}

function pintarTabla(productos) {
  if (productos.length === 0) {
    $cuerpoTabla.innerHTML = `<tr><td colspan="8" class="admin-vacio">Todavía no hay productos. Agrega el primero arriba.</td></tr>`;
    return;
  }

  // CONCEPTO 29: igual que plantillaProducto() en app.js, pero armando
  // una fila de tabla (<tr>) en vez de una tarjeta.
  $cuerpoTabla.innerHTML = productos.map(plantillaFila).join("");
}

function plantillaFila(producto) {
  return `
    <tr data-id="${producto.id}">
      <td>${producto.imagen || ""}</td>
      <td>${producto.nombre}</td>
      <td>${producto.marca}</td>
      <td>${producto.categoria}</td>
      <td>$${producto.precio.toFixed(2)}</td>
      <td>${producto.rating.toFixed(1)}</td>
      <td>${producto.envioGratis ? "Sí" : "No"}</td>
      <td>
        <button type="button" class="btn-fila btn-fila--editar" data-accion="editar">Editar</button>
        <button type="button" class="btn-fila btn-fila--borrar" data-accion="borrar">Borrar</button>
      </td>
    </tr>`;
}

// ---------- 3. Guardar (crear o actualizar) ----------
// CONCEPTO 30: leemos el formulario y lo convertimos en un objeto
// plano. Number(...) convierte los campos numéricos: si no, viajarían
// como texto y el Schema de Mongoose los rechazaría.
function leerFormulario() {
  return {
    nombre: $campoNombre.value.trim(),
    marca: $campoMarca.value.trim(),
    categoria: $campoCategoria.value.trim(),
    precio: Number($campoPrecio.value),
    precioAnterior: $campoPrecioAnterior.value ? Number($campoPrecioAnterior.value) : null,
    rating: Number($campoRating.value),
    resenas: Number($campoResenas.value),
    envioGratis: $campoEnvioGratis.checked,
    imagen: $campoImagen.value.trim(),
  };
}

$form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  $formError.textContent = "";

  const datos = leerFormulario();
  const idEnEdicion = $campoId.value; // "" si estamos creando

  try {
    const respuesta = idEnEdicion
      ? await fetch(`/api/productos/${idEnEdicion}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datos),
        })
      : await fetch("/api/productos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datos),
        });

    if (!respuesta.ok) {
      const error = await respuesta.json();
      throw new Error(error.error || "No se pudo guardar el producto");
    }

    limpiarFormulario();
    await cargarProductos();
  } catch (error) {
    $formError.textContent = error.message;
  }
});

// ---------- 4. Cambiar a "modo edición" ----------
// CONCEPTO 31: rellenamos el formulario con los datos de un producto
// existente y guardamos su id en el campo oculto. Mientras ese campo
// tenga algo, el submit de arriba manda PUT en vez de POST.
async function entrarEnModoEdicion(id) {
  const respuesta = await fetch(`/api/productos/${id}`);
  if (!respuesta.ok) return;
  const producto = await respuesta.json();

  $campoId.value = producto.id;
  $campoNombre.value = producto.nombre;
  $campoMarca.value = producto.marca;
  $campoCategoria.value = producto.categoria;
  $campoPrecio.value = producto.precio;
  $campoPrecioAnterior.value = producto.precioAnterior ?? "";
  $campoRating.value = producto.rating;
  $campoResenas.value = producto.resenas;
  $campoImagen.value = producto.imagen || "";
  $campoEnvioGratis.checked = Boolean(producto.envioGratis);

  $btnGuardar.textContent = "Guardar cambios";
  $btnCancelar.hidden = false;
  $form.scrollIntoView({ behavior: "smooth" });
}

function limpiarFormulario() {
  $form.reset();
  $campoId.value = "";
  $btnGuardar.textContent = "Agregar producto";
  $btnCancelar.hidden = true;
  $formError.textContent = "";
}

$btnCancelar.addEventListener("click", limpiarFormulario);

// ---------- 5. Borrar ----------
// CONCEPTO 32: confirm() es un cuadro de diálogo nativo del navegador
// que pausa todo hasta que la persona responde Aceptar/Cancelar.
// Perfecto para una acción que no se puede deshacer.
async function eliminarProducto(id) {
  const seguro = confirm("¿Seguro que quieres borrar este producto? No se puede deshacer.");
  if (!seguro) return;

  const respuesta = await fetch(`/api/productos/${id}`, { method: "DELETE" });
  if (respuesta.ok) {
    await cargarProductos();
  }
}

// ---------- 6. Eventos de la tabla ----------
// CONCEPTO 33: misma DELEGACIÓN que usa app.js para "Agregar al
// carrito": escuchamos en $cuerpoTabla (que sí es permanente), no en
// cada botón (que se crea y destruye cada vez que repintamos la tabla).
$cuerpoTabla.addEventListener("click", (evento) => {
  const boton = evento.target.closest("button[data-accion]");
  if (!boton) return;

  const fila = boton.closest("tr");
  const id = fila.dataset.id;

  if (boton.dataset.accion === "editar") entrarEnModoEdicion(id);
  if (boton.dataset.accion === "borrar") eliminarProducto(id);
});

// ---------- 7. Arranque ----------
cargarProductos();
