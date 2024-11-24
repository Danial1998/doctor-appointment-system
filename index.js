const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

// in-memory storage
const appointments = [];
app.appointments = appointments;
const doctors = [
    { name: "Dr. Smith", slots: ["9:00 AM - 10:00 AM", "10:00 AM - 11:00 AM", "2:00 PM - 3:00 PM"] },
    { name: "Dr. Johnson", slots: ["11:00 AM - 12:00 PM", "1:00 PM - 2:00 PM", "3:00 PM - 4:00 PM"] }
];

// helper function to validate email format
const isValidEmail = (email) => {
    return email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
};

// helper function to find appointment
const findAppointment = (email, timeSlot) => {
    return appointments.find(apt => 
        apt.patient.email === email && 
        (!timeSlot || apt.timeSlot === timeSlot)
    );
};

// 1. Book Appointment API
app.post('/api/appointments', (req, res) => {
    const { firstName, lastName, email, timeSlot, doctorName } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !timeSlot || !doctorName) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if doctor exists
    const doctor = doctors.find(d => d.name === doctorName);
    if (!doctor) {
        return res.status(404).json({ error: 'Doctor not found' });
    }

    // Check if slot is available
    if (!doctor.slots.includes(timeSlot)) {
        return res.status(400).json({ error: 'Invalid or unavailable time slot' });
    }

    // Check if slot is already booked
    const existingAppointment = appointments.find(apt => 
        apt.doctorName === doctorName && 
        apt.timeSlot === timeSlot
    );
    if (existingAppointment) {
        return res.status(400).json({ error: 'Time slot already booked' });
    }

    // Create appointment
    const appointment = {
        patient: { firstName, lastName, email },
        timeSlot,
        doctorName,
        id: appointments.length + 1
    };

    appointments.push(appointment);
    res.status(201).json(appointment);
});

// 2. View Appointment Details API
app.get('/api/appointments/patient/:email', (req, res) => {
    const { email } = req.params;
    
    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    const patientAppointments = appointments.filter(apt => 
        apt.patient.email === email
    );

    if (patientAppointments.length === 0) {
        return res.status(404).json({ error: 'No appointments found' });
    }

    res.json(patientAppointments);
});

// 3. View All Appointments by Doctor API
app.get('/api/appointments/doctor/:doctorName', (req, res) => {
    const { doctorName } = req.params;
    
    const doctor = doctors.find(d => d.name === doctorName);
    if (!doctor) {
        return res.status(404).json({ error: 'Doctor not found' });
    }

    const doctorAppointments = appointments.filter(apt => 
        apt.doctorName === doctorName
    );

    res.json(doctorAppointments);
});

// 4. Cancel Appointment API
app.delete('/api/appointments', (req, res) => {
    const { email, timeSlot } = req.body;

    if (!email || !timeSlot) {
        return res.status(400).json({ error: 'Email and time slot are required' });
    }

    const appointmentIndex = appointments.findIndex(apt => 
        apt.patient.email === email && 
        apt.timeSlot === timeSlot
    );

    if (appointmentIndex === -1) {
        return res.status(404).json({ error: 'Appointment not found' });
    }

    appointments.splice(appointmentIndex, 1);
    res.json({ message: 'Appointment cancelled successfully' });
});

// 5. Modify Appointment API
app.put('/api/appointments', (req, res) => {
    const { email, originalTimeSlot, newTimeSlot } = req.body;

    if (!email || !originalTimeSlot || !newTimeSlot) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const appointment = findAppointment(email, originalTimeSlot);
    if (!appointment) {
        return res.status(404).json({ error: 'Original appointment not found' });
    }

    // Check if new slot is available
    const doctor = doctors.find(d => d.name === appointment.doctorName);
    if (!doctor.slots.includes(newTimeSlot)) {
        return res.status(400).json({ error: 'Invalid or unavailable new time slot' });
    }

    // Check if new slot is already booked
    const slotTaken = appointments.some(apt => 
        apt.doctorName === appointment.doctorName && 
        apt.timeSlot === newTimeSlot
    );
    if (slotTaken) {
        return res.status(400).json({ error: 'New time slot is already booked' });
    }

    appointment.timeSlot = newTimeSlot;
    res.json(appointment);
});

module.exports = app;