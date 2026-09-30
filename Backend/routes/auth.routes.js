import express from 'express';
import { register, login, getMe, googleAuth, logout } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = express.Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/google', googleAuth);
authRouter.post('/logout', logout);
authRouter.get('/me', requireAuth, getMe);
