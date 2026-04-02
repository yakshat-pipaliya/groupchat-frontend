import axios from 'axios';

// API service for authentication
const API_BASE_URL = 'https://gh802w59-3000.inc1.devtunnels.ms';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const loginWithFCM = async (email, password, fcmToken) => {
  try {
    const response = await api.post('/auth/login', {
      email,
      password,
      fcmToken
    });

    return response.data;
  } catch (error) {
    console.error('Login API error:', error);
    throw error;
  }
};

export const registerWithFCM = async (userData, fcmToken) => {
  try {
    const response = await api.post('/auth/register', {
      ...userData,
      fcmToken
    });

    return response.data;
  } catch (error) {
    console.error('Registration API error:', error);
    throw error;
  }
};

export const updateFCMToken = async (userId, fcmToken, authToken) => {
  try {
    const response = await api.put(
      '/user/fcm-token',
      { fcmToken },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('FCM token update error:', error);
    throw error;
  }
};

export const getUserProfile = async (userId, authToken) => {
  try {
    const response = await api.get(
      `/user/profile/${userId}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Profile fetch error:', error);
    throw error;
  }
};

export const updateUserProfile = async (userData, authToken, profileImage = null) => {
  try {
    const formData = new FormData();
    
    // Add text fields
    if (userData.username) formData.append('username', userData.username);
    if (userData.firstname) formData.append('firstname', userData.firstname);
    if (userData.lastname) formData.append('lastname', userData.lastname);
    if (userData.notificationStatus !== undefined) formData.append('notificationStatus', userData.notificationStatus);
    
    // Add image file if provided
    if (profileImage) {
      formData.append('profileImage', profileImage);
    }

    const response = await api.patch(
      '/user/profile',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Profile update error:', error);
    throw error;
  }
};

export const logoutUser = async (authToken) => {
  try {
    const response = await api.post(
      '/user/logout',
      {},
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

export const searchUsers = async (query, authToken) => {
  try {
    const response = await api.get(
      `/user/serchuser?query=${encodeURIComponent(query)}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Search users error:', error);
    throw error;
  }
};

export const getChatMembers = async (authToken) => {
  const config = {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  };

  try {
    const response = await api.get('/user/getchatmember', config);

    return response.data;
  } catch (error) {
    if (error?.response?.status !== 404) {
      console.error('Get chat members error:', error);
      throw error;
    }

    try {
      const fallbackResponse = await api.get('/user/getchatmember', config);
      return fallbackResponse.data;
    } catch (fallbackError) {
      console.error('Get chat members error:', fallbackError);
      throw fallbackError;
    }
  }
};

export const getGroupDetails = async (groupId, authToken) => {
  try {
    const response = await api.get(
      `/group/${groupId}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Get group details error:', error);
    throw error;
  }
};
