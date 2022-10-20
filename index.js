const express = require('express'); //Import the express dependency
const app = express();              //Instantiate an express app, the main work horse of this server
const port = process.env.PORT || 4000;                  //Save the port number where your server will be listening
require('dotenv').config();
var cron = require('node-cron');
const fs = require("fs");
const path = require('path');
const download = require('image-downloader')
const config = require('./config/twitter');
const Twitter = require("twitter")
const twtClient = new Twitter(config)

// node code 
var tumblr = require('tumblr.js');
let Parser = require('rss-parser');
let parser = new Parser();
console.log(" process.env.TUMBLR_CONSUMER_KEY", process.env.TUMBLR_CONSUMER_KEY);
var client = tumblr.createClient({
    consumer_key: process.env.TUMBLR_CONSUMER_KEY,
    consumer_secret: process.env.TUMBLR_CONSUMER_SECRET,
    token: process.env.TUMBLR_TOKEN,
    token_secret: process.env.TUMBLR_TOKEN_SECRET,
});
const firebaseConfig = {
    apiKey: "AIzaSyBjBAxoHBh_Sun8tn9-r89HTD21T8OMsU4",
    authDomain: "pintresttotumblr.firebaseapp.com",
    projectId: "pintresttotumblr",
    storageBucket: "pintresttotumblr.appspot.com",
    messagingSenderId: "339370960263",
    appId: "1:339370960263:web:04c8ee2ab18d0e52319f22",
    measurementId: "G-2RFH44P0P7"
};

const firebase = require("firebase");

// Required for side-effects
require("firebase/firestore");
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
// Initialize Cloud Firestore and get a reference to the service
const db = firebase.firestore();

let blogName = 'pappater';
let params = {}
const directory = './media/image/'

const tweetToTumblr = (imgUrl) =>{
    try {
        fs.readdir(directory, (err, files) => {
            if (err) throw err;
            // removing file 
            for (const file of files) {
                fs.unlink(path.join(directory, file), err => {
                    if (err) throw err;
                    console.log('file removed')
                });
            }
        
        // removed file
        // axios.get(webpageUrl)
        //     .then(function (response) {
                // let webPageData = response.data.dataList.data;
                // let webPageDataSize = webPageData.length;
                // let randomWebPageIndex = Math.floor(Math.random() * webPageDataSize);
                // let randomWebPageData = webPageData[randomWebPageIndex]
                // console.log('webpagedata',randomWebPageData)
                // let randomWebPageUrl = randomWebPageData.siteUrl;
                // let imageUrlOptimize = randomWebPageData && randomWebPageData.imageUrl && randomWebPageData.imageUrl.length > 0 && randomWebPageData.imageUrl.filter((eachUrl)=>{
                //     return eachUrl.includes('optimize')
                // })
                // console.log('imageUrl Ptomize', imageUrlOptimize)
                console.log("imgUrl", imgUrl);
                const options = {
                    url: imgUrl,
                    dest: '../../media/image/current.jpg'                // will be saved to /path/to/dest/image.jpg
                }
                console.log("options", options);
                download.image(options)
                        .then(({ filename }) => {
                            console.log("filname", filename);
                            setTimeout(()=>{
                                const imageData = fs.readFileSync("media/image/current.jpg") //replace with the path to your image
                                twtClient.post("media/upload", { media: imageData }, function (error, media, response) {
                                    if (error) {
                                        console.log(error)
                                    } else {
                                        const status = {
                                            status: "",
                                            media_ids: media.media_id_string
                                        }
    
                                        twtClient.post("statuses/update", status, function (error, tweet, response) {
                                            if (error) {
                                                console.log(error)
                                            } else {
                                                console.log("Successfully tweeted an image!")
                                            }
                                        })
                                    }
                                })
                            },5000)
                        })
            // }).catch(err => {
            //     console.log('axios error',err)
            // });
    });
    } catch (error) {
        
    }
  
}
async function doTumblrPhotoPost() {
    let feed = await parser.parseURL('https://in.pinterest.com/capecapricorn/pappater.rss');
    for (let i = 0, p = Promise.resolve(); i < feed.items.length; i++) {
        p = p.then(_ => new Promise(resolve => {
            let docRef = db.collection("tweeturls").doc("url");
            docRef.get().then((doc) => {
                if (doc.exists) {
                    let existingUrl = doc.data().data;
                    console.log("existingUrl", i);
                    let imageUrlFirstLvl = feed.items[i].content.split("src=")[1].split("><")[0].replace("236x", "originals");
                    imageUrlFirstLvl = imageUrlFirstLvl.substring(1, imageUrlFirstLvl.length - 1);
                    params.source = imageUrlFirstLvl;
                    if (!existingUrl.includes(imageUrlFirstLvl)) {
                        console.log("no include");
                        // db.collection("tweeturls").doc("url").set({ data: [...existingUrl, imageUrlFirstLvl] });
                        // post to tumblr
                        // client.createPhotoPost(blogName, params, function (err, resp) {
                        //     console.log("posted to tumblr >>>>>");
                        //     resolve();
                        // });
                        tweetToTumblr(imageUrlFirstLvl)
                        resolve();
                    }
                } else {
                    console.log("No such document!");
                }
            }).catch((error) => {
                console.log("Error getting document:", error);
            });
        }
        ));
    }



};
doTumblrPhotoPost();
cron.schedule("*/15 * * * *", () => {
console.log("calling >>>>>>> doTumblrPhotoPost()");
doTumblrPhotoPost();
});

app.get('/', (req, res) => {
    res.send('hello world')
})
app.listen(port, () => {            //server starts listening for any attempts from a client to connect at port: {port}
    console.log(`Now listening on port ${port}`);
});