if(process.env.NODE_ENV !=='production'){
    require('dotenv').config();
}

const express=require('express');
const ejsMate=require('ejs-mate');
const mongoose=require('mongoose');
const Joi=require('joi');
const methodOverride = require('method-override');
const Newsapp=require('./models/newsapp');
const flash=require('connect-flash');
const ExpressError=require('./utils/ExpressError');
const catchAsync=require('./utils/catchAsync');
const session=require('express-session');
const passport=require('passport');
const LocalStrategy=require('passport-local');
const User=require('./models/user');

const MongoStore=require('connect-mongo');
const dbUrl=process.env.DB_URL || 'mongodb://localhost:27017/news-app';

mongoose.connect(dbUrl,{
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
});

const db=mongoose.connection;
db.on("error",console.error.bind(console, "connection error: "));
db.once("open",()=>{
    console.log("Database connected");
});


const app=express();
const path=require('path');
app.engine('ejs',ejsMate)
app.set('view engine', 'ejs');
app.set('views',path.join(__dirname, 'views'));


app.use(express.urlencoded({extended: true}));
app.use(methodOverride('_method'));

const secret = process.env.SECRET || 'thisshouldbeabettersecret!';

const store= MongoStore.create({
    mongoUrl: dbUrl,
    touchAfter: 24*60*60,
    crypto: {
        secret 
    }
});


store.on('error',function(e){
    console.log("SESSION STORE ERROR", e)
})


const sessionConfig={
    store,
    secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + (1000*60*60*24*7),
        maxAge: 1000*60*60*24*7
    }
}



app.use(session(sessionConfig))
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})

const isLoggedIn = (req,res,next)=>{ 
    if(!req.isAuthenticated()){
        req.flash('error','You must be signed in first!');
        return res.redirect('/login');
    }
    next();
}

const validateNews = (req,res,next)=>{
    const newsappSchema=Joi.object({
        newsapp: Joi.object({
           // sourcename: Joi.string(),
            author: Joi.string().required(),
            title: Joi.string().required(),
            description: Joi.string().required(),
            url: Joi.string().required(),
            urlToImage: Joi.string().required(),
            publishedAt: Joi.string().required(),
            Content: Joi.string().required()
        }).required()
    })
    const {error}=newsappSchema.validate(req.body);
    if(error){
        const msg=error.details.map(el => el.message).join(',');
        throw new ExpressError(msg, 400)
    } else{
        next();
    }
}



app.get('/register', (req,res)=>{
    res.render('users/register');
})
app.post('/register', catchAsync(async(req,res,next)=>{
    try{
        const {email,username,password} = req.body;
        const user = new User({email,username});
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, err=>{
            if(err) return next(err);
            req.flash('success','Welcome to Newsapp');
            res.redirect('/newsapp');
        }) 
    }catch(e){
        req.flash('error',e.message);
        res.redirect('/register');
    }
}))

app.get('/login',(req,res)=>{
    res.render('users/login');
})
app.post('/login',passport.authenticate('local',{failureFlash: true, failureRedirect: '/login'}),(req,res)=>{
    req.flash('success','welcome back');
    res.redirect('/newsapp');
})

app.get('/logout',(req,res)=>{
    req.logout();
    req.flash('success','Successfully logged out!');
    res.redirect('/login');
})

app.get('/newsapp',isLoggedIn,catchAsync(async(req,res)=>{
    
    const newsapps=await Newsapp.find({});
    res.render('newsapp/index',{newsapps});
}))

app.get('/newsapp/new',isLoggedIn,(req,res)=>{
    res.render('newsapp/new')
})


app.post('/newsapp',validateNews,catchAsync(async(req,res)=>{
    const newsapp=new Newsapp(req.body.newsapp);
    await newsapp.save();
    req.flash('success','Successfully made a new news!');
    res.redirect(`/newsapp/${newsapp._id}`);
}))

app.get('/newsapp/:id', catchAsync(async (req, res,) => {
    const newsapp = await Newsapp.findById(req.params.id)
    res.render('newsapp/show', { newsapp });
}));

app.get('/newsapp/:id/edit', catchAsync(async (req, res) => {
    const newsapp = await Newsapp.findById(req.params.id)
    res.render('newsapp/edit', { newsapp });
}))

app.put('/newsapp/:id',validateNews,catchAsync(async (req, res) => {
    const { id } = req.params;
    const newsapp = await Newsapp.findByIdAndUpdate(id, { ...req.body.newsapp });
    req.flash('success','Successfully made a new news!');
    res.redirect(`/newsapp/${newsapp._id}`)
}));

app.delete('/newsapp/:id', catchAsync(async (req, res) => {
    const { id } = req.params;
    await Newsapp.findByIdAndDelete(id);
    res.redirect('/newsapp');
}))



app.all('*',(req,res,next)=>{
    next(new ExpressError('page not found',404))
})

app.use((err,req,res,next)=>{
    const {statusCode=500}=err;
    if(!err.message) err.message='oh no, something went wrong!'
    res.status(statusCode).render('error',{err});
})

const port=process.env.PORT || 3000;
app.listen(port, ()=>{
    console.log(`serving on port ${port}`);
})
