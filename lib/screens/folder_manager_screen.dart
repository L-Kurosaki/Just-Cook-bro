import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../models.dart';
import '../services/storage_service.dart';

class FolderManagerScreen extends StatefulWidget {
  const FolderManagerScreen({super.key});

  @override
  State<FolderManagerScreen> createState() => _FolderManagerScreenState();
}

class _FolderManagerScreenState extends State<FolderManagerScreen> {
  final StorageService _storage = StorageService();
  List<Folder> _folders = [];
  String? _currentParentId; // To support navigation into subfolders
  List<Folder> _breadcrumbs = []; // Track path

  @override
  void initState() {
    super.initState();
    _loadFolders();
  }

  Future<void> _loadFolders() async {
    final allFolders = await _storage.getFolders();
    setState(() {
      _folders = allFolders;
    });
  }

  List<Folder> get _visibleFolders {
    return _folders.where((f) => f.parentId == _currentParentId).toList();
  }

  Future<void> _createFolder() async {
    final controller = TextEditingController();
    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("New Folder"),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(hintText: "Folder Name"),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("Cancel")),
          ElevatedButton(
            onPressed: () async {
              if (controller.text.isNotEmpty) {
                await _storage.createFolder(controller.text, parentId: _currentParentId);
                _loadFolders();
                if (mounted) Navigator.pop(context);
              }
            },
            child: const Text("Create"),
          )
        ],
      ),
    );
  }

  Future<void> _deleteFolder(String id) async {
    // Confirm deletion
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Delete Folder?"),
        content: const Text("Recipes in this folder will be moved to 'All Recipes'."),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text("Cancel")),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text("Delete", style: TextStyle(color: Colors.red))),
        ],
      ),
    );

    if (confirm == true) {
      await _storage.deleteFolder(id);
      _loadFolders();
    }
  }

  Future<void> _moveFolder(Folder dragged, Folder target) async {
    if (dragged.id == target.id) return;
    
    // Update parent ID
    final updated = dragged.copyWith(parentId: target.id);
    await _storage.updateFolder(updated);
    _loadFolders();
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text("Moved '${dragged.name}' into '${target.name}'"))
    );
  }
  
  void _enterFolder(Folder folder) {
    setState(() {
      _currentParentId = folder.id;
      _breadcrumbs.add(folder);
    });
  }

  void _goBack() {
    if (_breadcrumbs.isNotEmpty) {
      setState(() {
        _breadcrumbs.removeLast();
        _currentParentId = _breadcrumbs.isNotEmpty ? _breadcrumbs.last.id : null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Manage Folders", style: TextStyle(color: Color(0xFF2E2E2E), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft, color: Colors.black),
          onPressed: () {
            if (_currentParentId != null) {
              _goBack();
            } else {
              Navigator.pop(context);
            }
          },
        ),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Breadcrumbs
          if (_currentParentId != null)
             Padding(
               padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
               child: Row(
                 children: [
                   GestureDetector(
                     onTap: () {
                       setState(() {
                         _breadcrumbs.clear();
                         _currentParentId = null;
                       });
                     },
                     child: const Text("All Folders", style: TextStyle(color: Colors.grey)),
                   ),
                   const Icon(LucideIcons.chevronRight, size: 16, color: Colors.grey),
                   ..._breadcrumbs.map((f) => Row(
                     children: [
                       Text(f.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                       if (f != _breadcrumbs.last)
                         const Icon(LucideIcons.chevronRight, size: 16, color: Colors.grey),
                     ],
                   ))
                 ],
               ),
             ),

          const Padding(
            padding: EdgeInsets.all(16.0),
            child: Text(
              "Drag one folder onto another to organize.",
              style: TextStyle(color: Colors.grey, fontSize: 12),
            ),
          ),
          Expanded(
            child: _visibleFolders.isEmpty 
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(LucideIcons.folderOpen, size: 64, color: Colors.grey),
                      const SizedBox(height: 16),
                      Text(_currentParentId == null ? "No folders yet." : "This folder is empty.", style: const TextStyle(color: Colors.grey)),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _visibleFolders.length,
                  itemBuilder: (context, index) {
                    final folder = _visibleFolders[index];
                    
                    return LongPressDraggable<Folder>(
                      data: folder,
                      feedback: Material(
                        color: Colors.transparent,
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(color: const Color(0xFFDAA520).withOpacity(0.9), borderRadius: BorderRadius.circular(12)),
                          child: Text(folder.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        ),
                      ),
                      childWhenDragging: Opacity(opacity: 0.3, child: _buildFolderTile(folder)),
                      child: DragTarget<Folder>(
                        onWillAccept: (incoming) => incoming != null && incoming.id != folder.id,
                        onAccept: (incoming) => _moveFolder(incoming, folder),
                        builder: (context, candidateData, rejectedData) {
                           return Container(
                             decoration: BoxDecoration(
                               border: candidateData.isNotEmpty 
                                  ? Border.all(color: const Color(0xFFDAA520), width: 2) 
                                  : null,
                               borderRadius: BorderRadius.circular(12)
                             ),
                             child: _buildFolderTile(folder),
                           );
                        },
                      ),
                    );
                  },
                ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFFC9A24D),
        onPressed: _createFolder,
        icon: const Icon(LucideIcons.plus, color: Colors.white),
        label: const Text("New Folder", style: TextStyle(color: Colors.white)),
      ),
    );
  }

  Widget _buildFolderTile(Folder folder) {
    // Check if this folder has children
    final hasChildren = _folders.any((f) => f.parentId == folder.id);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFFF3F4F6)),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 5, offset: const Offset(0, 2))]
      ),
      child: ListTile(
        leading: Icon(
          hasChildren ? LucideIcons.folderArchive : LucideIcons.folder, 
          color: const Color(0xFFC9A24D)
        ),
        title: Text(folder.name, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: hasChildren ? const Text("Contains subfolders", style: TextStyle(fontSize: 10, color: Colors.grey)) : null,
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(LucideIcons.trash2, color: Colors.red, size: 18),
              onPressed: () => _deleteFolder(folder.id),
            ),
            const Icon(LucideIcons.chevronRight, color: Colors.grey),
          ],
        ),
        onTap: () => _enterFolder(folder),
      ),
    );
  }
}