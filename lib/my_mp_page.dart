import 'package:flutter/material.dart';

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
            const PercentageRing(percentage: 95),
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

  Color _getRingColor(double pct) {
    if (pct >= 70) {
      return Colors.green;
    } else if (pct >= 50) {
      return Colors.amber.shade700;
    } else {
      return Colors.red;
    }
  }

  @override
  Widget build(BuildContext context) {
    final ringColor = _getRingColor(percentage);

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          SizedBox(
            width: size,
            height: size,
            child: CircularProgressIndicator(
              value: (percentage / 100).clamp(0.0, 1.0),
              strokeWidth: 8.0,
              backgroundColor: Colors.grey.shade200,
              color: ringColor,
              strokeCap: StrokeCap.round,
            ),
          ),
          Text(
            '${percentage.toInt()}%',
            style: TextStyle(
              fontSize: size * 0.24,
              fontWeight: FontWeight.bold,
              color: ringColor,
            ),
          ),
        ],
      ),
    );
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

  // Returns the label text based on the vote
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

  // Returns the color scheme for each vote type
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

  @override
  Widget build(BuildContext context) {
    final color = _voteColor;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade200),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            // Bill Title (Left side)
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

            // Vote Status Badge (Right side)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12), // Soft background tint
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
    );
  }
}