import React, { useEffect, useState } from 'react';
import { storageService } from '../services/storageService';
import { Notification } from '../types';
import { Heart, Bookmark, MessageCircle, Bell } from 'lucide-react';

const NotificationsScreen: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await storageService.getNotifications();
      setNotifications(data);
      setLoading(false);
    };
    load();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'save': return <Bookmark className="text-gold" size={20} />;
      case 'cook': return <Heart className="text-red-500" size={20} />;
      case 'review': return <MessageCircle className="text-blue-500" size={20} />;
      default: return <Bell className="text-midGrey" size={20} />;
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-dark mb-6">Notifications</h2>
      
      {loading ? (
        <div className="text-center text-midGrey text-sm py-10">Checking alerts...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 bg-secondary rounded-xl">
           <Bell className="w-12 h-12 text-midGrey mx-auto mb-4 opacity-50" />
           <p className="text-midGrey font-medium">No new activity.</p>
           <p className="text-xs text-midGrey mt-1">Post public recipes to get engagement!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notif) => (
            <div key={notif.id} className={`p-4 rounded-xl flex gap-4 ${notif.read ? 'bg-white border border-secondary' : 'bg-gold/5 border border-gold/20'}`}>
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
                {getIcon(notif.type)}
              </div>
              <div>
                <p className="text-sm text-dark leading-snug">
                  <span className="font-bold">{notif.actorName}</span>{' '}
                  {notif.message.replace(notif.actorName, '')}
                </p>
                <p className="text-[10px] text-midGrey mt-1">
                  {new Date(notif.date).toLocaleDateString()} at {new Date(notif.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsScreen;