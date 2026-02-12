import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'home_screen.dart';
import 'community_screen.dart';
import 'shopping_list_screen.dart';
import 'notifications_screen.dart';
import 'profile_screen.dart';
import '../services/revenue_cat_service.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 0;
  
  final List<Widget> _screens = [
    const HomeScreen(),
    const CommunityScreen(),
    const ShoppingListScreen(),
    const NotificationsScreen(),
    const ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    // Listen to global state to update glow
    return ValueListenableBuilder<bool>(
      valueListenable: RevenueCatService().premiumNotifier,
      builder: (context, isPremium, _) {
        return Scaffold(
          body: Column(
            children: [
              // --- PREMIUM GLOW EFFECT ---
              if (isPremium)
                Container(
                  height: 4,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [
                        Color(0xFFDAA520), // GoldenRod
                        Color(0xFFFFD700), // Gold
                        Color(0xFFFFFACD), // LemonChiffon
                        Color(0xFFFFD700),
                        Color(0xFFDAA520),
                      ],
                      begin: Alignment.centerLeft,
                      end: Alignment.centerRight,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.amber.withOpacity(0.6),
                        blurRadius: 15,
                        spreadRadius: 2,
                        offset: const Offset(0, 2),
                      )
                    ]
                  ),
                ),
              // --- MAIN CONTENT ---
              Expanded(child: _screens[_currentIndex]),
            ],
          ),
          bottomNavigationBar: NavigationBar(
            selectedIndex: _currentIndex,
            onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
            backgroundColor: Colors.white,
            // Dynamic indicator color
            indicatorColor: isPremium 
                ? const Color(0xFFFFD700).withOpacity(0.3) 
                : const Color(0xFFC9A24D).withOpacity(0.2),
            elevation: 1,
            destinations: const [
              NavigationDestination(icon: Icon(LucideIcons.home), label: 'Home'),
              NavigationDestination(icon: Icon(LucideIcons.globe), label: 'Feed'),
              NavigationDestination(icon: Icon(LucideIcons.shoppingBag), label: 'Shop'),
              NavigationDestination(icon: Icon(LucideIcons.bell), label: 'Updates'),
              NavigationDestination(icon: Icon(LucideIcons.user), label: 'Profile'),
            ],
          ),
        );
      }
    );
  }
}
