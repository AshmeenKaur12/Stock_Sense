import { Router } from 'express';
import * as c from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth';
import { authLimiter, checkLimiter, loginLimiter, otpLimiter } from '../middlewares/rateLimit';
import { validate } from '../middlewares/validate';
import { asyncHandler as h } from '../utils/asyncHandler';
import * as v from '../validators/auth';

const router = Router();

router.post('/signup', authLimiter, validate({ body: v.signupBody }), h(c.signup));
router.post('/login', loginLimiter, validate({ body: v.loginBody }), h(c.login));
router.post('/logout', h(c.logout));
router.post('/refresh', authLimiter, h(c.refresh));
router.get('/me', authenticate, h(c.me));
router.get('/check-login-id', checkLimiter, validate({ query: v.checkLoginIdQuery }), h(c.checkLoginId));
router.get('/check-email', checkLimiter, validate({ query: v.checkEmailQuery }), h(c.checkEmail));
router.post('/forgot-password', otpLimiter, validate({ body: v.forgotPasswordBody }), h(c.forgotPassword));
router.post('/verify-otp', otpLimiter, validate({ body: v.verifyOtpBody }), h(c.verifyOtp));
router.post('/reset-password', otpLimiter, validate({ body: v.resetPasswordBody }), h(c.resetPassword));

export default router;
