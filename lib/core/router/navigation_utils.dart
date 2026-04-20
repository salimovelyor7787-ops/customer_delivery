/// Внутренний путь после логина (без open-redirect).
String? safeRedirectPath(String? next) {
  if (next == null || next.isEmpty) return null;
  final t = next.trim();
  if (!t.startsWith('/') || t.startsWith('//') || t.contains('://')) return null;
  return t;
}

String withNextQuery(String path, String? next) {
  final safe = safeRedirectPath(next);
  if (safe == null) return path;
  final sep = path.contains('?') ? '&' : '?';
  return '$path${sep}next=${Uri.encodeComponent(safe)}';
}
