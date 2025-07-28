// routes/products.js
const router = require('express').Router();
const productModel = require('../models/product'); // ודא שזה המודל הנכון

// Middleware לדוגמא לבדיקת הרשאות אדמין (פשוט להמחשה)
// במערכת אמיתית, זה צריך להיות middleware מורכב יותר שמחובר לאימות משתמשים
function adminMiddleware(req, res, next) {
  // במערכת אמיתית, תבדוק כאן את ה-req.user שנוצר ע"י מידלוור אימות
  // לדוגמה: if (!req.user || !req.user.isAdmin) { ... }
  // לצורך ההדגמה, נניח שהאדמין מידלוור לא מונע פעולה
    console.log("Admin middleware invoked. (Assuming admin for demo purposes)");
  next(); // המשך לראוט הבא
}


// --- GET /products - קבלת כל המוצרים עם אפשרויות סינון וחיפוש ---
router.get('/', async (req, res) => {
  try {
    const filter = {};
    const { category, minPrice, maxPrice, searchTerm } = req.query;

    // סינון לפי קטגוריה
    if (category) {
      filter.product_category = category;
    }

    // סינון לפי טווח מחירים
    if (minPrice || maxPrice) {
      filter.product_price = {};
      if (minPrice) {
        filter.product_price.$gte = parseFloat(minPrice); // $gte = Greater Than or Equal
      }
      if (maxPrice) {
        filter.product_price.$lte = parseFloat(maxPrice); // $lte = Less Than or Equal
      }
    }

    // סינון לפי מונח חיפוש (שם מוצר או תיאור)
    if (searchTerm) {
        // שימוש בביטוי רגולרי לחיפוש גמיש (case-insensitive)
        filter.$or = [
            { product_name: { $regex: searchTerm, $options: 'i' } },
            { product_description: { $regex: searchTerm, $options: 'i' } }
        ];
    }

    const products = await productModel.find(filter);
    res.json(products);
  } catch (err) {
    console.error("Error in GET /api/products:", err);
    res.status(500).json({ message: err.message });
  }
});

// --- GET /products/:id - קבלת פרטי מוצר ספציפי לפי ID ---
router.get('/:id', async (req, res) => {
    try {
        const product = await productModel.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    } catch (err) {
        console.error("Error in GET /api/products/:id:", err);
        res.status(500).json({ message: err.message });
    }
});


// --- POST /products - יצירת מוצר חדש (דורש הרשאות אדמין) ---
router.post('/', adminMiddleware, async (req, res) => {
 try {
    // Destructuring של שדות המוצר כפי שהם מוגדרים במודל product.js
    const { product_name, product_price, product_description, product_category, product_quantity } = req.body;

    // בדיקות ולידציה בסיסיות
    if (!product_name || !product_price || !product_quantity || typeof product_price !== 'number' || typeof product_quantity !== 'number' || product_quantity < 0) {
        return res.status(400).json({ message: 'Missing or invalid required product fields: name, price (number), quantity (non-negative number)' });
    }

    const newProduct = new productModel({
        product_name,
        product_price,
        product_description: product_description || '', // הגדר ערך ברירת מחדל אם לא קיים
        product_category: product_category || 'כללי', // הגדר ערך ברירת מחדל אם לא קיים
        product_quantity
    });

    await newProduct.save();
    res.status(201).json({ message: 'Product created successfully', product: newProduct });
} catch (err) {
    console.error("Error in POST /api/products:", err);
    res.status(500).json({ message: err.message });
 }
});


// --- PATCH /products/:id - עדכון מוצר קיים (דורש הרשאות אדמין) ---
router.patch('/:id', adminMiddleware, async (req, res) => {
 try {
    const updates = req.body;
    // אופציה: ניתן להוסיף ולידציה לשדות ה-updates
    if (updates.product_quantity && typeof updates.product_quantity !== 'number' || updates.product_quantity < 0) {
        return res.status(400).json({ message: 'product_quantity must be a non-negative number.' });
    }

    // `new: true` מחזיר את המסמך המעודכן, `runValidators: true` מפעיל ולידציה על העדכונים
    const product = await productModel.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product updated successfully', product });
 } catch (err) {
    console.error("Error in PATCH /api/products/:id:", err);
    res.status(500).json({ message: err.message });
 }
});


// --- DELETE /products/:id - מחיקת מוצר (דורש הרשאות אדמין) ---
router.delete('/:id', adminMiddleware, async (req, res) => {
    try {
        // מצא ומחק את המוצר
        const product = await productModel.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        // אופציונלי: כאן תוכל להוסיף לוגיקה למחיקת הפריט מכל העגלות
        // שבהן הוא נמצא, כדי למנוע "פריטי יתום" בעגלות.
        // דוגמה (דורש אימפורט cartModel למעלה):
        // await cartModel.updateMany(
        //     { 'items.product': req.params.id },
        //     { $pull: { items: { product: req.params.id } } }
        // );

        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        console.error("Error in DELETE /api/products/:id:", err);
        res.status(500).json({ message: err.message });
    }
});


module.exports = router;