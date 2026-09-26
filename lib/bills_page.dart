import 'package:flutter/material.dart';
import 'bill_details_page.dart';
import 'past_bills_details_page.dart';
import 'dart:ui';

// Vote Status enum for clear status mapping
enum VoteStatus { yes, no, abstained }

class BillsPage extends StatelessWidget {
  const BillsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Ongoing Bills',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 20),

            BillVoteTile(
              billNum: 'C-234',
              billTitle: 'An Act to amend the Greenhouse Gas Pollution Pricing Act',
              voteStatus: VoteStatus.yes,
              onTap: () {},
            ),
            const SizedBox(height: 12),

            BillVoteTile(
              billNum: 'C-11',
              billTitle: 'Online Streaming Act',
              voteStatus: VoteStatus.no,
              onTap: () {},
            ),
            const SizedBox(height: 12),

            BillVoteTile(
              billNum: 'C-18',
              billTitle: 'Online News Act',
              voteStatus: VoteStatus.abstained,
              onTap: () {},
            ),
            const SizedBox(height: 12),

            BillVoteTile(
              billNum: 'C-35',
              billTitle: 'Canada Early Learning and Child Care Act',
              voteStatus: VoteStatus.yes,
              onTap: () {},
            ),
            const SizedBox(height: 12),

            BillVoteTile(
              billNum: 'C-27',
              billTitle: 'Digital Charter Implementation Act',
              voteStatus: VoteStatus.no,
              onTap: () {},
            ),

            const SizedBox(height: 30),
            const Text(
              'Past Bills',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 20),

            PastVoteTile(
              billNum: "C-46",
              billTitle: "Blah Blah Past Bill Blah Blah",
              voteStatus: VoteStatus.no,
              onTap: () {}
            ),
            
            const SizedBox(height: 12),

            PastVoteTile(
              billNum: "C-99",
              billTitle: "Blah Blah Past Bill Blah Blah Blah Blah",
              voteStatus: VoteStatus.no,
              onTap: () {}
            ),
            const SizedBox(height: 12),

            PastVoteTile(
              billNum: "C-121",
              billTitle: "Blah Blah Past Bill Poop Poop Blah Blah Blah Blah",
              voteStatus: VoteStatus.no,
              onTap: () {}
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }
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
                        builder: (context) =>  PastBillDetailPage(),
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