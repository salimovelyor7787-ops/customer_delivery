/// Must match `profiles.role` values enforced by RLS and Edge Functions.
abstract class AppRoles {
  static const customer = 'customer';
  static const courier = 'courier';
  static const restaurant = 'restaurant';
  static const admin = 'admin';
}
