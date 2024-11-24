const request = require('supertest');
const express = require('express');
const app = require('./index'); // main code is in index.js

describe('Doctor Appointment Booking System', () => {
    beforeEach(() => {
        // I clear all appointments before each test
        while (app.appointments.length > 0) {
            app.appointments.pop();
        }
    });

    describe('POST /api/appointments - Book Appointment', () => {
        const validAppointment = {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            timeSlot: '9:00 AM - 10:00 AM',
            doctorName: 'Dr. Smith'
        };

        test('should book a valid appointment', async () => {
            const response = await request(app)
                .post('/api/appointments')
                .send(validAppointment);
            
            expect(response.status).toBe(201);
            expect(response.body.patient.email).toBe(validAppointment.email);
        });

        test('should reject appointment with missing fields', async () => {
            const invalidAppointment = { ...validAppointment };
            delete invalidAppointment.email;

            const response = await request(app)
                .post('/api/appointments')
                .send(invalidAppointment);
            
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('All fields are required');
        });

        test('should reject appointment with invalid email', async () => {
            const invalidAppointment = { 
                ...validAppointment,
                email: 'invalid-email'
            };

            const response = await request(app)
                .post('/api/appointments')
                .send(invalidAppointment);
            
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid email format');
        });

        test('should reject appointment with non-existent doctor', async () => {
            const invalidAppointment = { 
                ...validAppointment,
                doctorName: 'Dr. NonExistent'
            };

            const response = await request(app)
                .post('/api/appointments')
                .send(invalidAppointment);
            
            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Doctor not found');
        });

        test('should reject double booking of same time slot', async () => {
            // Book first appointment
            await request(app)
                .post('/api/appointments')
                .send(validAppointment);

            // Try to book same slot again
            const response = await request(app)
                .post('/api/appointments')
                .send(validAppointment);
            
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Time slot already booked');
        });
    });

    describe('GET /api/appointments/patient/:email - View Patient Appointments', () => {
        test('should return patient appointments', async () => {
            // First book an appointment
            const appointment = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                timeSlot: '9:00 AM - 10:00 AM',
                doctorName: 'Dr. Smith'
            };

            await request(app)
                .post('/api/appointments')
                .send(appointment);

            const response = await request(app)
                .get('/api/appointments/patient/john@example.com');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(1);
            expect(response.body[0].patient.email).toBe('john@example.com');
        });

        test('should return 404 for patient with no appointments', async () => {
            const response = await request(app)
                .get('/api/appointments/patient/nonexistent@example.com');
            
            expect(response.status).toBe(404);
            expect(response.body.error).toBe('No appointments found');
        });
    });

    describe('GET /api/appointments/doctor/:doctorName - View Doctor Appointments', () => {
        test('should return doctor appointments', async () => {
            // First book an appointment
            const appointment = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                timeSlot: '9:00 AM - 10:00 AM',
                doctorName: 'Dr. Smith'
            };

            await request(app)
                .post('/api/appointments')
                .send(appointment);

            const response = await request(app)
                .get('/api/appointments/doctor/Dr.%20Smith');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(1);
            expect(response.body[0].doctorName).toBe('Dr. Smith');
        });

        test('should return 404 for non-existent doctor', async () => {
            const response = await request(app)
                .get('/api/appointments/doctor/Dr.%20NonExistent');
            
            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Doctor not found');
        });
    });

    describe('DELETE /api/appointments - Cancel Appointment', () => {
        test('should cancel existing appointment', async () => {
            // First book an appointment
            const appointment = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                timeSlot: '9:00 AM - 10:00 AM',
                doctorName: 'Dr. Smith'
            };

            await request(app)
                .post('/api/appointments')
                .send(appointment);

            const response = await request(app)
                .delete('/api/appointments')
                .send({
                    email: 'john@example.com',
                    timeSlot: '9:00 AM - 10:00 AM'
                });
            
            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Appointment cancelled successfully');
        });

        test('should return 404 for non-existent appointment', async () => {
            const response = await request(app)
                .delete('/api/appointments')
                .send({
                    email: 'nonexistent@example.com',
                    timeSlot: '9:00 AM - 10:00 AM'
                });
            
            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Appointment not found');
        });
    });

    describe('PUT /api/appointments - Modify Appointment', () => {
        test('should modify existing appointment', async () => {
            // First book an appointment
            const appointment = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                timeSlot: '9:00 AM - 10:00 AM',
                doctorName: 'Dr. Smith'
            };

            await request(app)
                .post('/api/appointments')
                .send(appointment);

            const response = await request(app)
                .put('/api/appointments')
                .send({
                    email: 'john@example.com',
                    originalTimeSlot: '9:00 AM - 10:00 AM',
                    newTimeSlot: '2:00 PM - 3:00 PM'
                });
            
            expect(response.status).toBe(200);
            expect(response.body.timeSlot).toBe('2:00 PM - 3:00 PM');
        });

        test('should reject modification to already booked slot', async () => {
            // Book first appointment
            const appointment1 = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                timeSlot: '9:00 AM - 10:00 AM',
                doctorName: 'Dr. Smith'
            };

            const appointment2 = {
                firstName: 'Jane',
                lastName: 'Doe',
                email: 'jane@example.com',
                timeSlot: '2:00 PM - 3:00 PM',
                doctorName: 'Dr. Smith'
            };

            await request(app)
                .post('/api/appointments')
                .send(appointment1);

            await request(app)
                .post('/api/appointments')
                .send(appointment2);

            const response = await request(app)
                .put('/api/appointments')
                .send({
                    email: 'john@example.com',
                    originalTimeSlot: '9:00 AM - 10:00 AM',
                    newTimeSlot: '2:00 PM - 3:00 PM'
                });
            
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('New time slot is already booked');
        });
    });
});