import React, { useEffect, useState } from 'react';
import { useNotification, NotificationType } from '../../context/NotificationContext';

const Toast: React.FC<{ id: number; message: string; type: NotificationType }> = ({ id, message, type }) => {
  const { removeNotification } = useNotification();
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      removeNotification(id);
    }, 300); // Match CSS exit animation duration
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
    }, 3000); // Start exit animation after 3 seconds

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`toast-item toast-${type} ${isExiting ? 'exit' : ''}`}>
      <div className="toast-content">{message}</div>
      <button className="toast-close" onClick={handleClose}>&times;</button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { notifications } = useNotification();

  return (
    <div className="toast-container">
      {notifications.map((notification) => (
        <Toast key={notification.id} {...notification} />
      ))}
    </div>
  );
};
