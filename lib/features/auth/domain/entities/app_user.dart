import 'package:equatable/equatable.dart';

class AppUser extends Equatable {
  const AppUser({
    required this.id,
    required this.email,
    required this.role,
    this.fullName,
    this.phone,
    this.avatarUrl,
  });

  final String id;
  final String? email;
  final String role;
  final String? fullName;
  final String? phone;
  final String? avatarUrl;

  @override
  List<Object?> get props => [id, email, role, fullName, phone, avatarUrl];
}
