import 'package:flutter/material.dart';
import 'dart:ui';
import 'dart:math';

class MyMpPage extends StatelessWidget {
  const MyMpPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(vertical: 24.0),
        child: Column(
          children: [
            Center(
              child: Container(
                width: 142,
                height: 230,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.12),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                  border: Border.all(
                    color: Colors.grey.shade200,
                    width: 2,
                  ),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: Image.network(
                    'https://www.ourcommons.ca/Content/Parliamentarians/Images/OfficialMPPhotos/45/NaqviYasir_Lib.jpg',
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => Container(
                      color: Colors.grey.shade100,
                      child: const Icon(Icons.person, size: 60, color: Colors.grey),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Hon. MP Yasir Naqvi',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
              ),
            ),
            const Text(
              'Ottawa Centre',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Compliance Score:',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Colors.black,
              )
            ),
            const SizedBox(height: 20),
            const PercentageRing(percentage: 90),
            const SizedBox(height:30),
            const Align(
              alignment: Alignment.centerLeft,
              child: Padding(
                padding: EdgeInsetsGeometry.all(10),
                child: Text (
                  'Vote History',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.black
                  )
                ),
              )
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Column(
                children: [
                  BillVoteTile(
                    billTitle: 'Bill C-234: An Act to amend the Greenhouse Gas Pollution Pricing Act',
                    voteStatus: VoteStatus.yes,
                    onTap: () {},
                  ),
                  const SizedBox(height: 10),

                  BillVoteTile(
                    billTitle: 'Bill C-11: Online Streaming Act',
                    voteStatus: VoteStatus.no,
                    onTap: () {},
                  ),
                  const SizedBox(height: 10),

                  BillVoteTile(
                    billTitle: 'Bill C-18: Online News Act',
                    voteStatus: VoteStatus.abstained,
                    onTap: () {},
                  ),
                ],
              ),
            )
          ],
        ),
      ),
    );
  }
}

class PercentageRing extends StatelessWidget {
  final double percentage;
  final double size;

  const PercentageRing({
    super.key,
    required this.percentage,
    this.size = 80.0,
  });

  Color _getTextColor(double pct) {
    if (pct >= 70) return Colors.green.shade700;
    if (pct >= 50) return Colors.amber.shade700;
    return Colors.red.shade700;
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(
            size: Size(size, size),
            painter: _RingPainter(percentage: percentage),
          ),
          Text(
            '${percentage.toInt()}%',
            style: TextStyle(
              fontSize: size * 0.24,
              fontWeight: FontWeight.bold,
              color: _getTextColor(percentage),
            ),
          ),
        ],
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  final double percentage;

  _RingPainter({required this.percentage});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    const strokeWidth = 8.0;
    final radius = (size.width - strokeWidth) / 2;

    // 1. Draw the subtle background track
    final bgPaint = Paint()
      ..color = Colors.grey.shade200
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;

    canvas.drawCircle(center, radius, bgPaint);

    // 2. Determine gradient colors based on percentage
    List<Color> gradientColors;
    if (percentage >= 70) {
      gradientColors = [Colors.green.shade400, Colors.green.shade700];
    } else if (percentage >= 50) {
      gradientColors = [Colors.amber.shade400, Colors.amber.shade700];
    } else {
      gradientColors = [Colors.orange.shade400, Colors.red.shade700];
    }

    // 3. Draw the gradient foreground arc
    final sweepAngle = 2 * pi * (percentage / 100).clamp(0.0, 1.0);
    final rect = Rect.fromCircle(center: center, radius: radius);

    final gradientPaint = Paint()
      ..shader = SweepGradient(
        colors: gradientColors,
        startAngle: 0.0,
        endAngle: sweepAngle > 0 ? sweepAngle : 0.001,
        transform: const GradientRotation(-pi / 2), // Rotates gradient to start at 12 o'clock
      ).createShader(rect)
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = strokeWidth;

    canvas.drawArc(
      rect,
      -pi / 2, // Start at 12 o'clock
      sweepAngle,
      false,
      gradientPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _RingPainter oldDelegate) {
    return oldDelegate.percentage != percentage;
  }
}

enum VoteStatus { yes, no, abstained }

class BillVoteTile extends StatelessWidget {
  final String billTitle;
  final VoteStatus voteStatus;
  final VoidCallback? onTap;

  const BillVoteTile({
    super.key,
    required this.billTitle,
    required this.voteStatus,
    this.onTap,
  });

  String get _voteText {
    switch (voteStatus) {
      case VoteStatus.yes:
        return 'Yes';
      case VoteStatus.no:
        return 'No';
      case VoteStatus.abstained:
        return 'Abstained';
    }
  }

  Color get _voteColor {
    switch (voteStatus) {
      case VoteStatus.yes:
        return Colors.green.shade700;
      case VoteStatus.no:
        return Colors.red.shade700;
      case VoteStatus.abstained:
        return Colors.grey.shade700;
    }
  }

  List<Color> get _gradientColors {
    switch (voteStatus) {
      case VoteStatus.yes:
        return [
          Colors.green.shade700.withValues(alpha: 0.3),
          Colors.lightGreen.shade500.withValues(alpha: 0.3),
        ];
      case VoteStatus.no:
        return [
          Colors.red.shade700.withValues(alpha: 0.3),
          Colors.orange.shade600.withValues(alpha: 0.3),
        ];
      case VoteStatus.abstained:
        return [
          Colors.grey.shade700.withValues(alpha: 0.3),
          Colors.grey.shade400.withValues(alpha: 0.3),
        ];
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _voteColor;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Stack(
        children: [
          Positioned.fill(
            child: Transform.translate(
              offset: const Offset(0, 4),
              child: ImageFiltered(
                imageFilter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: _gradientColors,
                    ),
                  ),
                ),
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    billTitle,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: Colors.black87,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    _voteText,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: color,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}