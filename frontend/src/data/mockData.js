export const mockUsers = [
  { id: 'u1', name: 'Alex Johnson', avatar: '', status: 'online', lastSeen: null },
  { id: 'u2', name: 'Sarah Williams', avatar: '', status: 'offline', lastSeen: '2024-01-15T10:30:00Z' },
  { id: 'u3', name: 'Mike Chen', avatar: '', status: 'online', lastSeen: null },
  { id: 'u4', name: 'Emma Davis', avatar: '', status: 'away', lastSeen: '2024-01-15T14:20:00Z' },
  { id: 'u5', name: 'James Wilson', avatar: '', status: 'online', lastSeen: null },
];

export const currentUser = {
  id: 'current',
  name: 'You',
  avatar: '',
  status: 'online'
};

export const mockChats = [
  {
    id: 'c1',
    type: 'private',
    name: 'Alex Johnson',
    participants: ['u1'],
    avatar: '',
    lastMessage: {
      text: 'Hey, are we still meeting tomorrow?',
      timestamp: '2024-01-15T16:30:00Z',
      sender: 'u1'
    },
    unread: 2,
    online: true
  },
  {
    id: 'c2',
    type: 'private',
    name: 'Sarah Williams',
    participants: ['u2'],
    avatar: '',
    lastMessage: {
      text: 'Thanks for the help!',
      timestamp: '2024-01-15T10:15:00Z',
      sender: 'current'
    },
    unread: 0,
    online: false
  },
  {
    id: 'c3',
    type: 'group',
    name: 'Development Team',
    participants: ['u1', 'u3', 'u5'],
    avatar: '',
    lastMessage: {
      text: 'Mike: I just pushed the latest changes',
      timestamp: '2024-01-15T17:45:00Z',
      sender: 'u3'
    },
    unread: 5,
    memberCount: 4
  },
  {
    id: 'c4',
    type: 'group',
    name: 'Project Alpha',
    participants: ['u2', 'u4', 'u5'],
    avatar: '',
    lastMessage: {
      text: 'Emma shared a file',
      timestamp: '2024-01-15T15:20:00Z',
      sender: 'u4',
      file: true
    },
    unread: 0,
    memberCount: 4
  }
];

export const mockMessages = {
  c1: [
    {
      id: 'm1',
      text: 'Hi there!',
      timestamp: '2024-01-15T14:00:00Z',
      sender: 'current',
      type: 'text'
    },
    {
      id: 'm2',
      text: 'Hey! How are you?',
      timestamp: '2024-01-15T14:02:00Z',
      sender: 'u1',
      type: 'text'
    },
    {
      id: 'm3',
      text: 'Doing great! Working on the new project.',
      timestamp: '2024-01-15T14:05:00Z',
      sender: 'current',
      type: 'text'
    },
    {
      id: 'm4',
      text: 'That\'s awesome! Let me know if you need help.',
      timestamp: '2024-01-15T14:10:00Z',
      sender: 'u1',
      type: 'text'
    },
    {
      id: 'm5',
      text: 'Hey, are we still meeting tomorrow?',
      timestamp: '2024-01-15T16:30:00Z',
      sender: 'u1',
      type: 'text'
    }
  ],
  c3: [
    {
      id: 'm6',
      text: 'Team meeting at 3 PM today',
      timestamp: '2024-01-15T16:00:00Z',
      sender: 'current',
      type: 'text'
    },
    {
      id: 'm7',
      text: 'Got it! I\'ll prepare the slides.',
      timestamp: '2024-01-15T16:15:00Z',
      sender: 'u3',
      type: 'text'
    },
    {
      id: 'm8',
      text: 'Can someone review my PR?',
      timestamp: '2024-01-15T16:30:00Z',
      sender: 'u5',
      type: 'text'
    },
    {
      id: 'm9',
      text: 'On it!',
      timestamp: '2024-01-15T16:35:00Z',
      sender: 'current',
      type: 'text'
    },
    {
      id: 'm10',
      text: 'I just pushed the latest changes',
      timestamp: '2024-01-15T17:45:00Z',
      sender: 'u3',
      type: 'text'
    }
  ]
};

export const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const formatFullTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};
