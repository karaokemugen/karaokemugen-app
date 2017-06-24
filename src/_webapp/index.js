import http from 'http';
import path from 'path';
import express from 'express';
import exphbs from 'express-handlebars';

const port = 1337;

let app = express();
app.engine('hbs', exphbs({layoutsDir: path.join(__dirname, 'views/layouts/'), extname: '.hbs'}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', function (req, res) {
    res.render('home', {"layout": "main"});
});
app.get('/coucou', function (req, res) {
    res.render('home', {"layout": "test"});
});
app.use(function (req, res, next) {
    res.status(404);

    // respond with html page
    if (req.accepts('html')) {
        res.render('404', {url: req.url});
        return;
    }

    // default to plain-text. send()
    res.type('txt').send('Not found');
});

app.listen(port);

console.log(`server started on port ${port}`);
