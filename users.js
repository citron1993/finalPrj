// const router = require('express').Router();

// const usersModel=require("../models/users");


// router.get("/",(req,res)=>{ 
// res.send(`${req.method} Get request for users`)
// });

// //////////////////////////////////////////////////////////////
// // router.post("/",async (req,res)=>{
// // try{
// // const testUser={firstname:'itay',
// // lastname:'citron',
// // email:'citron25693@getMaxListeners.com',
// // phone:'0545355458',
// // gender:'male'
// // }
// // const newuser= new  usersModel(testUser)
// // await  newuser.save();
// // res.send(`${req.method} new user  save succesesfully`)
// // }
// // catch(err){
// // res.status(400).send(err)    
// // }
// /////////////////////////////////////////////////////////////
// router.post("/", async (req, res) => {
//   try {
//     const { username, email, password } = req.body;

//     // כאן אפשר להוסיף בדיקות אם רוצים (למשל אם username כבר קיים)

//     const newUser = new usersModel({ username, email, password });
//     await newUser.save();

//     res.status(201).json({ message: "User created successfully", user: newUser });
//   } catch (err) {
//     res.status(500).json({ message: "Error creating user", error: err.message });
//   }
// });
// /////////////////////////////////////////////////////////////
// router.delete("/",(req,res)=>{
// try{
// res.send(`${req.method} user was deleted`)
// }
// catch(err){
// res.status(400).send(err)
// }
// });
// //////////////////////////////////////////////////////////////
// router.put("/",(req,res)=>{
//  try{
//  res.send(`${req.method} user was updeat succesesfully`)
//  }
// catch(err){
// res.status(400).send(err)
// }
// });
// /////////////////////////////////////////////////////


// module.exports=router;

///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const usersModel = require("../models/users");

// יצירת משתמש חדש עם הצפנת סיסמה
router.post("/", async (req, res) => {
  try {
    const { username, email, password, profile } = req.body;

    // בדיקה אם המשתמש כבר קיים
    const existingUser = await usersModel.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username already taken" });
    }

    // הצפנת הסיסמה
    const hashedPassword = await bcrypt.hash(password, 10);

    // יצירת משתמש חדש
    const newUser = new usersModel({
      username,
      email,
      password: hashedPassword,
      profile
    });
    await newUser.save();

    res.status(201).json({ message: "User created successfully", userId: newUser._id });
  } catch (err) {
    res.status(500).json({ message: "Error creating user", error: err.message });
  }
});

// לדוגמא: מחיקת משתמש (צריך להוסיף אימות במציאות)
router.delete("/", async (req, res) => {
  try {
    const { userId } = req.body; // או מזהה אחר לאימות
    if (!userId) return res.status(400).json({ message: "Missing userId" });

    await usersModel.findByIdAndDelete(userId);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// עדכון משתמש (כאן למשל עדכון פרופיל)
router.put("/", async (req, res) => {
  try {
    const { userId, profile } = req.body;
    if (!userId || !profile) return res.status(400).json({ message: "Missing data" });

    const user = await usersModel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.profile = { ...user.profile.toObject(), ...profile };
    await user.save();

    res.json({ message: "User updated successfully", profile: user.profile });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const user = await usersModel.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: "Invalid user ID", error: err.message });
  }
});
module.exports = router;
