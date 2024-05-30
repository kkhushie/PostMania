const express = require('express')
const userModel = require("./models/user") // Assuming user model is defined here
const postModel = require("./models/post") // Assuming post model is defined here
const cookieParser = require('cookie-parser')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const path=require('path')
const upload=require('./config/multerconfig')
const app = express()

app.set("view engine", "ejs")
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname,'public')))
app.use(cookieParser())


let isLoggedIn = (req, res, next) => {
    // Check if token cookie exists
    if (!req.cookies.token) {
        return res.redirect('/login');  // Redirect to login if no token
    }

    try {
        // Verify the token and set req.user if valid
        req.user = jwt.verify(req.cookies.token, "secret") // Replace with your actual secret key
    } catch (err) {
        console.error("Error verifying token:", err.message); // Log error for debugging
        return res.redirect('/login'); // Redirect to login on invalid token or other errors
    }

    next();
}
app.get("/", (req, res) => {
    res.render('index')
})
app.get("/profile/upload", (req, res) => {
    res.render('profileupload')
})
app.post("/upload",isLoggedIn, upload.single('image'), async (req, res) => {
    if (!req.file) {
        console.log("No file received");
        return res.status(400).send("No file received");
    }
   let user= await userModel.findOne({email:req.user.email})
    user.profilepic=req.file.filename
    console.log(req.file);
    await user.save()
    res.redirect('/profile')
   
})

app.get("/login", (req, res) => {
    res.render('login')
})

app.post("/register", async (req, res) => {
    let { username, name, age, email, password } = req.body;

    let user = await userModel.findOne({ email })
    if (user) return res.status(500).send("User already registered")

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            user = await userModel.create({
                username: username,
                name: name,
                age: age,
                email: email,
                password: hash
            })

            let token = jwt.sign({ email: email, userid: user._id }, "your_secret_key_here") // Replace with your actual secret key
            res.cookie("token", token, { secure: true, httpOnly: true }); // Set secure and httpOnly flags for better security
            res.redirect("/login")
        })
    })
})

app.post("/login", async (req, res) => {
    let { email, password } = req.body;

    let user = await userModel.findOne({ email })
    if (!user) return res.redirect('/login', { message: "Incorrect email or password" }); // Informative error message

    bcrypt.compare(password, user.password, (err, result) => {
        if (result) {
            let token = jwt.sign({ email: email, userid: user._id }, "secret") // Replace with your actual secret key
            res.cookie("token", token, { secure: true, httpOnly: true }); // Set secure and httpOnly flags for better security
           res.redirect('/feed')
        } else res.redirect("/login", { message: "Incorrect email or password" }); // Informative error message
    })
})

app.get("/logout", (req, res) => {
    res.cookie("token", "")
    res.redirect("/login")
})

app.get('/profile/', isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email }).populate('posts')
    // console.log(user);
    res.render('profile', { user })

})
app.get('/edit/:id', isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({ _id:req.params.id }).populate('user')
    res.render('edit',{post})

})
app.get('/like/:id', isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({ _id:req.params.id }).populate('user')
   
    if(post.likes.indexOf(req.user.userid)===-1){
        post.likes.push(req.user.userid)
        
    }
    else{
        post.likes.splice(post.likes.indexOf(req.user.userid),1)

    }

    await post.save()
    res.redirect('/feed')

})
app.post('/update/:id', isLoggedIn, async (req, res) => {

    let post = await postModel.findOneAndUpdate({ _id:req.params.id },{content:req.body.content})
    res.redirect('/feed')

})
app.get('/feed',isLoggedIn,async (req,res)=>{
    let posts=await postModel.find().populate('user')
    // res.send(posts)
    let user=await userModel.findOne({email:req.user.email})
    res.render('home',{posts,profile:user})
    // res.redirect('/profile')
})
app.post('/post', isLoggedIn, async (req, res) => {

    let user = await userModel.findOne({ email: req.user.email })
    let { content } = req.body
    let post = await postModel.create({
        user: user._id,
        content
    })
    user.posts.push(post._id)
    await user.save()
    res.redirect('/profile')
})

app.listen(3000, () => {
    console.log("server is running");
})
