const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // Import the cors module

const app = express();
const port = process.env.PORT || 3000; // Use environment variable for port or default to 3000

// Middleware for parsing JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS for all origins (for development purposes)
app.use(cors());

// Path to JSON file
const bookedSlotsFilePath = path.join(__dirname, 'booked_slots.json');

// Function to read booked slots from JSON file
function getBookedSlots() {
    if (!fs.existsSync(bookedSlotsFilePath)) {
        return {}; // Return empty object if file doesn't exist
    }
    const content = fs.readFileSync(bookedSlotsFilePath, 'utf-8');
    return JSON.parse(content) || {};
}

// Function to save new slots to JSON file
function saveBookedSlots(data) {
    fs.writeFileSync(bookedSlotsFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Endpoint to get list of available slots
app.post('/get-available-slots', (req, res) => {
    const { date } = req.body; // Date selected by the user

    // Get list of all possible time slots
    const allSlots = ['09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
                      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'];

    // Get list of booked slots
    const bookedSlots = getBookedSlots();

    // Filter slots, excluding booked ones
    const availableSlots = allSlots.filter(slot => {
        return !(bookedSlots[date] && bookedSlots[date].includes(slot));
    });

    res.json({ availableSlots });
});

// Endpoint for booking a new slot
app.post('/book-slot', (req, res) => {
    const { date, time } = req.body; // Date and time selected by the user

    // Get current booked slots data
    let bookedSlots = getBookedSlots();

    // Add new slot
    if (!bookedSlots[date]) {
        bookedSlots[date] = [];
    }
    if (!bookedSlots[date].includes(time)) {
        bookedSlots[date].push(time);
    }

    // Save updated data
    saveBookedSlots(bookedSlots);

    res.json({ success: true, message: 'Слот успешно забронирован!' });
});

// Start server
app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});
