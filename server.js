const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const dotenv = require('dotenv'); // Import dotenv
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration (restrict to your domain in production)
const allowedOrigins = ['https://teh-mir14.ru', 'http://localhost:3000', 'https://teh-mir14.onrender.com']; // Добавьте ваш домен Render и другие нужные домены
const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) { // Allow requests with no origin (like mobile apps)
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}
app.use(cors(corsOptions));

// MongoDB connection string
const dbUrl = process.env.MONGODB_URI || 'mongodb://tehmir_tookgrain:8b76bea68aa71605c3d9300bfad2890a0833b0e0@c6oe8.h.filess.io:27018/tehmir_tookgrain';

mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Define schema and model
const BookedSlotSchema = new mongoose.Schema({
    date: String,
    time: [String],
    organization: String,
    name: String,
    phone: String,
    vehicleType: String,
    details: String,
    carBrand: String, // Добавляем поле "Марка автомобиля"
    carNumber: String  // Добавляем поле "Номер автомобиля"
});

const BookedSlot = mongoose.model('BookedSlot', BookedSlotSchema);

// Function to generate time slots
function generateTimeSlots(dayOfWeek) {
    let startTime = 9;  // 9:00
    let endTime;

    if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Понедельник - Пятница
        endTime = 20; // 20:00
         if (dayOfWeek === 3 || dayOfWeek === 5) { // Среда и Пятница
            endTime = 18; // 18:00 (только до 17:00 запись)
        }
    } else if (dayOfWeek === 6) { // Суббота
        endTime = 18; // 18:00
    } else {
        return []; // Воскресенье - нет слотов
    }

    const timeSlots = [];
    for (let hour = startTime; hour < endTime; hour++) {
        timeSlots.push(`${String(hour).padStart(2, '0')}:00`);
    }

    return timeSlots;
}

// Endpoint to get available slots
app.post('/get-available-slots', async (req, res) => {
    const { date } = req.body;

    // Check if date is valid
    if (!date) {
        return res.status(400).json({ message: 'Date is required', availableSlots: [] });
    }

    const selectedDate = new Date(date);
    const dayOfWeek = selectedDate.getDay(); // 0 (Вс) - 6 (Сб)

    // Generate all time slots for the selected day
    const allSlots = generateTimeSlots(dayOfWeek);

    // If it's Sunday, return an empty array
    if (dayOfWeek === 0) {
        return res.json({ availableSlots: [] });
    }

    try {
        const bookedSlot = await BookedSlot.findOne({ date: date });
        const bookedSlots = bookedSlot ? bookedSlot.time : [];

        const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));
        res.json({ availableSlots });
    } catch (err) {
        console.error('Error getting available slots:', err);
        res.status(500).json({ message: 'Failed to get available slots', error: err.message, availableSlots: [] });
    }
});

// Endpoint to book a slot with validation
app.post('/book-slot', [
    body('date').isISO8601().withMessage('Неверный формат даты'),
    body('time').notEmpty().withMessage('Время обязательно'),
    body('organization').optional().isString().withMessage('Организация должна быть строкой'),
    body('name').notEmpty().isString().withMessage('Имя обязательно и должно быть строкой'),
    body('phone').notEmpty().isMobilePhone('ru-RU').withMessage('Неверный формат телефона'),
    body('vehicleType').notEmpty().isString().withMessage('Тип ТС обязателен и должен быть строкой'),
    body('details').optional().isString().withMessage('Подробности должны быть строкой'),
    body('carBrand').notEmpty().isString().withMessage('Марка автомобиля обязательна и должна быть строкой'),
    body('carNumber').notEmpty().isString().withMessage('Номер автомобиля обязателен и должен быть строкой'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { date, time, organization, name, phone, vehicleType, details, carBrand, carNumber } = req.body;

    try {
        // Всегда создаем новую запись
        const bookedSlot = new BookedSlot({
            date: date,
            time: [time],
            organization: organization,
            name: name,
            phone: phone,
            vehicleType: vehicleType,
            details: details,
            carBrand: carBrand,
            carNumber: carNumber
        });

        await bookedSlot.save();

        // Функция для отправки сообщения в Telegram
        async function sendTelegramMessage(token, chatId, message) {
            const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(message)}`;

            try {
                const telegramResponse = await fetch(telegramUrl);
                if (!telegramResponse.ok) {
                    console.error("Ошибка при отправке сообщения в Telegram:", telegramResponse.status);
                }
            } catch (telegramError) {
                console.error("Ошибка при подключении к Telegram:", telegramError);
            }
        }

        // Отправляем основное сообщение в Telegram
        const mainToken = process.env.TELEGRAM_MAIN_TOKEN;  // Используем переменную окружения
        const mainChatId = process.env.TELEGRAM_MAIN_CHAT_ID; // Используем переменную окружения

        const mainMessage = `
            Новая запись на техосмотр:
            Организация: ${organization}
            Имя: ${name}
            Номер телефона: ${phone}
            Вид ТС: ${vehicleType}
            Марка автомобиля: ${carBrand}
            Номер автомобиля: ${carNumber}
            Дата: ${date}
            Время: ${time}
            Подробности: ${details}
        `;

        if (mainToken && mainChatId) {
            await sendTelegramMessage(mainToken, mainChatId, mainMessage);
        } else {
            console.error("Telegram main token or chat ID is not defined in environment variables!");
        }

        // Если это автобус, отправляем сообщение в дополнительный чат
        if (vehicleType === 'автобус') {
            const busToken = process.env.TELEGRAM_BUS_TOKEN;  // Используем переменную окружения
            const busChatId = process.env.TELEGRAM_BUS_CHAT_ID; // Используем переменную окружения

            const busMessage = `
                Новая запись на техосмотр АВТОБУСА:
                Организация: ${organization}
                Имя: ${name}
                Номер телефона: ${phone}
                Марка автомобиля: ${carBrand}
                Номер автомобиля: ${carNumber}
                Дата: ${date}
                Время: ${time}
                Подробности: ${details}
            `;
            if (busToken && busChatId) {
                await sendTelegramMessage(busToken, busChatId, busMessage);
            } else {
                console.error("Telegram bus token or chat ID is not defined in environment variables!");
            }
        }

        res.json({ success: true, message: 'Слот успешно забронирован!' });
    } catch (err) {
        console.error('Error booking slot:', err);
        res.status(500).json({ message: 'Failed to book slot', error: err.message });
    }
});

// Получение всех записей (GET /admin/bookings)
app.get('/admin/bookings', async (req, res) => {
    try {
        const bookings = await BookedSlot.find({});
        res.json(bookings);
    } catch (err) {
        console.error('Error getting bookings:', err);
        res.status(500).json({ message: 'Failed to get bookings' });
    }
});

// Получение конкретной записи (GET /admin/bookings/:id)
app.get('/admin/bookings/:id', async (req, res) => {
    try {
        const booking = await BookedSlot.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        res.json(booking);
    } catch (err) {
        console.error('Error getting booking:', err);
        res.status(500).json({ message: 'Failed to get booking' });
    }
});

// Создание новой записи (POST /admin/bookings)
app.post('/admin/bookings', async (req, res) => {
    try {
        const newBooking = new BookedSlot(req.body);
        const savedBooking = await newBooking.save();
        res.status(201).json(savedBooking); // 201 Created
    } catch (err) {
        console.error('Error creating booking:', err);
        res.status(400).json({ message: 'Failed to create booking', error: err.message }); // 400 Bad Request
    }
});

// Редактирование существующей записи (PUT /admin/bookings/:id)
app.put('/admin/bookings/:id', async (req, res) => {
    try {
        const updatedBooking = await BookedSlot.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedBooking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        res.json(updatedBooking);
    } catch (err) {
        console.error('Error updating booking:', err);
        res.status(400).json({ message: 'Failed to update booking', error: err.message }); // 400 Bad Request
    }
});

// Удаление записи (DELETE /admin/bookings/:id)
app.delete('/admin/bookings/:id', async (req, res) => {
    try {
        const deletedBooking = await BookedSlot.findByIdAndDelete(req.params.id);
        if (!deletedBooking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        res.json({ message: 'Booking deleted' });
    } catch (err) {
        console.error('Error deleting booking:', err);
        res.status(500).json({ message: 'Failed to delete booking' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
