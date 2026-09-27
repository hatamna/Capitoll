import 'dart:ui';
import 'package:flutter/material.dart';
import 'dart:math' as math;

class PastBillDetailPage extends StatelessWidget {
  const PastBillDetailPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        iconTheme: const IconThemeData(color: Colors.black87),
        title: const Text(
          'Bill Details',
          style: TextStyle(
            color: Colors.black87,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 10),
            const Text(
              'BILL',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Colors.grey,
              ),
            ),
            Transform.translate(
              offset: const Offset(0, -8),
              child: const Text(
                'C-99',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 70,
                ),
              ),
            ),
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20.0),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade200),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: const Text(
                'An Act to amend certain acts in relation to public infrastructure, resource management, and community funding allocations, and to provide for related administrative measures.',
                style: TextStyle(
                  fontSize: 15,
                  height: 1.4,
                  color: Colors.black87,
                ),
              ),
            ),
            const SizedBox(height: 16),
            const BillVoteSeatMapCard(
              yeas: 210,
              nays: 115,
              absent: 13,
              isPassed: true,
            ),
            const SizedBox(height: 20),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20.0),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade200),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: const [
                  Text(
                    'Your MP\'s vote:',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                      height: 1.4,
                      color: Colors.black87,
                    ),
                  ),
                  Text(
                    'FOR', // Or 'AGAINST'
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                      color: Color(0xFF2E7D32), // use Color(0xFFC62828) for AGAINST
                    ),
                  ),
                  const SizedBox(height:20)
                ],
              ),
            ),
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20.0),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade200),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: const [
                  Text(
                    'Public Support:',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                      height: 1.4,
                      color: Colors.black87,
                    ),
                  ),
                  Text(
                    '55%',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                      color: Color(0xFF2E7D32), // use Color(0xFFC62828) for low %
                    ),
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

class BillVoteSeatMapCard extends StatelessWidget {
  final int yeas;
  final int nays;
  final int absent;
  final bool isPassed;

  const BillVoteSeatMapCard({
    super.key,
    this.yeas = 208,
    this.nays = 118,
    this.absent = 12,
    this.isPassed = true,
  });

  int get totalVotes => yeas + nays + absent;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20.0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header & Pass/Fail Status Badge
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'HOUSE VOTE RESULTS',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey,
                  letterSpacing: 0.8,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isPassed
                      ? const Color(0xFFE8F5E9)
                      : const Color(0xFFFFEBEE),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  isPassed ? 'PASSED' : 'DEFEATED',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: isPassed
                        ? const Color(0xFF2E7D32)
                        : const Color(0xFFC62828),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Seating Map Visualizer
          SizedBox(
            height: 180,
            width: double.infinity,
            child: CustomPaint(
              painter: ParliamentSeatPainter(
                yeas: yeas,
                nays: nays,
                absent: absent,
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Vote Counter Breakdown Bar
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: SizedBox(
              height: 8,
              child: Row(
                children: [
                  Expanded(
                    flex: yeas,
                    child: Container(color: const Color(0xFF2E7D32)),
                  ),
                  Expanded(
                    flex: nays,
                    child: Container(color: const Color(0xFFE53935)),
                  ),
                  Expanded(
                    flex: absent,
                    child: Container(color: Colors.grey.shade400),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Legend & Metrics
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildLegendItem('Yeas', yeas, const Color(0xFF2E7D32)),
              _buildLegendItem('Nays', nays, const Color(0xFFE53935)),
              _buildLegendItem('Not Voting', absent, Colors.grey.shade400),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLegendItem(String label, int count, Color color) {
    return Row(
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 6),
        Text(
          '$label: ',
          style: TextStyle(
            fontSize: 13,
            color: Colors.grey.shade700,
          ),
        ),
        Text(
          '$count',
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
      ],
    );
  }
}

class ParliamentSeatPainter extends CustomPainter {
  final int yeas;
  final int nays;
  final int absent;

  ParliamentSeatPainter({
    required this.yeas,
    required this.nays,
    required this.absent,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final int totalRealSeats = yeas + nays + absent;
    if (totalRealSeats == 0) return;

    // Define visual seating arc parameters (5 concentric rows)
    final List<int> seatsPerRow = [18, 22, 26, 30, 34];
    final int visualSeatCount = seatsPerRow.reduce((a, b) => a + b); // 130 seats

    // Map real votes proportionally to the visual dots
    final List<Color> seatColors = [];
    int visualYeas = ((yeas / totalRealSeats) * visualSeatCount).round();
    int visualNays = ((nays / totalRealSeats) * visualSeatCount).round();
    int visualAbsent = visualSeatCount - visualYeas - visualNays;

    for (int i = 0; i < visualYeas; i++) {
      seatColors.add(const Color(0xFF2E7D32));
    }
    for (int i = 0; i < visualNays; i++) {
      seatColors.add(const Color(0xFFE53935));
    }
    for (int i = 0; i < visualAbsent; i++) {
      seatColors.add(Colors.grey.shade300);
    }

    final Offset center = Offset(size.width / 2, size.height * 0.95);
    final double minRadius = size.height * 0.35;
    final double maxRadius = size.height * 0.85;
    final double radiusStep = (maxRadius - minRadius) / (seatsPerRow.length - 1);

    int colorIndex = 0;

    for (int row = 0; row < seatsPerRow.length; row++) {
      final double radius = minRadius + (row * radiusStep);
      final int count = seatsPerRow[row];

      for (int seat = 0; seat < count; seat++) {
        if (colorIndex >= seatColors.length) break;

        // Spread dots across a 180-degree arch (pi to 0 radians)
        final double angle = math.pi - ((seat / (count - 1)) * math.pi);
        final double x = center.dx + radius * math.cos(angle);
        final double y = center.dy - radius * math.sin(angle);

        final paint = Paint()
          ..color = seatColors[colorIndex]
          ..style = PaintingStyle.fill;

        canvas.drawCircle(Offset(x, y), 3.5, paint);
        colorIndex++;
      }
    }

    // Draw Speaker's Chair / Table at center bottom
    final speakerPaint = Paint()
      ..color = Colors.grey.shade400
      ..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(center.dx, center.dy - 10), 6, speakerPaint);
  }

  @override
  bool shouldRepaint(covariant ParliamentSeatPainter oldDelegate) {
    return oldDelegate.yeas != yeas ||
        oldDelegate.nays != nays ||
        oldDelegate.absent != absent;
  }
}