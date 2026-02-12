import 'package:uuid/uuid.dart';

const uuid = Uuid();

class Ingredient {
  final String name;
  final String amount;
  final String? category;
  final String? imageUrl; // New: For visualization
  bool owned;

  Ingredient({
    required this.name,
    required this.amount,
    this.category,
    this.imageUrl,
    this.owned = false,
  });

  factory Ingredient.fromJson(Map<String, dynamic> json) {
    return Ingredient(
      name: json['name'] ?? '',
      amount: json['amount'] ?? '',
      category: json['category'],
      imageUrl: json['imageUrl'],
      owned: json['owned'] ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
    'name': name,
    'amount': amount,
    'category': category,
    'imageUrl': imageUrl,
    'owned': owned,
  };
}

class Step {
  final String instruction;
  final int? timeInSeconds;
  final String? tip;
  final String? warning;

  Step({
    required this.instruction,
    this.timeInSeconds,
    this.tip,
    this.warning,
  });

  factory Step.fromJson(Map<String, dynamic> json) {
    return Step(
      instruction: json['instruction'] ?? '',
      timeInSeconds: json['timeInSeconds'],
      tip: json['tip'],
      warning: json['warning'],
    );
  }

  Map<String, dynamic> toJson() => {
    'instruction': instruction,
    'timeInSeconds': timeInSeconds,
    'tip': tip,
    'warning': warning,
  };
}

class Recipe {
  final String id;
  final String title;
  final String description;
  final String prepTime;
  final String cookTime;
  final int servings;
  final List<Ingredient> ingredients;
  final List<Step> steps;
  final String? imageUrl;
  final bool isPremium;
  final bool isOffline;
  final bool isPublic;
  final String? author;
  final String? sourceUrl; // New: For attribution
  final int? rating;
  final String? folderId; 
  final List<String> tags;
  final List<String> allergens;

  Recipe({
    String? id,
    required this.title,
    required this.description,
    required this.prepTime,
    required this.cookTime,
    required this.servings,
    required this.ingredients,
    required this.steps,
    this.imageUrl,
    this.isPremium = false,
    this.isOffline = false,
    this.isPublic = false,
    this.author,
    this.sourceUrl,
    this.rating,
    this.folderId,
    this.tags = const [],
    this.allergens = const [],
  }) : id = id ?? uuid.v4();

  factory Recipe.fromJson(Map<String, dynamic> json) {
    return Recipe(
      id: json['id'],
      title: json['title'] ?? 'Untitled',
      description: json['description'] ?? '',
      prepTime: json['prepTime'] ?? '',
      cookTime: json['cookTime'] ?? '',
      servings: json['servings'] ?? 1,
      ingredients: (json['ingredients'] as List?)
              ?.map((e) => Ingredient.fromJson(e))
              .toList() ??
          [],
      steps: (json['steps'] as List?)?.map((e) => Step.fromJson(e)).toList() ??
          [],
      imageUrl: json['imageUrl'],
      isPremium: json['isPremium'] ?? false,
      isOffline: json['isOffline'] ?? false,
      isPublic: json['isPublic'] ?? false,
      author: json['author'],
      sourceUrl: json['sourceUrl'],
      rating: json['rating'],
      folderId: json['folderId'],
      tags: List<String>.from(json['tags'] ?? []),
      allergens: List<String>.from(json['allergens'] ?? []),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'description': description,
    'prepTime': prepTime,
    'cookTime': cookTime,
    'servings': servings,
    'ingredients': ingredients.map((e) => e.toJson()).toList(),
    'steps': steps.map((e) => e.toJson()).toList(),
    'imageUrl': imageUrl,
    'isPremium': isPremium,
    'isOffline': isOffline,
    'isPublic': isPublic,
    'author': author,
    'sourceUrl': sourceUrl,
    'rating': rating,
    'folderId': folderId,
    'tags': tags,
    'allergens': allergens,
  };
  
  Recipe copyWith({String? folderId}) {
    return Recipe(
      id: id,
      title: title,
      description: description,
      prepTime: prepTime,
      cookTime: cookTime,
      servings: servings,
      ingredients: ingredients,
      steps: steps,
      imageUrl: imageUrl,
      isPremium: isPremium,
      isOffline: isOffline,
      isPublic: isPublic,
      author: author,
      sourceUrl: sourceUrl,
      rating: rating,
      folderId: folderId ?? this.folderId,
      tags: tags,
      allergens: allergens,
    );
  }
}

class Folder {
  final String id;
  final String name;
  final String? parentId; // Added for nesting

  Folder({String? id, required this.name, this.parentId}) : id = id ?? uuid.v4();

  factory Folder.fromJson(Map<String, dynamic> json) {
    return Folder(
      id: json['id'],
      name: json['name'],
      parentId: json['parentId'],
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'parentId': parentId,
  };
  
  Folder copyWith({String? name, String? parentId}) {
    return Folder(
      id: id,
      name: name ?? this.name,
      parentId: parentId ?? this.parentId,
    );
  }
}

class UserProfile {
  String name;
  String? email;
  String? phoneNumber;
  String? avatarUrl;
  bool isPremium;
  List<String> dietaryPreferences;
  List<String> allergies;
  List<SpotifyTrack> musicHistory;

  UserProfile({
    this.name = 'Chef',
    this.email,
    this.phoneNumber,
    this.avatarUrl,
    this.isPremium = false,
    this.dietaryPreferences = const [],
    this.allergies = const [],
    this.musicHistory = const [],
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      name: json['name'] ?? 'Chef',
      email: json['email'],
      phoneNumber: json['phoneNumber'],
      avatarUrl: json['avatarUrl'],
      isPremium: json['isPremium'] ?? false,
      dietaryPreferences: List<String>.from(json['dietaryPreferences'] ?? []),
      allergies: List<String>.from(json['allergies'] ?? []),
      musicHistory: (json['musicHistory'] as List?)
          ?.map((e) => SpotifyTrack.fromJson(e))
          .toList() ?? [],
    );
  }

  Map<String, dynamic> toJson() => {
    'name': name,
    'email': email,
    'phoneNumber': phoneNumber,
    'avatarUrl': avatarUrl,
    'isPremium': isPremium,
    'dietaryPreferences': dietaryPreferences,
    'allergies': allergies,
    'musicHistory': musicHistory.map((e) => e.toJson()).toList(),
  };
}

class ShopItem {
  final String id;
  String text;
  bool done;

  ShopItem({required this.id, required this.text, this.done = false});

  factory ShopItem.fromJson(Map<String, dynamic> json) {
    return ShopItem(
      id: json['id'],
      text: json['text'],
      done: json['done'] ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'text': text,
    'done': done,
  };
}

class AppNotification {
  final String id;
  final String type; // 'save', 'cook', 'review'
  final String message;
  final DateTime date;
  bool read;

  AppNotification({
    required this.id,
    required this.type,
    required this.message,
    required this.date,
    this.read = false,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id'],
      type: json['type'],
      message: json['message'],
      date: DateTime.parse(json['date']),
      read: json['read'] ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'type': type,
    'message': message,
    'date': date.toIso8601String(),
    'read': read,
  };
}

class SpotifyTrack {
  final String name;
  final String artist;
  final String? albumArt;
  final String uri;
  final DateTime playedAt;

  SpotifyTrack({
    required this.name,
    required this.artist,
    this.albumArt,
    required this.uri,
    required this.playedAt,
  });

  factory SpotifyTrack.fromJson(Map<String, dynamic> json) {
    return SpotifyTrack(
      name: json['name'],
      artist: json['artist'],
      albumArt: json['albumArt'],
      uri: json['uri'],
      playedAt: DateTime.parse(json['playedAt']),
    );
  }

  Map<String, dynamic> toJson() => {
    'name': name,
    'artist': artist,
    'albumArt': albumArt,
    'uri': uri,
    'playedAt': playedAt.toIso8601String(),
  };
}