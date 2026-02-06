import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { storageService } from '../services/storageService';
import { Notification } from '../types';
import { Heart, Bookmark, MessageCircle, Bell } from 'lucide-react-native';

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
      case 'save': return <Bookmark stroke="#C9A24D" size={20} />;
      case 'cook': return <Heart stroke="#EF4444" size={20} />;
      case 'review': return <MessageCircle stroke="#3B82F6" size={20} />;
      default: return <Bell stroke="#6B6B6B" size={20} />;
    }
  };

  return (
    <ScrollView className="flex-1 bg-white p-6">
      <Text className="text-2xl font-bold text-dark mb-6">Notifications</Text>
      
      {loading ? (
        <ActivityIndicator color="#C9A24D" />
      ) : notifications.length === 0 ? (
        <View className="py-20 bg-secondary rounded-xl items-center justify-center">
           <Bell size={48} stroke="#9CA3AF" />
           <Text className="text-midGrey font-medium mt-4">No new activity.</Text>
           <Text className="text-xs text-midGrey mt-1">Post public recipes to get engagement!</Text>
        </View>
      ) : (
        <View className="gap-4 pb-20">
          {notifications.map((notif) => (
            <View key={notif.id} className={`p-4 rounded-xl flex-row gap-4 ${notif.read ? 'bg-white border border-secondary' : 'bg-orange-50 border border-gold/20'}`}>
              <View className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm">
                {getIcon(notif.type)}
              </View>
              <View className="flex-1">
                <Text className="text-sm text-dark">
                  <Text className="font-bold">{notif.actorName}</Text>{' '}
                  {notif.message.replace(notif.actorName, '')}
                </Text>
                <Text className="text-[10px] text-midGrey mt-1">
                  {new Date(notif.date).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

export default NotificationsScreen;