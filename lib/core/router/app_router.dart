import 'package:customer_delivery/core/router/auth_refresh_notifier.dart';
import 'package:customer_delivery/core/router/navigation_utils.dart';
import 'package:customer_delivery/features/auth/presentation/screens/login_screen.dart';
import 'package:customer_delivery/features/auth/presentation/screens/register_screen.dart';
import 'package:customer_delivery/features/cart/presentation/screens/cart_screen.dart';
import 'package:customer_delivery/features/checkout/presentation/screens/checkout_screen.dart';
import 'package:customer_delivery/features/home/presentation/screens/home_screen.dart';
import 'package:customer_delivery/features/home/presentation/screens/messages_placeholder_screen.dart';
import 'package:customer_delivery/features/home/presentation/screens/search_screen.dart';
import 'package:customer_delivery/features/orders/presentation/screens/order_detail_screen.dart';
import 'package:customer_delivery/features/orders/presentation/screens/orders_screen.dart';
import 'package:customer_delivery/features/profile/presentation/screens/profile_screen.dart';
import 'package:customer_delivery/features/restaurant/domain/entities/menu_item.dart';
import 'package:customer_delivery/features/restaurant/presentation/screens/product_detail_screen.dart';
import 'package:customer_delivery/features/restaurant/presentation/screens/restaurant_detail_screen.dart';
import 'package:flutter/material.dart';
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
                path: '/messages',
                builder: (_, __) => const MessagesPlaceholderScreen(),
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
        path: '/orders',
        parentNavigatorKey: rootNavigatorKey,
        builder: (_, __) => const OrdersScreen(),
        routes: [
          GoRoute(
            path: ':orderId',
            builder: (c, s) => OrderDetailScreen(orderId: s.pathParameters['orderId']!),
          ),
        ],
      ),
      GoRoute(
        path: '/checkout',
        parentNavigatorKey: rootNavigatorKey,
        builder: (_, __) => const CheckoutScreen(),
      ),
    ],
  );
}

class ScaffoldWithNavBar extends StatelessWidget {
  const ScaffoldWithNavBar({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        surfaceTintColor: Colors.transparent,
        backgroundColor: Colors.white,
        elevation: 8,
        selectedIndex: navigationShell.currentIndex,
        onDestinationSelected: navigationShell.goBranch,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded),
            label: 'Главная',
          ),
          NavigationDestination(
            icon: Icon(Icons.search_rounded),
            selectedIcon: Icon(Icons.search_rounded),
            label: 'Поиск',
          ),
          NavigationDestination(
            icon: Icon(Icons.shopping_bag_outlined),
            selectedIcon: Icon(Icons.shopping_bag_rounded),
            label: 'Корзина',
          ),
          NavigationDestination(
            icon: Icon(Icons.chat_bubble_outline_rounded),
            selectedIcon: Icon(Icons.chat_bubble_rounded),
            label: 'Чат',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline_rounded),
            selectedIcon: Icon(Icons.person_rounded),
            label: 'Профиль',
          ),
        ],
      ),
    );
  }
}
