import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, SafeAreaView } from 'react-native';
import { ArrowLeft, Plus, Trash2, CheckSquare, Square } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { storageService } from '../services/storageService';
import { ShopItem } from '../types';

const ShoppingListScreen = () => {
    const navigation = useNavigation<any>();
    const [items, setItems] = useState<ShopItem[]>([]);
    const [newItem, setNewItem] = useState("");

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        const data = await storageService.getShoppingList();
        setItems(data);
    };

    const saveItems = async (newItems: ShopItem[]) => {
        setItems(newItems);
        await storageService.saveShoppingList(newItems);
    };

    const addItem = () => {
        if (newItem.trim()) {
            const updated = [...items, { id: Date.now().toString(), text: newItem, done: false }];
            saveItems(updated);
            setNewItem("");
        }
    };

    const toggleItem = (id: string) => {
        const updated = items.map(i => i.id === id ? { ...i, done: !i.done } : i);
        saveItems(updated);
    };

    const clearDone = () => {
        const updated = items.filter(i => !i.done);
        saveItems(updated);
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-row items-center p-4 border-b border-secondary">
                <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
                    <ArrowLeft size={24} color="#2E2E2E" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-dark ml-2">Shopping List</Text>
                <View className="flex-1" />
                <TouchableOpacity onPress={clearDone}>
                    <Text className="text-xs font-bold text-red-500">Clear Done</Text>
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 p-4">
                {items.length === 0 ? (
                    <View className="items-center justify-center mt-20">
                        <Text className="text-midGrey">Your list is empty.</Text>
                    </View>
                ) : (
                    items.map(item => (
                        <TouchableOpacity 
                            key={item.id} 
                            onPress={() => toggleItem(item.id)}
                            className="flex-row items-center bg-secondary/30 p-4 rounded-xl mb-2"
                        >
                            {item.done ? <CheckSquare size={20} color="#C9A24D" /> : <Square size={20} color="#6B6B6B" />}
                            <Text className={`ml-3 text-base flex-1 ${item.done ? 'text-midGrey line-through' : 'text-dark'}`}>
                                {item.text}
                            </Text>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>

            <View className="p-4 border-t border-secondary bg-white">
                <View className="flex-row gap-2">
                    <TextInput 
                        className="flex-1 bg-secondary p-3 rounded-xl text-dark"
                        placeholder="Add ingredient..."
                        value={newItem}
                        onChangeText={setNewItem}
                        onSubmitEditing={addItem}
                    />
                    <TouchableOpacity onPress={addItem} className="bg-gold p-3 rounded-xl items-center justify-center">
                        <Plus size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

export default ShoppingListScreen;