import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User.js';
import { generateToken } from '../middleware/auth.js';

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const GoogleAuthSchema = z.object({
  firebaseUid: z.string(),
  email: z.string().email(),
  displayName: z.string().optional(),
  photoURL: z.string().optional(),
});

function startTrial() {
  const startsAt = new Date();
  const endsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return { startsAt, endsAt, caps: { funnelsPublished: 1, leads: 100, emails: 50 } };
}

function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/',
  });
}

export const googleAuth = async (req, res) => {
  console.log('[googleAuth] Received request, body keys:', Object.keys(req.body || {}));
  try {
    const parsed = GoogleAuthSchema.safeParse(req.body);
    if (!parsed.success) {
      console.error('[googleAuth] Validation failed:', parsed.error.errors);
      return res.status(400).json({ success: false, message: 'Invalid input', errors: parsed.error.errors });
    }

    const { firebaseUid, email, displayName, photoURL } = parsed.data;
    const lowerEmail = email.toLowerCase();
    console.log('[googleAuth] Looking up user:', lowerEmail);

    let user = await User.findOne({ email: lowerEmail });

    if (!user) {
      const randomPassword = Math.random().toString(36).slice(-10);
      const passwordHash = await bcrypt.hash(randomPassword, 10);
      user = await User.create({
        email: lowerEmail,
        passwordHash,
        firebaseUid,
        displayName,
        photoURL,
        trial: startTrial(),
      });
      console.log('[googleAuth] Created user:', user._id);
    } else {
      if (!user.firebaseUid) {
        user.firebaseUid = firebaseUid;
        if (displayName) user.displayName = displayName;
        if (photoURL) user.photoURL = photoURL;
        await user.save();
        console.log('[googleAuth] Updated user with firebaseUid');
      }
    }

    const token = generateToken(user._id.toString());
    setAuthCookie(res, token);
    console.log('[googleAuth] Returning success for user:', user._id);
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      },
    });
  } catch (err) {
    console.error('[googleAuth] Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const register = async (req, res) => {
  try {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid input' });

    const email = parsed.data.email.toLowerCase();
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ success: false, message: 'Email already in use' });

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const user = await User.create({ email, passwordHash, trial: startTrial() });
    const token = generateToken(user._id.toString());
    setAuthCookie(res, token);
    res.json({ success: true, token, user: { id: user._id, email: user.email } });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const login = async (req, res) => {
   try {
     const parsed = LoginSchema.safeParse(req.body);
     if (!parsed.success) return res.status(400).json({ success: false, message: 'Invalid input' });

     const email = parsed.data.email.toLowerCase();
     const user = await User.findOne({ email });
     if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

     const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
     if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });

     const token = generateToken(user._id.toString());
     setAuthCookie(res, token);

     res.json({ success: true, token, user: { id: user._id, email: user.email } });
   } catch (err) {
     console.error('Login error:', err);
     res.status(500).json({ success: false, message: 'Server error' });
   }
 };

export const logout = async (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  });
  res.json({ success: true, message: 'Logged out' });
};

export const getMe = async (req, res) => {
   try {
     // req.user is set by requireAuth middleware
     const user = await User.findById(req.user.id).select('-passwordHash');
     if (!user) {
       return res.status(404).json({ success: false, message: 'User not found' });
     }
     res.json({ success: true, user: { id: user._id, email: user.email, trial: user.trial, usage: user.usage, wallet: user.wallet } });
   } catch (err) {
     console.error('GetMe error:', err);
     res.status(500).json({ success: false, message: 'Server error' });
   }
 };
