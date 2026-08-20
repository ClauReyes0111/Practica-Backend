// ============================================================
//  seed.js → "siembra" la base de datos con productos de ejemplo.
//  Se corre a mano cuando querés (re)llenar Mongo:
//
//    npm run seed
//
//  Borra lo que haya en la colección y la vuelve a llenar, así que
//  siempre queda en el mismo estado conocido.
// ============================================================
require("dotenv").config();
const mongoose = require("mongoose");

const conectarDB = require("./db");
const Producto = require("./models/Producto");
const productos = require("./productos");

async function main() {
  await conectarDB();

  await Producto.deleteMany({});
  await Producto.insertMany(productos);

  console.log(`  Sembrados ${productos.length} productos.`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("  Error sembrando la base:", error.message);
  process.exit(1);
});
