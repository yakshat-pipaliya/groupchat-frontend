import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader, MessageSquare, User, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isFocused, setIsFocused] = useState({});
  const { login, loading, error } = useAuth();

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleFocus = (field) => {
    setIsFocused(prev => ({ ...prev, [field]: true }));
  };

  const handleBlur = (field) => {
    setIsFocused(prev => ({ ...prev, [field]: false }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await login(formData.email, formData.password);
      // Navigation will be handled by App.jsx
    } catch (error) {
      // Error is already handled by AuthContext
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
      </div>
      
      <div className="login-content">
        <div className="login-card">
          <div className="login-header">
            <div className="logo-container">
              <div className="logo">
                <MessageSquare size={32} />
              </div>
              <h1>ChatApp</h1>
            </div>
            <h2>Welcome Back</h2>
            <p>Sign in to your account to continue chatting</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className={`input-wrapper ${isFocused.email ? 'focused' : ''} ${errors.email ? 'error' : ''}`}>
                <Mail className="input-icon" size={20} />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onFocus={() => handleFocus('email')}
                  onBlur={() => handleBlur('email')}
                  placeholder="Enter your email"
                  className={errors.email ? 'error' : ''}
                  autoComplete="email"
                />
                <div className="input-border"></div>
              </div>
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className={`input-wrapper password-input-wrapper ${isFocused.password ? 'focused' : ''} ${errors.password ? 'error' : ''}`}>
                <Lock className="input-icon" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => handleFocus('password')}
                  onBlur={() => handleBlur('password')}
                  placeholder="Enter your password"
                  className={errors.password ? 'error' : ''}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                <div className="input-border"></div>
              </div>
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            {error && (
              <div className="auth-error">
                <div className="error-icon">
                  <User size={20} />
                </div>
                <div className="error-content">
                  <strong>Authentication Error</strong>
                  <p>{error}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="login-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* <div className="login-footer">
            <div className="footer-links">
              <p>
                Don't have an account? <a href="/register">Sign up</a>
              </p>
              <p>
                <a href="/forgot-password">Forgot your password?</a>
              </p>
            </div>
          </div> */}
        </div>
        
        <div className="login-features">
          <div className="feature">
            <div className="feature-icon">
              <MessageSquare size={24} />
            </div>
            <h3>Real-time Chat</h3>
            <p>Connect instantly with friends and family</p>
          </div>
          <div className="feature">
            <div className="feature-icon">
              <Lock size={24} />
            </div>
            <h3>Secure & Private</h3>
            <p>Your conversations are always encrypted</p>
          </div>
          <div className="feature">
            <div className="feature-icon">
              <User size={24} />
            </div>
            <h3>Easy to Use</h3>
            <p>Simple and intuitive interface</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
