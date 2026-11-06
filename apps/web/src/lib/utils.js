export const formatDate = (date) => {
  if (!date) return '';

  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatRelativeTime = (date) => {
  if (!date) return '';

  const now = new Date();
  const target = new Date(date);

  const seconds = Math.floor((now - target) / 1000);

  if (seconds < 60) return 'Just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  return formatDate(date);
};

export const getInitials = (name = '') => {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'COMPLETED':
      return '#22c55e';

    case 'IN_PROGRESS':
      return '#3b82f6';

    case 'NOT_STARTED':
      return '#94a3b8';

    default:
      return '#94a3b8';
  }
};

export const getPriorityColor = (priority) => {
  switch (priority) {
    case 'HIGH':
      return '#ef4444';

    case 'MEDIUM':
      return '#f59e0b';

    case 'LOW':
      return '#10b981';

    default:
      return '#94a3b8';
  }
};