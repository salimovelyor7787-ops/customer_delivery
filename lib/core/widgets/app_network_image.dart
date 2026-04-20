import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

class AppNetworkImage extends StatelessWidget {
  const AppNetworkImage({
    super.key,
    required this.imageUrl,
    this.fit = BoxFit.cover,
    this.borderRadius,
    this.placeholderIcon = Icons.restaurant,
  });

  final String? imageUrl;
  final BoxFit fit;
  final BorderRadius? borderRadius;
  final IconData placeholderIcon;

  @override
  Widget build(BuildContext context) {
    final url = imageUrl;
    Widget child;
    if (url == null || url.isEmpty) {
      child = ColoredBox(
        color: Theme.of(context).colorScheme.surfaceVariant,
        child: Icon(placeholderIcon, size: 40),
      );
    } else {
      child = CachedNetworkImage(
        imageUrl: url,
        fit: fit,
        memCacheWidth: 600,
        placeholder: (_, __) => const Center(child: CircularProgressIndicator()),
        errorWidget: (_, __, ___) => ColoredBox(
          color: Theme.of(context).colorScheme.surfaceVariant,
          child: Icon(placeholderIcon, size: 40),
        ),
      );
    }
    if (borderRadius != null) {
      child = ClipRRect(borderRadius: borderRadius!, child: child);
    }
    return child;
  }
}
