// routes/cart.js
const router = require('express').Router();
const cartModel = require('../models/cart');
const productModel = require('../models/product'); // וודא שזה מיובא
const { Types } = require('mongoose');

// יצירת עגלה למשתמש (אם אין) - ראוט זה כרגע לא בשימוש ישיר מהפרונטאנד ברוב המקרים,
// אך נשאר ליתר ביטחון אם תרצה להשתמש בו בעתיד ליצירה מפורשת.
router.post('/', async (req, res) => {
  try {
    const userId = req.body.userId;
    if (!userId) return res.status(400).json({ message: 'Missing userId' });

    let cart = await cartModel.findOne({ user: userId });
    if (cart) return res.status(200).json(cart);

    cart = new cartModel({ user: userId, items: [] });
    await cart.save();

    res.status(201).json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// קבלת עגלת הקניות עם פרטי מוצרים
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ message: 'Missing userId' });

    const cart = await cartModel.findOne({ user: userId }).populate('items.product');
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- הוספת מוצר לעגלה (כולל עדכון מלאי) ---
router.post('/items', async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;
    if (!userId || !productId || typeof quantity !== 'number' || quantity < 1) {
      return res.status(400).json({ message: 'Missing or invalid fields (userId, productId, quantity must be a positive number)' });
    }

    let cart = await cartModel.findOne({ user: userId });

    // אם העגלה לא קיימת, צור אותה!
    if (!cart) {
      console.log(`No cart found for user ${userId}. Creating a new one.`);
      cart = new cartModel({ user: userId, items: [] });
      // אין צורך לשמור כאן, נשמור הכל בסוף
    }

    // בדיקה ועדכון מלאי המוצר
    const product = await productModel.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // חשוב: בדוק אם יש מספיק מלאי לפני שממשיכים
    if (product.product_quantity < quantity) {
        return res.status(400).json({ message: `לא מספיק ${product.product_name} במלאי. זמין: ${product.product_quantity}` });
    }
    
    // **הפחתת המלאי מהמוצר ב-MongoDB**
    product.product_quantity -= quantity; // הפחת את הכמות שנוספה
    await product.save(); // שמור את המוצר עם המלאי המעודכן
    console.log(`מלאי עבור ${product.product_name} עודכן ל: ${product.product_quantity}`);

    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    if (itemIndex > -1) {
      // אם המוצר כבר קיים, עדכן את הכמות בעגלה
      cart.items[itemIndex].quantity += quantity;
      cart.items[itemIndex].addedAt = new Date();
    } else {
      // אם מוצר חדש, הוסף אותו לעגלה
      cart.items.push({ product: productId, quantity, addedAt: new Date() });
    }

    await cart.save();
    // החזר את העגלה המאוכלסת
    const updatedCart = await cartModel.findOne({ user: userId }).populate('items.product');
    res.json(updatedCart);
  } catch (err) {
    console.error("Error in POST /api/cart/items:", err);
    res.status(500).json({ message: "Failed to add item to cart: " + err.message });
  }
});

// --- הסרת מוצר מהעגלה (כולל החזרת מלאי) ---
router.delete('/items/:productId', async (req, res) => {
    try {
        const userId = req.body.userId;
        const productId = req.params.productId;
        if (!userId) return res.status(400).json({ message: 'Missing userId' });

        const cart = await cartModel.findOne({ user: userId });
        if (!cart) return res.status(404).json({ message: 'Cart not found' });

        const itemToRemove = cart.items.find(item => item.product.toString() === productId);

        if (itemToRemove) {
            // **החזרת המלאי למוצר ב-MongoDB**
            const product = await productModel.findById(productId);
            if (product) {
                product.product_quantity += itemToRemove.quantity; // החזר את הכמות המלאה שהייתה בעגלה
                await product.save();
                console.log(`מלאי עבור ${product.product_name} עודכן ל: ${product.product_quantity} לאחר הסרה`);
            }
        }

        cart.items = cart.items.filter(item => item.product.toString() !== productId);
        await cart.save();

        const updatedCart = await cartModel.findOne({ user: userId }).populate('items.product');
        res.json(updatedCart);
    } catch (err) {
        console.error("Error in DELETE /api/cart/items/:productId:", err);
        res.status(500).json({ message: err.message });
    }
});

// --- עדכון כמות מוצר בעגלה (כולל עדכון מלאי) ---
router.put('/items/:productId', async (req, res) => {
    try {
        const userId = req.body.userId;
        const productId = req.params.productId;
        const { quantity } = req.body; // זו הכמות החדשה המבוקשת בעגלה
        if (!userId || typeof quantity !== 'number' || quantity < 1) {
            return res.status(400).json({ message: 'Missing or invalid fields (userId, quantity must be a positive number)' });
        }

        const cart = await cartModel.findOne({ user: userId });
        if (!cart) return res.status(404).json({ message: 'Cart not found' });

        const item = cart.items.find(item => item.product.toString() === productId);
        if (!item) return res.status(404).json({ message: 'Product not found in cart' });

        const product = await productModel.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const oldQuantityInCart = item.quantity;
        const quantityDifference = quantity - oldQuantityInCart; // ההפרש בכמות (+ אם מגדילים, - אם מקטינים)

        // אם מנסים להגדיל כמות, בדוק אם יש מספיק במלאי
        if (quantityDifference > 0) {
            if (product.product_quantity < quantityDifference) {
                return res.status(400).json({ message: `לא מספיק ${product.product_name} במלאי כדי להגדיל את הכמות. זמין: ${product.product_quantity}` });
            }
        }
        
        // **עדכון המלאי ב-MongoDB**
        product.product_quantity -= quantityDifference; // יפחית מלאי אם quantityDifference חיובי, יוסיף אם שלילי
        await product.save();
        console.log(`מלאי עבור ${product.product_name} עודכן ל: ${product.product_quantity} לאחר עדכון כמות בעגלה`);

        item.quantity = quantity; // עדכן את הכמות בעגלה
        item.addedAt = new Date();

        await cart.save();
        
        const updatedCart = await cartModel.findOne({ user: userId }).populate('items.product');
        res.json(updatedCart);
    } catch (err) {
        console.error("Error in PUT /api/cart/items/:productId:", err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;