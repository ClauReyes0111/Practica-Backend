// ============================================================
//  db.js → Conexión a MongoDB usando Mongoose
// ============================================================
//
// CONCEPTO 12: Mongoose es un ODM (Object-Document Mapper): traduce
// entre documentos de MongoDB y objetos/clases de JavaScript, y nos
// deja definir un "Schema" (la forma que deben tener los documentos)
// en vez de escribir consultas sueltas a mano.
const mongoose = require("mongoose");

// CONCEPTO 13: mongoose.connect() devuelve una PROMESA. La función es
// async para poder usar await y que quien la llame sepa cuándo
// terminó de conectar (o si falló).
async function conectarDB() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/tienda";
  await mongoose.connect(uri);
  console.log(`  Mongo conectado → ${uri}`);
}

module.exports = conectarDB;
