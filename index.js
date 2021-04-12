const axios = require('axios');
const rax = require('retry-axios');
const schedule = require('node-schedule');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

require('dotenv').config();
rax.attach();
const mongod = new MongoMemoryServer();


const api_url = process.env.API_URL || "https://jsonplaceholder.typicode.com/todos/1";
const time = process.env.TIME.split(":") || "08:00";
let hour = Number(time[0]);
let minute = Number(time[1]);
if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    hour = 8;
    minute = 0;
}

const successSchema = new mongoose.Schema(new mongoose.Schema({}), { strict: false, collection: "Success" });
const errorSchema = new mongoose.Schema(new mongoose.Schema({}), { strict: false, collection: "Error" });
var successCollection;
var errorCollection;

(async () => {
    const uri = await mongod.getUri();
    console.log("Connection String: ", uri);
    const mongooseOpts = {
        useNewUrlParser: true,
        useUnifiedTopology: true
    };
    await mongoose.connect(uri, mongooseOpts);
    successCollection = mongoose.model('Success', successSchema);
    errorCollection = mongoose.model('Error', errorSchema);
})();


schedule.scheduleJob({ hour, minute }, () => {
    console.log('Job Invoked at - ' + new Date().toTimeString());
    fetchData()
});

function fetchData() {
    const myConfig = {
        raxConfig: {
            retry: 5,
            noResponseRetries: 5,
            onRetryAttempt: err => {
                const cfg = rax.getConfig(err);
                console.log(`Retry attempt #${cfg.currentRetryAttempt}`);
            }
        },
        timeout: 10000
    }

    axios.get(api_url, myConfig)
        .then(result => {
            console.log("<<<<<<<<<<<<<<<<== Success ==>>>>>>>>>>>>>>>>");
            try {
                successCollection.create(result.data).then(res => {
                    console.log("Response saved");
                }).catch(err => {
                    console.log("Error from db");
                })
            } catch (err) {
                console.log("Error from db");
            }
        })
        .catch(error => {
            console.log("<<<<<<<<<<<<<<<<== Error ==>>>>>>>>>>>>>>>>");
            const { message, response } = error
            try {
                errorCollection.create({ message, response }).then(res => {
                    console.log("Error saved");
                }).catch(err => {
                    console.log("Error from db");
                })
            } catch (err) {
                console.log("Error from db");
            }
        });
}