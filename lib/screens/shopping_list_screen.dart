import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models.dart';

class ShoppingListScreen extends StatefulWidget {
  const ShoppingListScreen({super.key});

  @override
  State<ShoppingListScreen> createState() => _ShoppingListScreenState();
}

class _ShoppingListScreenState extends State<ShoppingListScreen> {
  List<ShopItem> _items = [];
  final _textController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadItems();
  }

  Future<void> _loadItems() async {
    final prefs = await SharedPreferences.getInstance();
    final String? data = prefs.getString('jcb_shopping');
    if (data != null) {
      final List<dynamic> json = jsonDecode(data);
      setState(() {
        _items = json.map((e) => ShopItem.fromJson(e)).toList();
      });
    }
  }

  Future<void> _saveItems() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('jcb_shopping', jsonEncode(_items.map((e) => e.toJson()).toList()));
  }

  void _addItem() {
    if (_textController.text.isNotEmpty) {
      setState(() {
        _items.add(ShopItem(id: DateTime.now().toString(), text: _textController.text));
        _textController.clear();
      });
      _saveItems();
    }
  }

  void _toggleItem(int index) {
    setState(() {
      _items[index].done = !_items[index].done;
    });
    _saveItems();
  }

  void _clearDone() {
    setState(() {
      _items.removeWhere((item) => item.done);
    });
    _saveItems();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Shopping List', style: TextStyle(color: Color(0xFF2E2E2E), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          TextButton(
            onPressed: _clearDone,
            child: const Text('Clear Done', style: TextStyle(color: Colors.red)),
          )
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _items.isEmpty 
              ? const Center(child: Text('Your list is empty', style: TextStyle(color: Colors.grey)))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _items.length,
                  itemBuilder: (context, index) {
                    final item = _items[index];
                    return GestureDetector(
                      onTap: () => _toggleItem(index),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF3F4F6),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              item.done ? LucideIcons.checkSquare : LucideIcons.square,
                              color: item.done ? const Color(0xFFC9A24D) : Colors.grey,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                item.text,
                                style: TextStyle(
                                  fontSize: 16,
                                  decoration: item.done ? TextDecoration.lineThrough : null,
                                  color: item.done ? Colors.grey : Colors.black,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
          ),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: Color(0xFFF3F4F6))),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _textController,
                    decoration: InputDecoration(
                      hintText: 'Add ingredient...',
                      filled: true,
                      fillColor: const Color(0xFFF3F4F6),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                    onSubmitted: (_) => _addItem(),
                  ),
                ),
                const SizedBox(width: 12),
                FloatingActionButton(
                  onPressed: _addItem,
                  backgroundColor: const Color(0xFFC9A24D),
                  child: const Icon(LucideIcons.plus, color: Colors.white),
                  mini: true,
                  elevation: 0,
                ),
              ],
            ),
          )
        ],
      ),
    );
  }
}
