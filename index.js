const Converter = require('ppt-png');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const socket = require('socket.io');

const path    = require('path');
const pdf2img = require('pdf2img');

const inputFile = __dirname + '/test.pdf';

const app = express();
const server = http.createServer(app);
const io = socket(server);
const link= {};
let images = [];
let currentIndex =0;
let presenter = '';
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(crossOriginMiddleWare());
app.use(express.static(__dirname+ '/public'));
app.get('/', (req, res, next) => {
    res.sendFile(__dirname+'/public/index1.html');
});


app.get('/link/:link', (req, res, next)=> {
    const link = req.params.link;
    res.json({success: 'true',
            message: `This is the link that you entered - http://localhost:4000/${link}`,
          });
  
});

app.get('/presenter', (req, res, next)=> {
    res.sendFile(__dirname+'/public/presenter.html');
});

app.post('/presenter', (req, res, next) => {
    const body = req.body;
    presenter = req.body.presenter? req.body.presenter : presenter;
    console.log(`The presenter is -> ${presenter}`);
    res.sendFile(__dirname+'/public/index1.html');
});

app.post('/create', (req, res, next) => {
   const body = req.body;
   if(!body.title || !body.admin) {
       res.json({
           success: false,
           message: 'Please check the post body and try again'
       });
   }
   else {
       link = body;
       console.log(`A link has been successfully created.. hurray`);
    res.json({
        success: true,
        message: 'Successfully created',
        link: `http://localhost:4000/${body.title}`
    });
   }
});

function crossOriginMiddleWare() {
    return (req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
    };
}
function startServer() {

    server.listen(4000,  () => {
        console.log('Server is started');
    });
}

function startSocketServer() {
    io.on("connection", (socket) => {
        console.log(`A new user is connected`);
        socket.on('start', (data) => {
            fs.readFile(`output/${images[currentIndex]?images[currentIndex]['name']: 'image.png'}`, function(err, buf){
               if(err) {
                   console.log(`Could not fetch the first image`);
                socket.emit('start-res', {
                    message: 'you are welcome',
                    image: false,
                    buf: [],
                    currentIndex: images[currentIndex]['page'],
                    totalNumber: images.length,
                    presenter: presenter
                });
               } else {
                socket.emit('start-res', {
                    message: 'you are welcome',
                    image: true,
                    buf: buf.toString('base64'),
                    currentIndex: images[currentIndex]['page'],
                    totalNumber: images.length,
                    presenter: presenter
                });
               }
            });
            
        });
        socket.on('slide-next', (data) => {
            if(data.presenting){
                currentIndex = ++currentIndex === images.length ? 0 : currentIndex;
                console.log(` Next Slide -> ${currentIndex} Total Slides -> ${images.length}`);    
                moveSlide(io, data, 'next-slide');
            }
        });

        socket.on('slide-prev', (data) => {
            if(data.presenting){
            currentIndex =  currentIndex > 0? --currentIndex: 0;
            console.log(`Prev Slide -> ${currentIndex}`);
            moveSlide(io, data, 'prev-slide');
            }
        });

    });
}

function moveSlide(io, data, event) {
        fs.readFile(`output/${images[currentIndex]?images[currentIndex]['name']: 'image.png'}`, function(err, buf){
            if(err) {
                io.emit(event, {
                    image: false,
                    buf: [],
                    totalNumber: images.length
                });
            } else {
                io.emit(event, {
                    image: true,
                    buf: buf.toString('base64'),
                    currentIndex: images[currentIndex]['page'],
                    totalNumber: images.length,
                    presenter: presenter,
                    canNext: currentIndex < images.length,
                    canPrev: currentIndex > 1
                });
            }
            
        });
}


pdf2img.setOptions({
    type: 'png',                                // png or jpg, default jpg 
    size: 1024,                                 // default 1024 
    density: 600,                               // default 600 
    outputdir: __dirname + path.sep + 'output', // output folder, default null (if null given, then it will create folder name same as file name) 
    outputname: 'outputFile',                         // output file name, dafault null (if null given, then it will create image name same as input name) 
    page: null                                  // convert selected page, default null (if null given, then it will convert all pages) 
  });
  startServer();
pdf2img.convert(inputFile, function(err, info) {
    if (err) console.log(err)
    else {
        console.log(info);
        images = info.message;
        //startServer();
        startSocketServer();
    }
  });


