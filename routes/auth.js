const router = require("express").Router();
const User = require("../models/User");
const verify = require('./verifyToken');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken')
const {loginValidation,registerValidation} = require('../validation')

router.post("/register", async (req, res) => {
  //validate user before creating user/posting to db
  //uses registerValiation from validation.js, using Joi
  const { error } = registerValidation(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  //check if user is already in db
  const emailExists = await User.findOne({
    email: req.body.email,
  });
  if (emailExists) return res.status(400).send("email already in use");

  //hash the password
  //using salt of 10 because I dont want the server to die
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(req.body.password, salt);

  //create a new user
  const user = new User({
    name: req.body.name,
    email: req.body.email,
    password: hashedPassword,
  });
  try {
    const savedUser = await user.save();
    res.send({
      user: user._id,
    });
  } catch (err) {
    res.status(400).send(err);
  }
});

//login route
router.post("/login", async (req, res) => {
  //validate user before creating user/posting to db
  //uses registerValiation from validation.js, using Joi
  const { error } = loginValidation(req.body);
  if (error) return res.status(400).send(error.details[0].message);
  //check if user (email) is already in db
  const user = await User.findOne({
    email: req.body.email,
  });
  if (!user) return res.status(400).send("email not found");
  //check if password is correct
  const validPass = await bcrypt.compare(req.body.password, user.password);
  if (!validPass) return res.status(400).send("password wrong");
  
  //create token and give it to user
  const token = jwt.sign({_id: user._id}, process.env.TOKEN_SECRET);
  res.header('auth-token', token).send(token)


//   res.send("logged in");
});

module.exports = router;
