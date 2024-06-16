require('dotenv').config(); // Load environment variables
const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const cloudinaryUpload = require('./config/cloudinary'); // Cloudinary configuration
const upload = require('./config/multerconfig');
const app = express();
const mongoose = require('./config/db'); // Ensure the database connection is established
const userModel = require("./models/user");
const postModel = require("./models/post");
const { formatDistanceToNow } = require('date-fns');

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
    try {
        console.log(req.file); // Log the received file object

        if (!req.file) {
            console.log("No file received");
            return res.status(400).send("No file received or invalid file type");
        }

        // Upload file to Cloudinary
        const cloudinaryResult = await cloudinaryUpload(req.file);

        if (!cloudinaryResult || !cloudinaryResult.secure_url) {
            throw new Error("Cloudinary upload failed or returned invalid response");
        }

        // Update user's profile pic in the database
        let user = await userModel.findOne({ email: req.user.email });
        user.profilepic = cloudinaryResult.secure_url;
        await user.save();

        res.redirect('/profile');
    } catch (error) {
        console.error("Error uploading file to Cloudinary:", error);
        res.status(500).send("Error uploading file");
    }
});

app.get("/login", (req, res) => {
    res.render('login');
});

app.post("/register", async (req, res) => {
    try {
        let { username, name, age, email, password } = req.body;
        let user = await userModel.findOne({ email });
        if (user) return res.status(400).send("User already registered");

        bcrypt.genSalt(10, (err, salt) => {
            if (err) throw err;

            bcrypt.hash(password, salt, async (err, hash) => {
                if (err) throw err;

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
    } catch (error) {
        console.error("Error during registration:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/login", async (req, res) => {
    try {
        let { email, password } = req.body;
        let user = await userModel.findOne({ email });

        if (!user) {
            console.log('User not found');
            return res.redirect('/login');
        }

        bcrypt.compare(password, user.password, (err, result) => {
            if (err) throw err;

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

app.get('/profile', isLoggedIn, async (req, res) => {
    try {
        let user = await userModel.findOne({ email: req.user.email }).populate('posts');
        if (!user) {
            return res.status(404).render('error', { message: 'User not found' });
        }
        res.render('profile', { user, formatDistanceToNow });
    } catch (error) {
        console.error('Error finding user:', error);
        res.status(500).render('error', { message: 'Internal Server Error' });
    }
});

app.get('/edit/:id', isLoggedIn, async (req, res) => {
    try {
        let post = await postModel.findOne({ _id: req.params.id }).populate('user');
        res.render('edit', { post });
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/delete/:id', isLoggedIn, async (req, res) => {
    try {
        const post = await postModel.findById(req.params.id);
        if (!post) {
            return res.redirect('/profile');
        }
        await postModel.deleteOne({ _id: req.params.id });
        res.redirect('/profile');
    } catch (error) {
        console.error('Error deleting post:', error);
        res.redirect('/profile');
    }
});
app.get('/delete/user/:id', isLoggedIn, async (req, res) => {
    try {
        const user = await userModel.findById(req.params.id);
        if (!user) {
            return res.redirect('/users/data');
        }
        await userModel.deleteOne({ _id: req.params.id });
        res.redirect('/users/data');
    } catch (error) {
        console.error('Error deleting user:', error);
        res.redirect('/users/data');
    }
});

app.get('/likes/:id', async (req, res) => {
    try { 
        const post = await postModel.findById(req.params.id).populate('likes'); // Populate the 'likes' field
        if (!post) {
            console.log(`No post found with ID: ${req.params.id}`);
            return res.redirect('/feed');
        }
        res.render('likes', { likes: post.likes }); // Pass the list of users who liked the post to the view
    } catch (err) { 
        console.error('Error fetching likes:', err); // Log the actual error variable
        res.redirect('/feed');
    }
});

app.get('/like/:id', isLoggedIn, async (req, res) => {
    try {
        let post = await postModel.findOne({ _id: req.params.id }).populate('user');
        if (post.likes.indexOf(req.user.userid) === -1) {
            post.likes.push(req.user.userid);
        } else {
            post.likes.splice(post.likes.indexOf(req.user.userid), 1);
        }

        await post.save();
        res.redirect('/feed');
    } catch (error) {
        console.error('Error liking post:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/update/:id', isLoggedIn, async (req, res) => {
    try {
        await postModel.findOneAndUpdate({ _id: req.params.id }, { content: req.body.content });
        res.redirect('/feed');
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/feed', isLoggedIn, async (req, res) => {
    try {
        let posts = await postModel.find().populate('user');
        let user = await userModel.findOne({ email: req.user.email });
        res.render('home', { posts, profile: user, formatDistanceToNow });
    } catch (error) {
        console.error('Error fetching feed:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/user/:username', isLoggedIn, async (req, res) => {
    try {
        let user = await userModel.findOne({ username: req.params.username }).populate('posts');
        if (!user) {
            return res.status(404).render('error', { message: 'User not found' });
        }
        let userprofile = await userModel.findOne({ email: req.user.email });
        res.render('userprofile', { user, profile: userprofile, formatDistanceToNow });
    } catch (error) {
        console.error('Error finding user:', error);
        res.status(500).render('error', { message: 'Internal Server Error' });
    }
});

app.post('/post', isLoggedIn, async (req, res) => {
    try {
        let user = await userModel.findOne({ email: req.user.email });
        let { content } = req.body;
        let post = await postModel.create({
            user: user._id,
            content
        });
        user.posts.push(post._id);
        await user.save();
        res.redirect('/profile');
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/api/users', async (req, res) => {
    try {
        let users = await userModel.find();
        res.send(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/api/posts', async (req, res) => {
    try {
        let posts = await postModel.find();
        res.send(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/users/data', isLoggedIn, async (req, res) => {
    try {
        let users = await userModel.find();
        res.render('adminpage', { users })
    }
    catch (err) {
        console.log(err);
        res.status(500).send('Internal Server Error');
    }
})

app.listen(3000, () => {
    console.log("server is running");
});
