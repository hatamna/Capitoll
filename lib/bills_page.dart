import 'package:flutter/material.dart';
import 'bill_details_page.dart';
import 'services/api_service.dart';
import 'dart:ui';

// Vote Status enum for clear status mapping
enum VoteStatus { yes, no, abstained }

class BillsPage extends StatefulWidget {
  const BillsPage({super.key});

  @override
  State<BillsPage> createState() => _BillsPageState();
}

class _BillsPageState extends State<BillsPage> {
  late Future<List<Map<String, dynamic>>> _billsFuture;

  @override
  void initState() {
    super.initState();
    _billsFuture = ApiService.getBills();
  }

  Future<void> _refresh() async {
    setState(() => _billsFuture = ApiService.getBills());
    await _billsFuture;
  }

  void _openBill(Map<String, dynamic> bill) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => BillDetailPage(
          billNum: bill['bill_code'] as String,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: _billsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Could not load bills: ${snapshot.error}'),
                    const SizedBox(height: 12),
                    OutlinedButton(onPressed: _refresh, child: const Text('Retry')),
                  ],
                ),
              ),
            );
          }

          final bills = snapshot.data ?? const [];
          final ongoing = bills.where((bill) => bill['has_been_voted_on'] != true);
          final past = bills.where((bill) => bill['has_been_voted_on'] == true);

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _sectionTitle('Ongoing Bills'),
                const SizedBox(height: 12),
                if (ongoing.isEmpty)
                  const Text('No bills are awaiting a House third-reading vote.'),
                ...ongoing.map((bill) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: BillVoteTile(
                    billNum: bill['bill_code'] as String,
                    billTitle: bill['long_title_en'] as String? ?? '',
                    voteStatus: VoteStatus.yes,
                    onTap: () => _openBill(bill),
                  ),
                )),
                const SizedBox(height: 18),
                _sectionTitle('Past Bills'),
                const SizedBox(height: 12),
                if (past.isEmpty)
                  const Text('No recorded third-reading votes yet.'),
                ...past.map((bill) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: PastVoteTile(
                    billNum: bill['bill_code'] as String,
                    billTitle: bill['long_title_en'] as String? ?? '',
                    voteStatus: VoteStatus.yes,
                    onTap: () => _openBill(bill),
                  ),
                )),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _sectionTitle(String title) => Text(
        title,
        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
      );
}

class BillVoteTile extends StatelessWidget {
  final String billTitle;
  final String billNum;
  final VoteStatus voteStatus;
  final VoidCallback? onTap;

  const BillVoteTile({
    super.key,
    required this.billTitle,
    required this.billNum,
    required this.voteStatus,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Stack(
        children: [
          Positioned.fill(
            child: Transform.translate(
              offset: const Offset(0, 2),
              child: ImageFiltered(
                imageFilter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        const Color.fromARGB(255, 255, 17, 0).withValues(alpha: 0.3),
                        const Color.fromARGB(255, 255, 149, 158).withValues(alpha: 0.3),
                      ],
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
                Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    const Text(
                      'BILL',
                      style: TextStyle(
                        color: Colors.grey,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      billNum,
                      style: const TextStyle(
                        color: Colors.black,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 12),
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
                const SizedBox(width: 8),
                IconButton(
                  icon: Image.asset(
                    'assets/icons/chevRight.png',
                  ),
                  iconSize: 24.0,
                  color: Colors.black87,
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => BillDetailPage(
                          billNum: billNum,
                        ),
                      ),
                    );
                  }
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class PastVoteTile extends StatelessWidget {
  final String billTitle;
  final String billNum;
  final VoteStatus voteStatus;
  final VoidCallback? onTap;

  const PastVoteTile({
    super.key,
    required this.billTitle,
    required this.billNum,
    required this.voteStatus,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
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
                      colors: [
                        const Color.fromARGB(255, 255, 166, 0).withValues(alpha: 0.3),
                        const Color.fromARGB(255, 255, 198, 119).withValues(alpha: 0.3),
                      ],
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
                Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    const Text(
                      'BILL',
                      style: TextStyle(
                        color: Colors.grey,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      billNum,
                      style: const TextStyle(
                        color: Colors.black,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 12),
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
                const SizedBox(width: 8),
                IconButton(
                  icon: Image.asset(
                    'assets/icons/chevRight.png',
                  ),
                  iconSize: 24.0,
                  color: Colors.black87,
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => BillDetailPage(billNum: billNum),
                      ),
                    );
                  }
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}