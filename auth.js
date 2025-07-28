const express = require("express");
const bcrypt = require("bcrypt");
const User = require('../models/users');
const jwt = require("jsonwebtoken");
const router = express.Router();
require('dotenv').config();
process.env.JWT_SECRET;


  console.log("✅ auth.js loaded");
////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////

// רישום משתמש
router.post("/signup", async (req, res) => {
  try {
    const  { username, email, password } = req.body;

    // בדיקה אם המשתמש כבר קיים
    const existingUser = await User.findOne({
  $or: [{ username }, { email }]
});
if (existingUser) {
  return res.status(400).json({ message: "Username or email already taken" });
}


    // הצפנת הסיסמה
    const hashedPassword = await bcrypt.hash(password, 10);

    // יצירת משתמש
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

  
   
    

    // שליחת טוקן כ-cookie
    res.cookie("token", newUser.id.toString(), {
      httpOnly: true,
      secure: false, 
    });

    res.status(201).json({ message: "User created", userId: newUser._id });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});
////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////
// התחברות
router.post("/login", async (req, res) => {
  try {
    console.log("🔐 login route called");
    const { username, password } = req.body;

    // בדיקת קיום המשתמש
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // בדיקת סיסמה
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    
    const secretKey=process.env.JWT_SECRET
    // יצירת טוקן
    const token = jwt.sign({ userId: user._id }, secretKey, {expiresIn: "1h"});

    // שליחת הטוקן ב-cookie
    res.status(200).json({ 
  message: "logged in successfully", 
  token, 
  userId: user._id, 
  username: user.username 
});


   
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
