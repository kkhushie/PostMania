require('dotenv').config(); // Load environment variables
const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const upload = require('./config/multerconfig');
const app = express();
const mongoose = require('./config/db'); // Ensure the database connection is established
const userModel = require("./models/user");
const postModel = require("./models/post");

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

let isLoggedIn = (req, res, next) => {
    if (!req.cookies.token) {
        return res.redirect('/login');
    }

    try {
        req.user = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    } catch (err) {
        console.error("Error verifying token:", err.message);
        return res.redirect('/login');
    }

    next();
};

app.get("/", (req, res) => {
    res.render('index');
});

app.get("/profile/upload", (req, res) => {
    res.render('profileupload');
});

app.post("/upload", isLoggedIn, upload.single('image'), async (req, res) => {
    if (!req.file) {
        console.log("No file received");
        return res.status(400).send("No file received");
    }
    let user = await userModel.findOne({ email: req.user.email });
    user.profilepic = req.file.filename;
    console.log(req.file);
    await user.save();
    res.redirect('/profile');
});

app.get("/login", (req, res) => {
    res.render('login');
});

app.post("/register", async (req, res) => {
    let { username, name, age, email, password } = req.body;
    let user = await userModel.findOne({ email });
    if (user) return res.status(500).send("User already registered");

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            user = await userModel.create({
                username: username,
                name: name,
                age: age,
                email: email,
                password: hash
            });

            let token = jwt.sign({ email: email, userid: user._id }, process.env.JWT_SECRET);
            res.cookie("token", token, { secure: true, httpOnly: true });
            res.redirect("/feed");
        });
    });
});

app.post("/login", async (req, res) => {
    let { email, password } = req.body;
    console.log(`Email: ${email}, Password: ${password}`);

    try {
        let user = await userModel.findOne({ email });
        if (!user) {
            console.log('User not found');
            return res.redirect('/login');
        }

        bcrypt.compare(password, user.password, (err, result) => {
            if (err) {
                console.error('Error comparing passwords', err);
                return res.redirect('/login');
            }
            if (result) {
                let token = jwt.sign({ email: email, userid: user._id }, process.env.JWT_SECRET);
                res.cookie("token", token, { secure: false, httpOnly: true }); // Set secure to true if using HTTPS
                res.redirect('/feed');
            } else {
                console.log('Password mismatch');
                res.redirect("/login");
            }
        });
    } catch (error) {
        console.error('Error during login process', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get("/logout", (req, res) => {
    res.cookie("token", "");
    res.redirect("/login");
});

app.get('/profile/', isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email }).populate('posts');
    res.render('profile', { user });
});

app.get('/edit/:id', isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({ _id: req.params.id }).populate('user');
    res.render('edit', { post });
});

app.get('/like/:id', isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({ _id: req.params.id }).populate('user');
    if (post.likes.indexOf(req.user.userid) === -1) {
        post.likes.push(req.user.userid);
    } else {
        post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    }

    await post.save();
    res.redirect('/feed');
});

app.post('/update/:id', isLoggedIn, async (req, res) => {
    let post = await postModel.findOneAndUpdate({ _id: req.params.id }, { content: req.body.content });
    res.redirect('/feed');
});

app.get('/feed', isLoggedIn, async (req, res) => {
    let posts = await postModel.find().populate('user');
    let user = await userModel.findOne({ email: req.user.email });
    res.render('home', { posts, profile: user });
});

app.post('/post', isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email });
    let { content } = req.body;
    let post = await postModel.create({
        user: user._id,
        content
    });
    user.posts.push(post._id);
    await user.save();
    res.redirect('/profile');
});

app.listen(3000, () => {
    console.log("server is running");
});
