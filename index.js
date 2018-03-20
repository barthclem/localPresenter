const Converter = require('ppt-png');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const socket = require('socket.io');
const glob = require('glob');

const app = express();
const server = http.createServer(app);
const io = socket(server);
const link= {};
const images = [];
let currentIndex =1;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(crossOriginMiddleWare());
app.get('/', (req, res, next) => {
    res.sendFile(__dirname+'/index.html');
});
app.get('/:link', (req, res, next)=> {
    const link = req.params.link;
    fs.readFile(`output/${images[1]}`, function(err, buf){
        if(err) {
            res.json({success: 'false',
            message: `Unable to Retrieve `,
            error: error
          });
        } else {
            res.json({success: 'true',
            message: `This is the link that you entered - http://localhost:4000/${link}`,
          });
        }
       
    });
  
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
            fs.readFile(`output/${images[currentIndex]}`, function(err, buf){
               if(err) {
                   console.log(`Could not fetch the first image`);
                socket.emit('start-res', {
                    message: 'you are welcome',
                    image: false,
                    buf: []
                });
               } else {
                socket.emit('start-res', {
                    message: 'you are welcome',
                    image: true,
                    buf: buf.toString('base64')
                });
               }
            });
            
        });
        socket.on('slide-next', (data) => {
            currentIndex = currentIndex === images.length? 1 : ++currentIndex;
            console.log(` Next Slide -> ${currentIndex}`);
            moveSlide(io, data, 'next-slide');
        });

        socket.on('slide-prev', (data) => {
            currentIndex = currentIndex === images.length? 1 : --currentIndex;
            console.log(` Prev Slide -> ${currentIndex}`);
            moveSlide(io, data, 'prev-slide');
        });

    });
}

function moveSlide(io, data, event) {
   // if(data.admin === link.admin) {
        fs.readFile(`output/${images[currentIndex]}`, function(err, buf){
            if(err) {
                io.emit(event, {
                    image: false,
                    buf: [],
                    currentIndex: currentIndex,
                    totalNumber: images.length,
                    canNext: currentIndex < images.length,
                    canPrev: currentIndex > 1
                });
            } else {
                io.emit(event, {
                    image: true,
                    buf: buf.toString('base64'),
                    currentIndex: currentIndex,
                    totalNumber: images.length,
                    canNext: currentIndex < images.length,
                    canPrev: currentIndex > 1
                });
            }
            
        });
    // } else {
    //     io.broadcast('slide-nav-error', {
    //         success: false,
    //         message: 'You do not have the authorization to use this feature'
    //     });
    // }
}
function getAllImageFiles() {
    return new Promise((resolve, reject) => {
        if(fs.existsSync('output')) {
            fs.readdirSync('output').forEach(
                (file, index) => {
                    images.push(file);
                    console.log(`Loaded Image Index => ${index}`);
                }
            );

            return resolve(images);
    
        }
        else {
            return reject('files not resolve');
        }
    })
    
}
glob('./*.ppt', {}, (error, files) => {
    console.log('files length : ', files.length);
    if(files) {
        new Converter({
            files:          files,
            output:         'output/',
            invert:         false,
            deletePdfFile:  false,
            outputType:     'png',
            logLevel:       2,
            fileNameFormat: 'result%d',
            callback:       function(data) {
                getAllImageFiles()
                .then(imageArray => {
                    console.log('images', JSON.stringify(imageArray));
                    startServer();
                    startSocketServer();
                })
                .catch(error => {
                    console.log(`couldn't read all files`);
                });
            
                console.log(data.failed, data.success.length, data.files.length, data.time);
            }
        }).run();
       
    }
});

