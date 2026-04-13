import 'package:customer_delivery/core/router/app_router.dart';
import 'package:customer_delivery/core/router/auth_refresh_notifier.dart';
import 'package:customer_delivery/core/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class CustomerApp extends ConsumerStatefulWidget {
  const CustomerApp({super.key});

  @override
  ConsumerState<CustomerApp> createState() => _CustomerAppState();
}

class _CustomerAppState extends ConsumerState<CustomerApp> {
  late final AuthRefreshNotifier _authRefresh;
  late final GoRouter _router;

  @override
  void initState() {
    super.initState();
    final client = Supabase.instance.client;
    _authRefresh = AuthRefreshNotifier(client);
    _router = createAppRouter(authRefresh: _authRefresh, supabase: client);
  }

  @override
  void dispose() {
    _authRefresh.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Delivery',
      theme: AppTheme.light(),
      routerConfig: _router,
    );
  }
}
