// Пример серверной части для работы с Telegram-ботом и получения/отправки данных в канал

const fetch = require('node-fetch');
const token = "6804774061:AAF79b9pf8lW5UXwhpOSx3EMpjjjmTZhGAo"; // Токен бота
const chatId = "-1002380612626"; // ID вашего канала

// Список занятых времен (например, храним в памяти на сервере или в базе данных)
let bookedTimes = ["09:30", "11:00", "13:30", "15:00"];

async function checkAndBookTime(time) {
    if (bookedTimes.includes(time)) {
        return "Это время уже занято. Пожалуйста, выберите другое.";
    } else {
        bookedTimes.push(time); // Добавляем время в список занятых
        // Отправляем информацию в канал
        await sendMessageToTelegram(`Время ${time} забронировано!`);
        return "Запись успешно добавлена.";
    }
}

// Отправка сообщения в Telegram-канал
async function sendMessageToTelegram(message) {
    const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(message)}`;
    const response = await fetch(url);
    if (!response.ok) {
        console.error("Ошибка при отправке сообщения в Telegram.");
    }
}

// Пример: Проверка и бронирование времени
checkAndBookTime("10:00").then(response => {
    console.log(response); // Ответ, сообщающий о результате
});
