const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Middleware для парсинга JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Путь к JSON-файлу
const bookedSlotsFilePath = path.join(__dirname, 'booked_slots.json');

// Функция для чтения занятых слотов из JSON-файла
function getBookedSlots() {
    if (!fs.existsSync(bookedSlotsFilePath)) {
        return {}; // Если файл не существует, возвращаем пустой объект
    }
    const content = fs.readFileSync(bookedSlotsFilePath, 'utf-8');
    return JSON.parse(content) || {};
}

// Функция для сохранения новых слотов в JSON-файл
function saveBookedSlots(data) {
    fs.writeFileSync(bookedSlotsFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Эндпоинт для получения списка свободных слотов
app.post('/get-available-slots', (req, res) => {
    const { date } = req.body; // Дата, выбранная пользователем

    // Получаем список всех возможных временных слотов
    const allSlots = ['09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
                      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'];

    // Получаем список занятых слотов
    const bookedSlots = getBookedSlots();

    // Фильтруем слоты, исключая занятые
    const availableSlots = allSlots.filter(slot => {
        return !(bookedSlots[date] && bookedSlots[date].includes(slot));
    });

    res.json({ availableSlots });
});

// Эндпоинт для бронирования нового слота
app.post('/book-slot', (req, res) => {
    const { date, time } = req.body; // Дата и время, выбранные пользователем

    // Получаем текущие данные о занятых слотах
    let bookedSlots = getBookedSlots();

    // Добавляем новый слот
    if (!bookedSlots[date]) {
        bookedSlots[date] = [];
    }
    if (!bookedSlots[date].includes(time)) {
        bookedSlots[date].push(time);
    }

    // Сохраняем обновленные данные
    saveBookedSlots(bookedSlots);

    res.json({ success: true, message: 'Слот успешно забронирован!' });
});

// Запуск сервера
app.listen(port, () => {
    console.log("Сервер запущен на http")//localhost:${port});
});