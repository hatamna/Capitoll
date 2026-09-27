import 'package:flutter/material.dart';
import 'dart:ui';
import 'dart:math';
import 'services/api_service.dart';
import 'services/riding_preference_service.dart';

class MyMpPage extends StatefulWidget {
  const MyMpPage({super.key});

  @override
  State<MyMpPage> createState() => _MyMpPageState();
}

class _MyMpPageState extends State<MyMpPage> {
  String? _selectedRiding;
  late Future<Map<String, dynamic>> _dataFuture;

  @override
  void initState() {
    super.initState();
    RidingPreferenceService.currentRiding.addListener(_onPreferenceChanged);
    _dataFuture = _loadData();
  }

  @override
  void dispose() {
    RidingPreferenceService.currentRiding.removeListener(_onPreferenceChanged);
    super.dispose();
  }

  void _onPreferenceChanged() {
    final ridingName = RidingPreferenceService.currentRiding.value;
    if (!mounted || ridingName == null || ridingName == _selectedRiding) return;

    setState(() {
      _selectedRiding = ridingName;
      _dataFuture = _loadData();
    });
  }

  Future<String> _loadPhoto(String ridingName) async {
    try {
      return await ApiService.getMpPhotoForRiding(ridingName);
    } catch (_) {
      return '';
    }
  }

  Future<Map<String, dynamic>> _loadData() async {
    final response = await ApiService.getCurrentMps();
    final mps = (response['mps'] as List<dynamic>? ?? [])
        .cast<Map<String, dynamic>>();
    if (mps.isEmpty) {
      throw Exception('No current MPs are available.');
    }

    final ridingNames =
        mps
            .map((mp) => mp['riding_name'] as String?)
            .whereType<String>()
            .toSet()
            .toList()
          ..sort();
    final preferredRiding =
        _selectedRiding ?? RidingPreferenceService.currentRiding.value;
    final ridingName = ridingNames.contains(preferredRiding)
        ? preferredRiding!
        : ridingNames.contains('Ottawa Centre')
        ? 'Ottawa Centre'
        : ridingNames.first;
    _selectedRiding = ridingName;

    if (ridingName != RidingPreferenceService.currentRiding.value) {
      await RidingPreferenceService.setCurrentRiding(ridingName);
    }

    final mp = mps.firstWhere((item) => item['riding_name'] == ridingName);
    final personId = mp['person_id'].toString();
    final results = await Future.wait<dynamic>([
      ApiService.getRidingComplianceScore(ridingName),
      ApiService.getMpBillActivity(personId),
      _loadPhoto(ridingName),
    ]);

    return {
      'mps': mps,
      'riding_names': ridingNames,
      'riding_name': ridingName,
      'mp': mp,
      'score': results[0] as Map<String, dynamic>,
      'activity': results[1] as Map<String, dynamic>,
      'photo_url': results[2] as String,
    };
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: FutureBuilder<Map<String, dynamic>>(
        future: _dataFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError || !snapshot.hasData) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text('Could not load MP data: ${snapshot.error}'),
              ),
            );
          }

          final data = snapshot.data!;
          final mp = data['mp'] as Map<String, dynamic>;
          final score = data['score'] as Map<String, dynamic>;
          final activity = data['activity'] as Map<String, dynamic>;
          final bills = (activity['bills'] as List<dynamic>? ?? [])
              .cast<Map<String, dynamic>>();
          final scoreValue =
              (score['compliance_score'] as num?)?.toDouble() ?? 0;
          final photoUrl = data['photo_url'] as String;

          return ListView(
            padding: const EdgeInsets.symmetric(vertical: 24),
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: DropdownButtonFormField<String>(
                  key: ValueKey(data['riding_name']),
                  initialValue: data['riding_name'] as String,
                  decoration: const InputDecoration(
                    labelText: 'Riding',
                    border: OutlineInputBorder(),
                  ),
                  items: (data['riding_names'] as List<String>)
                      .map(
                        (name) =>
                            DropdownMenuItem(value: name, child: Text(name)),
                      )
                      .toList(),
                  onChanged: (value) {
                    if (value == null) return;
                    setState(() {
                      _selectedRiding = value;
                      _dataFuture = _loadData();
                    });
                  },
                ),
              ),
              const SizedBox(height: 20),
              Center(
                child: Container(
                  width: 142,
                  height: 190,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.grey.shade200, width: 2),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(14),
                    child: photoUrl.isEmpty
                        ? const Icon(Icons.person, size: 60, color: Colors.grey)
                        : Image.network(
                            photoUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) =>
                                const Icon(
                                  Icons.person,
                                  size: 60,
                                  color: Colors.grey,
                                ),
                          ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Center(
                child: Text(
                  mp['name']?.toString() ?? 'MP details unavailable',
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              Center(
                child: Text(
                  '${mp['party'] ?? 'Party unavailable'} · ${data['riding_name']}',
                  style: const TextStyle(fontSize: 15, color: Colors.grey),
                ),
              ),
              const SizedBox(height: 20),
              const Center(
                child: Text(
                  'Compliance Score',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 14),
              Center(child: PercentageRing(percentage: scoreValue)),
              Center(
                child: Text(
                  '${score['aligned_bills'] ?? 0} of ${score['compared_bills'] ?? 0} comparable bills',
                  style: const TextStyle(color: Colors.grey),
                ),
              ),
              const SizedBox(height: 24),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  'Vote History',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
              ),
              if (bills.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text('No recorded votes for this MP yet.'),
                ),
              ...bills.map(
                (bill) => Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: BillVoteTile(
                    billTitle:
                        '${bill['number_code'] ?? bill['bill_code']}: ${bill['long_title_en'] ?? ''}',
                    voteStatus: switch (bill['mp_vote']) {
                      'YES' => VoteStatus.yes,
                      'NO' => VoteStatus.no,
                      _ => VoteStatus.abstained,
                    },
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class PercentageRing extends StatelessWidget {
  final double percentage;
  final double size;

  const PercentageRing({super.key, required this.percentage, this.size = 80.0});

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
        transform: const GradientRotation(
          -pi / 2,
        ), // Rotates gradient to start at 12 o'clock
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
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
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
