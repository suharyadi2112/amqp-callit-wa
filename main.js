const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const amqplib = require('amqplib/callback_api');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

// Konfigurasi koneksi RabbitMQ
const queue = process.env.RABBITQUEUESENDMESSAGE //chanel
const rabbitmqHost = process.env.RABBITMQHOST;
const rabbitmqPort = process.env.RABBITMQPORT;
const rabbitmqUser = process.env.RABBITMQUSER;
const rabbitmqPassword = process.env.RABBITMQPASSWORD;

const client = new Client({
    webVersionCache: {
        type: 'remote',
        authStrategy: new LocalAuth(),
        // puppeteer: {
        //     args: ['--no-sandbox', '--disable-setuid-sandbox'],
        // },
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2410.1.html',
    }
});

client.on('ready', () => {
    logToFile('Client is ready!');
    createRabbitMQConnection();
});

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.on('authenticated', (session) => {
    logToFile('Klien berhasil login');
});

client.initialize();

function sendMessageWhatsApp(number, text) {
    const chatId = number.substring(1) + '@c.us';
    client.sendMessage(chatId, text);
}

// Membuat koneksi ke RabbitMQ
function createRabbitMQConnection() {
    amqplib.connect(`amqp://${rabbitmqUser}:${rabbitmqPassword}@${rabbitmqHost}:${rabbitmqPort}`, (err, conn) => {
        if (err) throw err;

        conn.createChannel((err, ch2) => {
            if (err) throw err;

            ch2.assertQueue(queue);
            
            // Mengkonsumsi pesan dari RabbitMQ
            ch2.consume(queue, (msg) => {
                if (msg !== null) {
                    const content = msg.content.toString();
                    try {
                        const data = JSON.parse(content);
                        const message = data.message;
                        const targetNumber = data.recipient;
                        
                        sendMessageWhatsApp(targetNumber, message);
                        let logBro = `Pesan dikirim ke : ${content}`
                        logToFile(logBro);
                    } catch (error) {
                        console.error('Error parsing JSON message:', error);
                        logToFile('Error parsing JSON message:', error);
                    }
                    ch2.ack(msg);
                } else {
                    logToFile('Consumer cancelled by server');
                }
            });
        });
    });
}

// Fungsi untuk mencatat log ke file
function logToFile(log) {
    console.log(log)
    const logFilePath = 'log.txt';
    const logMessage = `${getCurrentTimestamp()} : ${log}\n`; // Tambahkan timestamp
    fs.appendFile(logFilePath, logMessage, (err) => {
        if (err) {
            console.error('Gagal mencatat log ke file:', err);
        }
    });
}

function getCurrentTimestamp() {
    const date = new Date();
    const timestamp = date.toISOString();
    return timestamp;
}


