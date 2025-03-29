import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Eye, EyeOff, Mail } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { FaApple, FaFacebook } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [isMfaStep, setIsMfaStep] = useState(false);
  const [isResetStep, setIsResetStep] = useState(false);
  const { signIn, signUp, session, sendOtp, verifyOtp, resetPassword, sendPasswordReset, signInWithProvider } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      navigate('/hobby-selection');
    }
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isResetStep) {
        await sendPasswordReset(email);
        setError('Password reset link sent. Check your email.');
        setIsResetStep(false);
        setLoading(false);
        return;
      }

      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) throw error;
        const { error: signInError } = await signIn(email, password);
        if (signInError) throw signInError;
      } else {
        const { error, data } = await signIn(email, password);
        if (error) throw error;

        if (data?.mfa_required) {
          await sendOtp(email);
          setIsMfaStep(true);
          setLoading(false);
          return;
        }
      }
    } catch (error: any) {
      setError(error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await verifyOtp(email, otp);
      if (error) throw error;
      navigate('/hobby-selection');
    } catch (error: any) {
      setError('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = () => {
    setIsResetStep(true);
    setError('');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <Users className="h-12 w-12 text-indigo-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isSignUp ? 'Create your account' : isMfaStep ? 'Enter OTP' : isResetStep ? 'Reset your password' : 'Sign in to your account'}
          </h2>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {isMfaStep ? (
          <form className="mt-8 space-y-6" onSubmit={handleOtpSubmit}>
            <input
              type="text"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <button
              type="submit"
              className="w-full py-2 px-4 text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <label htmlFor="email" className="sr-only">Email address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    className="appearance-none rounded-md relative block w-full pl-10 px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {!isResetStep && (
                <div>
                  <label htmlFor="password" className="sr-only">Password</label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm pr-10"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={loading}
              >
                {loading
                  ? 'Processing...'
                  : isSignUp
                  ? 'Create Account'
                  : isResetStep
                  ? 'Send Reset Link'
                  : 'Sign In'}
              </button>
            </div>

            <div className="flex flex-col items-center space-y-2">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>

              {!isSignUp && !isResetStep && (
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Forgot your password?
                </button>
              )}

              {isResetStep && (
                <button
                  type="button"
                  onClick={() => setIsResetStep(false)}
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  Back to sign in
                </button>
              )}
            </div>
          </form>
        )}

        {/* OAuth Buttons Section */}
        <div className="flex flex-col space-y-3 mt-6">
          <button
            type="button"
            onClick={() => signInWithProvider('google')}
            className="flex items-center justify-center w-full bg-white border border-gray-300 rounded-md px-4 py-2 shadow-sm hover:shadow-md"
          >
            <FcGoogle size={24} className="mr-2" />
            <span>Sign in with Google</span>
          </button>

          <button
            type="button"
            onClick={() => signInWithProvider('facebook')}
            className="flex items-center justify-center w-full bg-blue-600 text-white rounded-md px-4 py-2 shadow-sm hover:shadow-md"
          >
            <FaFacebook size={24} className="mr-2" />
            <span>Sign in with Facebook</span>
          </button>

          <button
            type="button"
            onClick={() => signInWithProvider('apple')}
            className="flex items-center justify-center w-full bg-black text-white rounded-md px-4 py-2 shadow-sm hover:shadow-md"
          >
            <FaApple size={24} className="mr-2" />
            <span>Sign in with Apple</span>
          </button>
        </div>
      </div>
    </div>
  );
}