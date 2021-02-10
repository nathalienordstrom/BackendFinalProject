import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcrypt-nodejs";


const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/backend";
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.Promise = Promise;


const userSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true,
    minlength: 2,
  },
  password: {
    type: String,
    required: true,
    minlength: 5,
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString("hex"),
    unique: true,
  },
});

const foodSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true,
    minlength: 2,
  },
  food_id: {
    type: Number,
  },
  rating: {
    type: Number,

  },
  timestamp: {
    type: Date,
  },
  userId: {
    type: String,
  }
})

userSchema.pre('save', async function (next) {
  const user = this;

  if (!user.isModified('password')) {
    return next();
  }

  const salt = bcrypt.genSaltSync();
  console.log(`PRE: password before hash: ${user.password}`)
  user.password = bcrypt.hashSync(user.password, salt);
  console.log(`PRE: password after hash: ${user.password}`)

  //continue with the save
  next();
});

const User = mongoose.model("User", userSchema)


foodSchema.pre('save', async function (next) {
  const food = this;

  if (!food.isModified('password')) {
    return next();
  }

  const salt = bcrypt.genSaltSync();
  console.log(`PRE: password before hash: ${food.password}`)
  food.password = bcrypt.hashSync(food.password, salt);
  console.log(`PRE: password after hash: ${food.password}`)

  //continue with the save
  next();
});

const Food = mongoose.model("Food", foodSchema)
// const User = mongoose.model("User", {
//   name: {
//     type: String,
//     unique: true,
//   },
//   password: {
//     type: String,
//     required: true,
//     minlength: 5,
//   },
//   accessToken: {
//     type: String,
//     default: () => crypto.randomBytes(128).toString("hex"),
//     unique: true,
//   },
// });

//   PORT=9000 npm start
const port = process.env.PORT || 8080;
const app = express();

// Add middlewares to enable cors and json body parsing
app.use(cors());
app.use(bodyParser.json());

const authenticateUser = async (req, res, next) => {
  try {
    const accessToken = req.header('Authorization');
    const user = await User.findOne({ accessToken });
    if (!user) {
      throw "User not found"
    }
    req.user = user;
    next();
  } catch (err) {
    const errorMessage = "Please try logging in again";
    console.log(errorMessage);
    res.status(401).json({ error: errorMessage });
  }

};



// Sign-up
app.post("/users", async (req, res) => {
  try {
    const { name, password } = req.body;
    const user = await new User({
      name,
      password,
    }).save();
    res.status(200).json({ userId: user._id, accessToken: user.accessToken });
  } catch (err) {
    res.status(400).json({ message: "Could not create user", errors: err });

  }
});

// Login
app.post("/sessions", async (req, res) => {
  try {
    const { name, password } = req.body;
    const user = await User.findOne({ name });
    if (user && bcrypt.compareSync(password, user.password)) {
      res.status(200).json({ userId: user._id, accessToken: user.accessToken })
    } else {
      throw "User not found";
    }
  } catch (err) {
    res.status(404).json({ error: err })
  }
  res.status(501).send();
});

app.get('/secret', authenticateUser);
app.get('/secret', async (req, res) => {
  console.log(`User from authenticateUser: ${req.user.name} `)
  const secretMessage = `This is a secret message for ${req.user.name}`;
  res.status(200).json({ secretMessage });
});


// Secure endpoint, user needs to be logged in to access this.
app.get('/profile', authenticateUser);
app.get('/profile', async (req, res) => {
  res.json({ name: req.user.name });
});



app.post('/food', authenticateUser);¢
app.post("/food", async (req, res) => {
  try {
    const { name, rating } = req.body;
    const food = await new Food({
      name,
      userId: req.user._id,
      rating,
    }).save();
    res.status(200).json({ foodId: food._id });
  } catch (err) {
    res.status(400).json({ message: "Could not create food", errors: err });
  
  }
});



app.get('/foods', authenticateUser);
app.get('/foods', async (req, res) => {
  res.json({ name: req.user.name });
});


// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
