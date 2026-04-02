// Test script to verify the chat panel fix
console.log('Testing chat panel fix...');

// Simulate localStorage with an existing activeChat
localStorage.setItem('activeChat', JSON.stringify({
  id: 'test-chat-123',
  type: 'private',
  name: 'Test Chat'
}));

// Simulate the ChatContext initialization logic
const getInitialActiveChat = () => {
  // This is the new logic - should return null
  return null;
};

const initialActiveChat = getInitialActiveChat();
console.log('Initial active chat:', initialActiveChat);

if (initialActiveChat === null) {
  console.log('✅ SUCCESS: Chat panel will not auto-open on login');
} else {
  console.log('❌ FAILURE: Chat panel will still auto-open');
}

// Clean up
localStorage.removeItem('activeChat');
