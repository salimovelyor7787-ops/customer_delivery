import 'package:customer_delivery/core/router/auth_refresh_notifier.dart';
import 'package:customer_delivery/core/router/navigation_utils.dart';
import 'package:customer_delivery/features/auth/presentation/screens/login_screen.dart';
import 'package:customer_delivery/features/auth/presentation/screens/register_screen.dart';
import 'package:customer_delivery/features/cart/presentation/notifiers/cart_notifier.dart';
import 'package:customer_delivery/features/cart/presentation/screens/cart_screen.dart';
import 'package:customer_delivery/features/checkout/presentation/screens/checkout_screen.dart';
import 'package:customer_delivery/features/home/presentation/screens/home_screen.dart';
import 'package:customer_delivery/features/home/presentation/screens/messages_placeholder_screen.dart';
import 'package:customer_delivery/features/home/presentation/screens/notifications_screen.dart';
import 'package:customer_delivery/features/home/presentation/screens/search_screen.dart';
import 'package:customer_delivery/features/home/presentation/screens/stores_screen.dart';
import 'package:customer_delivery/features/profile/presentation/screens/profile_screen.dart';
import 'package:customer_delivery/features/restaurant/domain/entities/menu_item.dart';
import 'package:customer_delivery/features/restaurant/presentation/screens/product_detail_screen.dart';
import 'package:customer_delivery/features/restaurant/presentation/screens/restaurant_detail_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

GoRouter createAppRouter({
  required AuthRefreshNotifier authRefresh,
  required SupabaseClient supabase,
}) {
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/home',
    refreshListenable: authRefresh,
    redirect: (context, state) {
      final session = supabase.auth.currentSession;
      final loc = state.matchedLocation;
      final loggingIn = loc == '/login' || loc == '/register';

      if (loc == '/checkout' && session == null) {
        return '/login?next=${Uri.encodeComponent('/checkout')}';
      }

      if (session != null && loggingIn) {
        final next = safeRedirectPath(state.uri.queryParameters['next']);
        if (next != null) return next;
        return '/home';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        parentNavigatorKey: rootNavigatorKey,
        builder: (_, __) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        parentNavigatorKey: rootNavigatorKey,
        builder: (_, __) => const RegisterScreen(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return ScaffoldWithNavBar(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/home',
                builder: (_, __) => const HomeScreen(),
                routes: [
                  GoRoute(
                    path: 'stores',
                    builder: (_, __) => const StoresScreen(),
                  ),
                  GoRoute(
                    path: 'notifications',
                    parentNavigatorKey: rootNavigatorKey,
                    builder: (_, __) => const NotificationsScreen(),
                  ),
                  GoRoute(
                    path: 'restaurant/:id',
                    builder: (c, s) => RestaurantDetailScreen(restaurantId: s.pathParameters['id']!),
                    routes: [
                      GoRoute(
                        path: 'item/:itemId',
                        builder: (c, s) {
                          final extra = s.extra;
                          MenuItem? preloaded;
                          if (extra is MenuItem) preloaded = extra;
                          return ProductDetailScreen(
                            restaurantId: s.pathParameters['id']!,
                            menuItemId: s.pathParameters['itemId']!,
                            preloaded: preloaded,
                          );
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/search',
                builder: (_, __) => const SearchScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/cart',
                builder: (_, __) => const CartScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                builder: (_, __) => const ProfileScreen(),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: '/checkout',
        parentNavigatorKey: rootNavigatorKey,
        builder: (_, __) => const CheckoutScreen(),
      ),
      GoRoute(
        path: '/support',
        parentNavigatorKey: rootNavigatorKey,
        builder: (_, __) => const SupportChatScreen(),
      ),
    ],
  );
}

class ScaffoldWithNavBar extends ConsumerWidget {
  const ScaffoldWithNavBar({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final hasCartItems = ref.watch(cartNotifierProvider).lines.isNotEmpty;

    void onTabSelected(int index) {
      navigationShell.goBranch(
        index,
        // Повторный тап по текущему табу возвращает на корневой экран вкладки.
        initialLocation: index == navigationShell.currentIndex,
      );
    }

    return Scaffold(
      body: Padding(
        // Reserve space for floating bottom bar so last cards are reachable.
        padding: const EdgeInsets.only(bottom: 98),
        child: navigationShell,
      ),
      extendBody: true,
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.fromLTRB(16, 0, 16, 12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(26),
            border: Border.all(color: const Color(0x14000000)),
            boxShadow: const [
              BoxShadow(
                color: Color(0x1F000000),
                blurRadius: 24,
                offset: Offset(0, 12),
              ),
              BoxShadow(
                color: Color(0x12000000),
                blurRadius: 10,
                offset: Offset(0, 3),
              ),
            ],
          ),
          child: Row(
            children: [
              _FloatingNavItem(
                icon: Icons.home_outlined,
                activeIcon: Icons.home_rounded,
                selected: navigationShell.currentIndex == 0,
                onTap: () => onTabSelected(0),
              ),
              _FloatingNavItem(
                icon: Icons.search_rounded,
                activeIcon: Icons.search_rounded,
                selected: navigationShell.currentIndex == 1,
                onTap: () => onTabSelected(1),
              ),
              _FloatingNavItem(
                icon: Icons.shopping_basket_outlined,
                activeIcon: Icons.shopping_basket_rounded,
                selected: navigationShell.currentIndex == 2,
                showDot: hasCartItems,
                onTap: () => onTabSelected(2),
              ),
              _FloatingNavItem(
                icon: Icons.person_outline_rounded,
                activeIcon: Icons.person_rounded,
                selected: navigationShell.currentIndex == 3,
                onTap: () => onTabSelected(3),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FloatingNavItem extends StatelessWidget {
  const _FloatingNavItem({
    required this.icon,
    required this.activeIcon,
    required this.selected,
    required this.onTap,
    this.showDot = false,
  });

  final IconData icon;
  final IconData activeIcon;
  final bool selected;
  final VoidCallback onTap;
  final bool showDot;

  @override
  Widget build(BuildContext context) {
    const activeColor = Color(0xFFFF7A00);
    const inactiveColor = Color(0xFF8C8C8C);

    return Expanded(
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 220),
                  curve: Curves.easeOutCubic,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: selected ? const Color(0x26FF7A00) : Colors.transparent,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      AnimatedScale(
                        duration: const Duration(milliseconds: 200),
                        curve: Curves.easeOutBack,
                        scale: selected ? 1.1 : 1,
                        child: Icon(
                          selected ? activeIcon : icon,
                          size: selected ? 28 : 26,
                          color: selected ? activeColor : inactiveColor,
                        ),
                      ),
                      if (showDot)
                        Positioned(
                          right: -1,
                          top: -1,
                          child: Container(
                            width: 9,
                            height: 9,
                            decoration: BoxDecoration(
                              color: Colors.red,
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 1.2),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
