const router = require("express").Router();
const User = require("../models/User");
const verify = require("../middleware/auth");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { loginValidation, registerValidation } = require("../validation");

router.post('/verify', async (req,res) => {
  
  const token = req.headers["auth-token"]
  
  try {
    const verified = jwt.verify(token,process.env.TOKEN_SECRET)
    req.user = verified;
    
    if (verified) return res.status(200).json({message: "good token", '_id':req.user._id, 'name':req.user.name})
  }
  catch (err) {
    res.status(400).json({message: `${err}`})
  }
  
})

router.post("/register", async (req, res) => {
  //validate user before creating user/posting to db
  //uses registerValiation from validation.js, using Joi
  const { error } = registerValidation(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  //check if user is already in db
  const emailExists = await User.findOne({
    email: req.body.email,
  });
  if (emailExists)
    return res.status(400).json({ error: "email already in use" });

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
    await user.save();
    //create token and give it to user
    const token = jwt.sign({ _id: user._id, name: user.name }, process.env.TOKEN_SECRET, {
      expiresIn: 3600,
    });
    res.header("auth-token", token);

    res.status(201).send({
      name: user.name,
      email: user.email,
      _id: user._id,
      token: token,
    });
    console.log(token);
  } catch (err) {
    res.status(500).send(err);
  }
});

//login route
router.post("/login", async (req, res) => {
  
  //validate user before creating user/posting to db
  //uses registerValiation from validation.js, using Joi
  const { error } = loginValidation(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  //check if user (email) is already in db
  const user = await User.findOne({
    email: req.body.email,
  });
  if (!user) return res.status(400).json({ error: "email not found" });
  //check if password is correct
  const validPass = await bcrypt.compare(req.body.password, user.password);
  if (!validPass) return res.status(400).json({ error: "incorrect password" });

  //create token and give it to user
  const token = jwt.sign({ _id: user._id, name:user.name }, process.env.TOKEN_SECRET, {
    expiresIn: 3600,
  });
 
  res.header("auth-token", token);
  res.status(200).json({ token });

  //   res.send("logged in");
});

module.exports = router;
