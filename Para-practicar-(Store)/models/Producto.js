// ============================================================
//  models/Producto.js → el "molde" (Schema) de un producto en Mongo
// ============================================================
//
// CONCEPTO 18: un Schema describe los campos y tipos que va a tener
// cada documento. Mongoose valida contra esto ANTES de guardar, así
// que un dato con la forma equivocada nunca llega a la base.
const mongoose = require("mongoose");

const esquemaProducto = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  nombre: { type: String, required: true },
  marca: { type: String, required: true },
  categoria: { type: String, required: true },
  precio: { type: Number, required: true },
  precioAnterior: { type: Number, default: null },
  rating: { type: Number, required: true },
  resenas: { type: Number, required: true },
  envioGratis: { type: Boolean, default: false },
  imagen: { type: String },
});

// CONCEPTO 19: mongoose.model(nombre, schema) crea el "modelo": la
// clase que usamos para leer/escribir en la colección. Mongoose
// pluraliza "Producto" solo → guarda en la colección "productos".
module.exports = mongoose.model("Producto", esquemaProducto);
