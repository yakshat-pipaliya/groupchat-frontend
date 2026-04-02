import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';
import { User, Mail, Bell, BellOff, Camera, Edit2, ArrowLeft, Save } from 'lucide-react';
import { getUserProfile, updateUserProfile } from '../../services/apiService';
import './Profile.css';

const Profile = ({ onBackToHome }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiLoading, setApiLoading] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [editing, setEditing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    firstname: '',
    lastname: ''
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setApiLoading(true);
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
      setFormData({
        username: data.username || '',
        firstname: data.firstname || '',
        lastname: data.lastname || ''
      });
    } catch (error) {
      console.error('Profile fetch error:', error);

      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        onBackToHome();
      } else {
        toast.error('Failed to load profile');
      }
    } finally {
      setLoading(false);
      setApiLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditToggle = () => {
    if (editing) {
      setFormData({
        username: user?.username || '',
        firstname: user?.firstname || '',
        lastname: user?.lastname || ''
      });
      setSelectedImage(null);
    }
    setEditing(!editing);
  };

  useEffect(() => {
    setImageError(false);
  }, [user?.profileImage]);

  const handleBackToChat = () => {
    onBackToHome();
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setSelectedImage(file);
    toast.success('Image selected for upload');
  };

  const toggleNotifications = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        toast.error('Authentication token not found');
        return;
      }

      const newStatus = !notificationsEnabled;
      const updateData = { notificationStatus: newStatus };
      const updatedUser = await updateUserProfile(updateData, authToken);

      setNotificationsEnabled(newStatus);
      setUser(updatedUser);
      localStorage.setItem('userData', JSON.stringify(updatedUser));
      toast.success(`Notifications ${newStatus ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Notification toggle error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update notification status';
      toast.error(errorMessage);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setUpdatingProfile(true);

      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        toast.error('Authentication token not found');
        return;
      }

      const updateData = {
        username: formData.username,
        firstname: formData.firstname,
        lastname: formData.lastname,
        notificationStatus: notificationsEnabled
      };

      const updatedUser = await updateUserProfile(updateData, authToken, selectedImage);

      setUser(updatedUser);
      localStorage.setItem('userData', JSON.stringify(updatedUser));
      setEditing(false);
      setSelectedImage(null);
      setImageError(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Profile update error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update profile';
      toast.error(errorMessage);
    } finally {
      setUpdatingProfile(false);
    }
  };

  const profileImage = useMemo(() => {
    if (!user?.profileImage || user.profileImage === 'default' || imageError) {
      return null;
    }

    let image = user.profileImage;
    if (!image.startsWith('http')) {
      image = `http://${image}`;
    }

    return image;
  }, [user?.profileImage, imageError]);

  const defaultProfileText = useMemo(() => {
    if (!user) return 'U';

    return (
      user.email?.charAt(0)?.toUpperCase() ||
      user.username?.charAt(0)?.toUpperCase() ||
      'U'
    );
  }, [user?.email, user?.username]);

  const displayName = useMemo(() => {
    const fullName = `${user?.firstname || ''} ${user?.lastname || ''}`.trim();
    return fullName || user?.username || 'Your Profile';
  }, [user?.firstname, user?.lastname, user?.username]);

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
      {apiLoading && (
        <div className="api-loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading profile data...</p>
        </div>
      )}

      <div className="profile-header">
        <button className="back-button" onClick={handleBackToChat}>
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>

        <div className="profile-header-copy">
          <h1>My Profile</h1>
          <p>Manage your account details and personal preferences.</p>
        </div>

        <button className="edit-btn" onClick={handleEditToggle}>
          <Edit2 size={18} />
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      <div className="profile-content">
        <section className="profile-hero-card">
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
                  <span className="profile-initial">{defaultProfileText}</span>
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

          <div className="profile-hero-copy">
            <span className="profile-badge">Account overview</span>
            <h2>{displayName}</h2>
            <p>{user.email}</p>

            <div className="profile-hero-meta">
              <div className="profile-meta-card">
                <span className="profile-meta-label">Username</span>
                <strong>{user.username || 'Not set'}</strong>
              </div>
              <div className="profile-meta-card">
                <span className="profile-meta-label">Notifications</span>
                <strong>{notificationsEnabled ? 'Enabled' : 'Disabled'}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="profile-info">
          <div className="info-card">
            <div className="info-card-header">
              <h3>Profile details</h3>
              <p>Update the information people see when they chat with you.</p>
            </div>

            <div className="info-grid">
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
                  <User size={20} />
                </div>
                <div className="info-content">
                  <label>Username</label>
                  {editing ? (
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="Username"
                      className="edit-input"
                    />
                  ) : (
                    <p>{user.username || 'Not set'}</p>
                  )}
                </div>
              </div>

              <div className="info-item info-item-wide">
                <div className="info-icon">
                  <User size={20} />
                </div>
                <div className="info-content">
                  <label>Full Name</label>
                  {editing ? (
                    <div className="edit-fields edit-fields-row">
                      <input
                        type="text"
                        name="firstname"
                        value={formData.firstname}
                        onChange={handleInputChange}
                        placeholder="First Name"
                        className="edit-input"
                      />
                      <input
                        type="text"
                        name="lastname"
                        value={formData.lastname}
                        onChange={handleInputChange}
                        placeholder="Last Name"
                        className="edit-input"
                      />
                    </div>
                  ) : (
                    <p>
                      {user.firstname && user.lastname
                        ? `${user.firstname} ${user.lastname}`
                        : 'Not set'}
                    </p>
                  )}
                </div>
              </div>

              <div className="info-item info-item-wide">
                <div className="info-icon">
                  {notificationsEnabled ? <Bell size={20} /> : <BellOff size={20} />}
                </div>
                <div className="info-content">
                  <label>Notification Status</label>
                  <button
                    className={`notification-toggle ${notificationsEnabled ? 'enabled' : 'disabled'}`}
                    onClick={toggleNotifications}
                  >
                    <div className="toggle-slider"></div>
                    <span>{notificationsEnabled ? 'Enabled' : 'Disabled'}</span>
                  </button>
                </div>
              </div>
            </div>

            {editing && (
              <button
                className="update-profile-btn"
                onClick={handleUpdateProfile}
                disabled={updatingProfile}
              >
                {updatingProfile ? (
                  <>
                    <div className="btn-loading-spinner"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Save Changes
                  </>
                )}
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Profile;
