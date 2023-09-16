const { chromium } = require('playwright');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Client, MessageMedia } = require('whatsapp-web.js');
const prompt = require('prompt-sync')();
const translate = require('google-translate-api'); // Gunakan library 'google-translate-api' yang baru

// Fungsi untuk mengirim pesan ke OpenAI
async function sendMessageToOpenAI(message) {
  const apiKey = 'fHArh4Ao5n5TisRsEPbjT3BlbkFJeuGPwOMPdN7qnSoLT2uI';
  const response = await axios.post(
    'https://api.openai.com/v1/engines/gpt-3.5-turbo/completions',
    {
      prompt: message,
      max_tokens: 2500,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    }
  );

  return response.data.choices[0].text;
}

// Fungsi untuk membuat short link dengan TinyURL
async function createShortLink(longUrl) {
  try {
    const response = await axios.post('http://tinyurl.com/api-create.php', null, {
      params: {
        url: longUrl,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Gagal membuat short link:', error.message);
    return 'Gagal membuat short link.';
  }
}

// Fungsi untuk mengubah latar belakang secara otomatis
async function changeBackgroundAutomatically(page, backgroundImages) {
  let currentBackgroundIndex = 0;

  while (true) {
    if (currentBackgroundIndex >= backgroundImages.length) {
      currentBackgroundIndex = 0;
    }

    const backgroundImage = backgroundImages[currentBackgroundIndex];
    const backgroundImagePath = path.join(__dirname, 'backgrounds', backgroundImage);

    // Lakukan operasi untuk mengubah latar belakang di WhatsApp Web
    // (Anda perlu mengetahui cara melakukannya sesuai dengan WhatsApp Web)
    console.log(`Mengubah latar belakang ke: ${backgroundImage}`);

    currentBackgroundIndex++;

    // Tunggu beberapa detik sebelum mengganti latar belakang berikutnya
    await new Promise((resolve) => setTimeout(resolve, 60000)); // Mengganti setiap 60 detik
  }
}

(async () => {
  // Inisialisasi browser Chromium
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // List semua file gambar latar belakang
  const backgroundImagesDir = path.join(__dirname, 'backgrounds');
  const backgroundImages = fs.readdirSync(backgroundImagesDir);

  // Buka WhatsApp Web
  await page.goto('https://web.whatsapp.com');

  // Tunggu hingga pengguna masuk (contohnya: melihat elemen QR code)
  await page.waitForSelector('._1WZqU.PNlAR');

  // Menampilkan QR code dalam terminal
  page.on('dialog', async (dialog) => {
    if (dialog.type() === 'prompt' && dialog.message() === 'Hi Bot') {
      const response = await sendMessageToOpenAI('Translate this English text to French: "Hello, how are you?"');
      await dialog.accept(response);
    }
    if (dialog.type() === 'alert' && dialog.message() === 'Scan QR code') {
      // Ambil QR code URL dari pesan alert
      const qrCodeUrl = dialog.messageText();

      // Tampilkan QR code di terminal
      qrcode.generate(qrCodeUrl, { small: true });
    }
  });

  // Menunggu hingga WhatsApp Web siap
  await page.waitForSelector('._1WZqU.PNlAR', { state: 'hidden' });

  // Memulai perubahan latar belakang otomatis
  changeBackgroundAutomatically(page, backgroundImages);

  // Inisialisasi klien WhatsApp
  const client = new Client();
  client.initialize();

  client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    console.log('Bot WhatsApp siap!');

    // Fitur push kontak
    const contactName = prompt('Masukkan nama kontak: ');
    const contactNumber = prompt('Masukkan nomor kontak (dalam format internasional): ');

    const messageMedia = new MessageMedia('vcard', `BEGIN:VCARD
VERSION:3.0
FN:${contactName}
TEL:${contactNumber}
END:VCARD

    const recipient = prompt('Masukkan nomor penerima (dalam format internasional) atau URL yang akan di-short: ');

    if (recipient.startsWith('http')) {
      const shortLink = await createShortLink(recipient);
      console.log(`Short Link: ${shortLink}`);
    } else {
      const chat = client.getContactById(recipient);

      if (chat) {
        chat.sendMessage(messageMedia);
      } else {
        console.log(`Kontak dengan nomor ${recipient} tidak ditemukan.`);
      }
    }
  });

  client.on('message', async (message) => {
    if (message.body === 'Hi Bot') {
      const response = await sendMessageToOpenAI('Translate this English text to French: "Hello, how are you?"');
      message.reply(response);
    }

    if (message.body.startsWith('/translate ')) {
      const textToTranslate = message.body.substring('/translate '.length);
      const translatedText = await translate(textToTranslate, { to: 'id' }); // Terjemahkan ke Bahasa Indonesia
      message.reply(`Terjemahan: ${translatedText}`);
    }

    if (message.body.startsWith('/shortlink ')) {
      const urlToShorten = message.body.substring('/shortlink '.length);
      const shortLink = await createShortLink(urlToShorten);
      message.reply(`Short Link: ${shortLink}`);
    }
  });

  // Tambahkan event lainnya sesuai kebutuhan

})();
