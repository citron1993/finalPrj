// models/product.js
const { Schema, model } = require('mongoose');

const productSchema = new Schema({
  product_name: {
    type: String,
    required: true
  },
  product_price: {
    type: Number,
    required: true,
    min: 0
  },
  product_description: { // שם השדה לתיאור
    type: String,
    default: ""
  },
  product_category: {
    type: String,
    default: ""
  },
  product_quantity: { // <--- **התיקון כאן: השתמש ב-product_quantity**
    type: Number,
    default: 0,
    min: 0
  }
});

const productModel = model('Product', productSchema);

module.exports = productModel;