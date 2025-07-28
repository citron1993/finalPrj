const express = require("express");
const Post = require("../models/post");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAuthor)
      return res.status(403).json({ message: "Only authors can create posts" });

    const { title, content } = req.body;
    if (!title || !content)
      return res.status(400).json({ message: "Missing fields" });

    const newPost = new Post({
      title,
      content,
      author: req.user.userId
    });

    await newPost.save();

    res.status(201).json(newPost);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
