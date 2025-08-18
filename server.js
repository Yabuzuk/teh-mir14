const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const moment = require('moment');
const path = require('path');
const { body, validationResult } = require('express-validator'); // Добавлено

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

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
    date: { type: String, required: true },
    time: { type: String, required: true },
    organization: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    mail: { type: String, required: true },
    vehicleType: String,
    details: String,
    carBrand: String,
    carNumber: String
}, {
    timestamps: false // Disable timestamps
});

BookedSlotSchema.index({ date: 1, time: 1 }, { unique: true });
const BookedSlot = mongoose.model('BookedSlot', BookedSlotSchema);

// Функция для генерации временных слотов на день
function generateTimeSlots(dayOfWeek) {
    let startTime = 19;
    let endTime;

    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        endTime = 22;
        if (dayOfWeek === 2 || dayOfWeek === 3 || dayOfWeek === 5) { // Добавили проверку на вторник (2)
            endTime = 22;
        }
    } else if (dayOfWeek === 6) {
        endTime = 18;
    } else {
        return [];
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

    if (!date) {
        return res.status(400).json({ message: 'Date is required' });
    }

    try {
        const selectedDate = moment(date);
        const dayOfWeek = selectedDate.day();

        const allSlots = generateTimeSlots(dayOfWeek);

        if (dayOfWeek === 0) {
            return res.json({ availableSlots: [] });
        }

        const bookedSlots = await BookedSlot.find({ date: date }).select('time').exec();
        const bookedTimes = bookedSlots.map(slot => slot.time);
        const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));

        res.json({ availableSlots });
    } catch (err) {
        console.error('Error getting available slots:', err);
        res.status(500).json({ message: 'Failed to get available slots' });
    }
});

// Endpoint to book a slot
app.post(
    '/book-slot',
    [  // Валидация с использованием express-validator
        body('date').notEmpty().withMessage('Date is required'),
        body('time').notEmpty().withMessage('Time is required'),
        body('organization').notEmpty().withMessage('Organization is required'),
        body('name').notEmpty().withMessage('Name is required'),
        body('phone').notEmpty().withMessage('Phone is required'),
        body('mail').notEmpty().withMessage('Mail is required').isEmail().withMessage('Invalid email'), // Добавлено
        body('carBrand').notEmpty().withMessage('Car brand is required'),
        body('carNumber').notEmpty().withMessage('Car number is required'),
        body('vehicleType').notEmpty().withMessage('Vehicle type is required'),

    ],
    async (req, res) => {
        console.log('Received booking request:', req.body); // Логирование

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.warn('Validation errors:', errors.array()); // Логирование ошибок валидации
            return res.status(400).json({ errors: errors.array() });
        }

        const { date, time, organization, name, phone, mail, vehicleType, details, carBrand, carNumber } = req.body;

        try {
            const newSlot = new BookedSlot({
                date,
                time,
                organization,
                name,
                phone,
                mail,
                vehicleType,
                details,
                carBrand,
                carNumber
            });

            await newSlot.save();
            console.log('Booking saved successfully:', newSlot); // Логирование успешного сохранения
            return res.status(201).json({ success: true, message: 'Слот успешно забронирован!' });

        } catch (error) {
            console.error('Error saving booking:', error); // Логирование ошибок сохранения
            if (error.code === 11000) {
                return res.status(400).json({ success: false, message: 'Этот слот времени уже забронирован.' });
            }
            return res.status(500).json({ success: false, message: "Ошибка при бронировании слота.", error: error.message });
        }
    }
);

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

/ Создание новой записи (POST /admin/bookings/no-validation) без валидации
app.post('/admin/bookings/no-validation', async (req, res) => {
    try {
        const newBooking = new BookedSlot(req.body);
        const savedBooking = await newBooking.save();
        res.status(201).json(savedBooking);
    } catch (err) {
        console.error('Error creating booking without validation:', err);
        res.status(400).json({ message: 'Failed to create booking without validation', error: err.message });
    }
});

// Редактирование существующей записи (PUT /admin/bookings/:id)
app.put('/admin/bookings/:id', async (req, res) => {
    try {
        const updatedBooking = await BookedSlot.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updatedBooking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        res.json(updatedBooking);
    } catch (err) {
        console.error('Error updating booking:', err);
        res.status(400).json({ message: 'Failed to update booking', error: err.message });
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




