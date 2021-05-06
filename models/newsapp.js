const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NewsappSchema = new Schema({
    sourcename: String,
    author: String,
    title: String,
    description: String,
    url: String,
    urlToImage: String,
    publishedAt: String,
    Content: String
});

module.exports = mongoose.model('Newsapp',NewsappSchema);