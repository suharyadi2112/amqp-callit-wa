const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const amqplib = require('amqplib/callback_api');

// Konfigurasi koneksi RabbitMQ
const queue = 'sendWaPengaduan'; //chanel
const rabbitmqHost = 'localhost';
const rabbitmqPort = 5672;
const rabbitmqUser = 'guest';
const rabbitmqPassword = 'guest';

const client = new Client({
    webVersionCache: {
        type: 'remote',
        authStrategy: new LocalAuth(),
        puppeteer: {
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2410.1.html',
    }
});

client.on('ready', () => {
    console.log('Client is ready!');
    createRabbitMQConnection();
});

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.on('authenticated', (session) => {
    console.log('Klien berhasil login');
});

client.initialize();

function sendMessageWhatsApp(number, text) {
    const chatId = number.substring(1) + '@c.us';
    client.sendMessage(chatId, text);
    console.log(`Pesan "${text}" berhasil dikirim ke nomor tujuan ${number}`);
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
                    console.log(`Pesan dari RabbitMQ: ${content}`);

                    try {
                        const data = JSON.parse(content);
                        const message = data.message;
                        const targetNumber = data.recipient;
                        
                        sendMessageWhatsApp(targetNumber, message);
                    } catch (error) {
                        console.error('Error parsing JSON message:', error);
                    }
                    ch2.ack(msg);
                } else {
                    console.log('Consumer cancelled by server');
                }
            });
        });
    });
}


