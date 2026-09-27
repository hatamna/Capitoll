import 'package:flutter/material.dart';

import 'services/api_service.dart';
import 'services/riding_preference_service.dart';

class BillDetailPage extends StatefulWidget {
  final String billNum;

  const BillDetailPage({super.key, required this.billNum});

  @override
  State<BillDetailPage> createState() => _BillDetailPageState();
}

class _BillDetailPageState extends State<BillDetailPage> {
  late Future<Map<String, dynamic>> _billFuture;
  late Future<Map<String, dynamic>> _descriptionFuture;
  List<Map<String, dynamic>> _ridings = [];
  String? _selectedRiding;
  Map<String, dynamic>? _voteResult;
  String? _voteError;
  bool _loadingRidings = true;
  bool _loadingVoteResult = false;
  bool _submittingVote = false;
  bool _hasWeighedIn = false;

  @override
  void initState() {
    super.initState();
    RidingPreferenceService.currentRiding.addListener(_onPreferenceChanged);
    _billFuture = ApiService.getBill(widget.billNum);
    _descriptionFuture = ApiService.getBillDescription(widget.billNum);
    _loadRidings();
  }

  @override
  void dispose() {
    RidingPreferenceService.currentRiding.removeListener(_onPreferenceChanged);
    super.dispose();
  }

  void _onPreferenceChanged() {
    final ridingName = RidingPreferenceService.currentRiding.value;
    if (!mounted ||
        ridingName == null ||
        !_ridings.any((riding) => riding['name'] == ridingName) ||
        ridingName == _selectedRiding) {
      return;
    }

    setState(() {
      _selectedRiding = ridingName;
      _hasWeighedIn = false;
    });
    _loadVoteResult();
  }

  Future<void> _loadRidings() async {
    try {
      final ridings = await ApiService.getRidings();
      if (!mounted) return;

      final ridingNames = ridings
          .map((riding) => riding['name'] as String?)
          .whereType<String>()
          .toList();
      final preferredRiding = RidingPreferenceService.currentRiding.value;
      final selectedRiding = ridingNames.contains(preferredRiding)
          ? preferredRiding
          : ridingNames.contains('Ottawa Centre')
          ? 'Ottawa Centre'
          : ridingNames.isNotEmpty
          ? ridingNames.first
          : null;

      setState(() {
        _ridings = ridings;
        _selectedRiding = selectedRiding;
        _loadingRidings = false;
      });

      if (selectedRiding != null && selectedRiding != preferredRiding) {
        await RidingPreferenceService.setCurrentRiding(selectedRiding);
      }
      await _loadVoteResult();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _voteError = error.toString();
        _loadingRidings = false;
      });
    }
  }

  Future<void> _loadVoteResult() async {
    final ridingName = _selectedRiding;
    if (ridingName == null) return;

    setState(() {
      _loadingVoteResult = true;
      _voteError = null;
    });

    try {
      final result = await ApiService.getBillRidingResult(
        widget.billNum,
        ridingName,
      );
      if (!mounted) return;
      setState(() => _voteResult = result);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _voteResult = null;
        _voteError =
            'No voting data is available for this riding and bill session.';
      });
    } finally {
      if (mounted) setState(() => _loadingVoteResult = false);
    }
  }

  bool _isBillVoteOpen(Map<String, dynamic> bill) {
    final passedAt = bill['passed_house_third_reading_at']?.toString();
    final hasPassedThirdReading =
        passedAt != null &&
        passedAt.isNotEmpty &&
        !passedAt.startsWith('0001-01-01');
    return bill['has_been_voted_on'] != true && !hasPassedThirdReading;
  }

  void _retryDescription() {
    setState(() {
      _descriptionFuture = ApiService.getBillDescription(widget.billNum);
    });
  }

  Future<void> _submitVote(String choice, Map<String, dynamic> bill) async {
    final ridingName = _selectedRiding;
    if (ridingName == null || !_isBillVoteOpen(bill)) return;

    setState(() => _submittingVote = true);
    try {
      final result = await ApiService.submitRidingVote(
        billCode: widget.billNum,
        ridingName: ridingName,
        choice: choice,
      );
      if (!mounted) return;
      setState(() {
        _voteResult = result;
        _hasWeighedIn = true;
      });
      Navigator.of(context).pop();
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Your vote was recorded.')));
    } catch (error) {
      if (!mounted) return;
      setState(() => _voteError = error.toString());
    } finally {
      if (mounted) setState(() => _submittingVote = false);
    }
  }

  Future<void> _showVoteSheet(Map<String, dynamic> bill) async {
    if (!_isBillVoteOpen(bill)) return;
    String? selectedChoice;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) => StatefulBuilder(
        builder: (context, setSheetState) => Padding(
          padding: EdgeInsets.fromLTRB(
            20,
            12,
            20,
            MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Your vote for ${widget.billNum}',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              Text('Riding: ${_selectedRiding ?? 'Not selected'}'),
              const SizedBox(height: 20),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'Y', label: Text('For')),
                  ButtonSegment(value: 'A', label: Text('Abstain')),
                  ButtonSegment(value: 'N', label: Text('Against')),
                ],
                selected: selectedChoice == null ? {} : {selectedChoice!},
                onSelectionChanged: (selection) {
                  setSheetState(() => selectedChoice = selection.first);
                },
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: selectedChoice == null || _submittingVote
                    ? null
                    : () => _submitVote(selectedChoice!, bill),
                child: _submittingVote
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Submit vote'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        centerTitle: true,
        title: const Text('Bill Details'),
      ),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _billFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError || !snapshot.hasData) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  'Could not load bill: ${snapshot.error ?? 'No data'}',
                ),
              ),
            );
          }

          final bill = snapshot.data!;
          final tally = _voteResult?['user_tally'] as Map<String, dynamic>?;
          final counts = tally?['counts'] as Map<String, dynamic>? ?? {};
          final mp = _voteResult?['mp'] as Map<String, dynamic>?;
          final mpVote = mp?['vote']?.toString();

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                bill['bill_code']?.toString() ?? widget.billNum,
                style: const TextStyle(
                  fontSize: 30,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                bill['long_title_en']?.toString() ?? 'Title unavailable',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
              if ((bill['long_title_fr'] ?? '').toString().isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(bill['long_title_fr'].toString()),
              ],
              const SizedBox(height: 12),
              const Text(
                'ABOUT THIS BILL',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.8,
                  color: Colors.grey,
                ),
              ),
              const SizedBox(height: 6),
              FutureBuilder<Map<String, dynamic>>(
                future: _descriptionFuture,
                builder: (context, descriptionSnapshot) {
                  if (descriptionSnapshot.connectionState ==
                      ConnectionState.waiting) {
                    return const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: LinearProgressIndicator(),
                    );
                  }
                  if (descriptionSnapshot.hasError) {
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Could not generate the bill description.'),
                        TextButton(
                          onPressed: _retryDescription,
                          child: const Text('Try again'),
                        ),
                      ],
                    );
                  }
                  return Text(
                    descriptionSnapshot.data?['description']?.toString() ?? '',
                    style: const TextStyle(fontSize: 15, height: 1.45),
                  );
                },
              ),
              Text('Status: ${bill['status'] ?? 'Unknown'}'),
              Text(
                'Parliament ${bill['parliament_number']}-${bill['session_number']}',
              ),
              const SizedBox(height: 20),
              DropdownButtonFormField<String>(
                key: ValueKey(_selectedRiding),
                initialValue: _selectedRiding,
                decoration: const InputDecoration(
                  labelText: 'Riding',
                  border: OutlineInputBorder(),
                ),
                items: _ridings
                    .map(
                      (riding) => DropdownMenuItem<String>(
                        value: riding['name'] as String,
                        child: Text(riding['name'] as String),
                      ),
                    )
                    .toList(),
                onChanged: _loadingRidings
                    ? null
                    : (value) {
                        setState(() {
                          _selectedRiding = value;
                          _hasWeighedIn = false;
                        });
                        _loadVoteResult();
                      },
              ),
              const SizedBox(height: 16),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: _loadingVoteResult
                      ? const Center(child: CircularProgressIndicator())
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Riding votes',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 8),
                            Text('For: ${counts['Y'] ?? 0}'),
                            Text('Against: ${counts['N'] ?? 0}'),
                            Text('Abstain: ${counts['A'] ?? 0}'),
                            const SizedBox(height: 8),
                            Text('Your MP: ${mpVote ?? 'No recorded vote'}'),
                            if (_voteError != null) ...[
                              const SizedBox(height: 8),
                              Text(
                                _voteError!,
                                style: TextStyle(color: Colors.orange.shade900),
                              ),
                            ],
                          ],
                        ),
                ),
              ),
              const SizedBox(height: 12),
              if (!_isBillVoteOpen(bill)) ...[
                const SizedBox(height: 8),
                Text(
                  'Voting is closed. This bill has passed third reading.',
                  style: TextStyle(color: Colors.grey.shade700),
                ),
              ],
              FilledButton.icon(
                onPressed:
                    _selectedRiding == null ||
                        _hasWeighedIn ||
                        !_isBillVoteOpen(bill)
                    ? null
                    : () => _showVoteSheet(bill),
                icon: const Icon(Icons.how_to_vote_outlined),
                label: Text(
                  _hasWeighedIn
                      ? 'Vote recorded'
                      : _isBillVoteOpen(bill)
                      ? 'Weigh in'
                      : 'Voting closed',
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
