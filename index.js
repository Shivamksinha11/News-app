const mongoose=require('mongoose');
const seedHelpers=require('./seedHelpers');
const Newsapp=require('./models/newsapp');

mongoose.connect('mongodb://localhost:27017/news-app',{
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
});

const db=mongoose.connection;
db.on("error",console.error.bind(console, "connection error: "));
db.once("open",()=>{
    console.log("Database connected");
});

const seedDB = async ()=>{
    await Newsapp.deleteMany({});
    for(let i=0;i<20;i++){
        const news=new Newsapp({
            sourcename: `${seedHelpers[i].source.name}`,
            author: `${seedHelpers[i].author}`,
            description: `${seedHelpers[i].description}`,
            title: `${seedHelpers[i].title}`,
            url: `${seedHelpers[i].url}`,
            urlToImage: `${seedHelpers[i].urlToImage}`,
            publishedAt: `${seedHelpers[i].publishedAt}`,
            Content: `${seedHelpers[i].content}`
        })
        await news.save();
    }
}

seedDB()
.then(()=>{
    mongoose.connection.close();
})