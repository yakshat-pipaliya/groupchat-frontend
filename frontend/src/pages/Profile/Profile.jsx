import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { User, Mail, Bell, BellOff, Camera, Edit2, ArrowLeft, Save } from 'lucide-react';
import { getUserProfile } from '../../services/apiService';
import './Profile.css';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);

      const userData = JSON.parse(localStorage.getItem('userData'));
      const userId = userData?._id;
      const authToken = localStorage.getItem('authToken');

      if (!userId) {
        toast.error('User not found');
        return;
      }

      const data = await getUserProfile(userId, authToken);
      setUser(data);
      setNotificationsEnabled(data.notificationStatus || false);
      setImageError(false); // Reset image error state
    } catch (error) {
      console.error('Profile fetch error:', error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = '/';
      } else {
        toast.error('Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToChat = () => {
    window.location.href = '/';
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      toast.info('Image upload feature coming soon!');
    }
  };

  const toggleNotifications = async () => {
    const newStatus = !notificationsEnabled;
    setNotificationsEnabled(newStatus);
    toast.success(`Notifications ${newStatus ? 'enabled' : 'disabled'}`);
  };

  const handleUpdateProfile = async () => {
    try {
      toast.success('Profile updated successfully!');
      setEditing(false);
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  // ✅ Get profile image
  const profileImage =
    user?.profileImage &&
      user.profileImage !== 'default' &&
      !imageError
      ? user.profileImage
      : null;

  // ✅ Get default letter
  const getDefaultProfileText = () => {
    if (!user) return 'U';

    return (
      user.email?.charAt(0)?.toUpperCase() ||
      user.username?.charAt(0)?.toUpperCase() ||
      'U'
    );
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-error">
        <User size={48} />
        <h3>Profile Not Found</h3>
        <p>Unable to load your profile information</p>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* Header */}
      <div className="profile-header">
        <button className="back-button" onClick={handleBackToChat}>
          <ArrowLeft size={20} />
          <span>Back to Chat</span>
        </button>

        <h1>My Profile</h1>

        <button className="edit-btn" onClick={() => setEditing(!editing)}>
          <Edit2 size={18} />
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      <div className="profile-content">
        {/* Profile Image */}
        <div className="profile-image-section">
          <div className="image-container">
            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                className="profile-image"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="default-profile-image">
                <span className="profile-initial">
                  {getDefaultProfileText()}
                </span>
              </div>
            )}

            {editing && (
              <div className="image-overlay">
                <label htmlFor="image-upload" className="upload-label">
                  <Camera size={20} />
                  <span>Change Photo</span>
                </label>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Profile Info */}
        <div className="profile-info">
          <div className="info-card">
            <div className="info-item">
              <div className="info-icon">
                <Mail size={20} />
              </div>
              <div className="info-content">
                <label>Email Address</label>
                <p>{user.email}</p>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon">
                {notificationsEnabled ? <Bell size={20} /> : <BellOff size={20} />}
              </div>
              <div className="info-content">
                <label>Notification Status</label>
                <button
                  className={`notification-toggle ${notificationsEnabled ? 'enabled' : 'disabled'
                    }`}
                  onClick={toggleNotifications}
                >
                  <div className="toggle-slider"></div>
                  <span>
                    {notificationsEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </button>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon">
                <User size={20} />
              </div>
              <div className="info-content">
                <label>Full Name</label>
                <p>
                  {user.firstname && user.lastname
                    ? `${user.firstname} ${user.lastname}`
                    : 'Not set'}
                </p>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon">
                <User size={20} />
              </div>
              <div className="info-content">
                <label>Role</label>
                <p className="role">{user.role || 'User'}</p>
              </div>
            </div>
          </div>

          {/* Update Button */}
          {editing && (
            <button className="update-profile-btn" onClick={handleUpdateProfile}>
              <Save size={20} />
              Update Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;