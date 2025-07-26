require("dotenv").config(); // קריאה לקובץ .env

const express = require('express');
const cookieParser = require('cookie-parser');
const mongoose = require("mongoose");
const cors = require('cors');

const productsRouter = require("./routes/products");
const cartRouter = require("./routes/cart");
const authRouter = require("./routes/auth");
const usersRouter = require("./routes/users");
const authMiddleware = require("./middleware/authMiddleware");

const app = express();

// שימוש ב-cookie-parser
app.use(cookieParser());

// שימוש ב-JSON middleware
app.use(express.json());

// הגדרת CORS עם credentials
app.use(cors({
  origin: "http://127.0.0.1:5500", // כתובת הדף שלך
  credentials: true
}));

// בדיקת בריאות
app.get("/", (req, res) => {
  res.send("Hello welcome to shop API");
});

// חיבור למסד נתונים MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/artshop")
  .then(() => {
    console.log("Connected successfully to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// function authCheck(req,res,next){
// try{
//   const {auth_token}=req.cookie;
//   if(!auth_token)
//   {
//    return res.status(404).send("no token found")
//   }
//     const payload= jwt.verify(auth_token,process.env.JWT_SECRET)
//     req.userId=payload.userId
//     next();

// }
//   catch(err){
//     res.status(404).send("Error invalid token")
//   }
// }
// שימוש בנתיבי API
app.use("/api/auth", authRouter);
app.use("/api/products", authMiddleware, productsRouter);
app.use("/api/cart", authMiddleware, cartRouter);
//app.use("/api/users", authMiddleware, usersRouter);

// התחלת האזנה לפורט
const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
