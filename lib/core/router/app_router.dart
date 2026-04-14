import 'package:customer_delivery/core/router/auth_refresh_notifier.dart';
import 'package:customer_delivery/core/router/navigation_utils.dart';
import 'package:customer_delivery/features/auth/presentation/screens/login_screen.dart';
import 'package:customer_delivery/features/auth/presentation/screens/register_screen.dart';
import 'package:customer_delivery/features/cart/presentation/notifiers/cart_notifier.dart';
import 'package:customer_delivery/features/cart/presentation/screens/cart_screen.dart';
import 'package:customer_delivery/features/checkout/presentation/screens/checkout_screen.dart';
import 'package:customer_delivery/features/home/presentation/screens/home_screen.dart';
import 'package:customer_delivery/features/home/presentation/screens/messages_placeholder_screen.dart';
import 'package:customer_delivery/features/home/presentation/screens/search_screen.dart';
import 'package:customer_delivery/features/home/presentation/screens/stores_screen.dart';
import 'package:customer_delivery/features/orders/presentation/screens/order_detail_screen.dart';
import 'package:customer_delivery/features/orders/presentation/screens/orders_screen.dart';
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
    final cart = ref.watch(cartNotifierProvider);
    final cartItemsCount = cart.lines.fold<int>(0, (sum, line) => sum + line.quantity);
    void onTabSelected(int index) {
      navigationShell.goBranch(
        index,
        // Повторный тап по текущему табу возвращает на корневой экран вкладки.
        initialLocation: index == navigationShell.currentIndex,
      );
    }

    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        surfaceTintColor: Colors.transparent,
        backgroundColor: Colors.white,
        elevation: 8,
        height: 70,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysHide,
        selectedIndex: navigationShell.currentIndex,
        onDestinationSelected: onTabSelected,
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.home_filled, size: 28),
            selectedIcon: Icon(Icons.home_filled, size: 30),
            label: 'Bosh sahifa',
          ),
          const NavigationDestination(
            icon: Icon(Icons.manage_search_rounded, size: 28),
            selectedIcon: Icon(Icons.manage_search_rounded, size: 30),
            label: 'Qidiruv',
          ),
          NavigationDestination(
            icon: _CartIconWithBadge(count: cartItemsCount, selected: false),
            selectedIcon: _CartIconWithBadge(count: cartItemsCount, selected: true),
            label: 'Savat',
          ),
          const NavigationDestination(
            icon: Icon(Icons.account_circle_outlined, size: 28),
            selectedIcon: Icon(Icons.account_circle_rounded, size: 30),
            label: 'Profil',
          ),
        ],
      ),
    );
  }
}

class _CartIconWithBadge extends StatelessWidget {
  const _CartIconWithBadge({required this.count, required this.selected});

  final int count;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Icon(
          selected ? Icons.shopping_bag_rounded : Icons.shopping_bag_outlined,
          size: selected ? 30 : 28,
        ),
        if (count > 0)
          Positioned(
            right: -10,
            top: -7,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary,
                borderRadius: BorderRadius.circular(10),
              ),
              constraints: const BoxConstraints(minWidth: 18),
              child: Text(
                count > 99 ? '99+' : '$count',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
      ],
    );
  }
}
