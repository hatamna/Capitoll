import 'package:flutter/material.dart';
import 'my_mp_page.dart';
<<<<<<< Updated upstream
import 'services/api_service.dart';
=======
import 'my_profile_page.dart';
import 'bills_page.dart';
>>>>>>> Stashed changes

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.red, surface: Colors.white),
      ),
      home: const MyHomePage(title: 'Capitoll'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
<<<<<<< Updated upstream
  int _selectedIndex = 1;

  final List<Widget> _pages = [
    const Center(child: Text('Bills Page')),
    const MyMpPage(),
    const Center(child: Text('Profile Page')),
=======
  int _counter = 0;

  void _incrementCounter() {
    setState(() {
      _counter++;
    });
  }

  int _selectedIndex = 0;

  final List<Widget> _pages = [
    const BillsPage(), 
    const MyMpPage(),                      
    const MyProfilePage(), 
>>>>>>> Stashed changes
  ];

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  void initState() {
    super.initState();
    testBackend();
  }

  Future<void> testBackend() async {
    try {
      final bills = await ApiService.getBills();
      debugPrint('BILLS FROM BACKEND: $bills');
    } catch (error) {
      debugPrint('ERROR: $error');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        centerTitle: true,
        title: SizedBox(
          height: 25,
          child: Image.asset(
            'assets/icons/capitollLogo.png',
            fit: BoxFit.contain,
          ),
        ),
      ),
      body: _pages[_selectedIndex],
<<<<<<< Updated upstream
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: _onItemTapped,
        items: const <BottomNavigationBarItem>[
          BottomNavigationBarItem(
            icon: ImageIcon(AssetImage('assets/icons/ballot.png')),
            label: 'Bills',
          ),
          BottomNavigationBarItem(
            icon: ImageIcon(AssetImage('assets/icons/manCircle.png')),
            label: 'My MP',
          ),
          BottomNavigationBarItem(
            icon: ImageIcon(AssetImage('assets/icons/personEdit.png')),
            label: 'Profile',
          ),
        ],
        selectedItemColor: Color.fromARGB(255, 243, 33, 33),
=======
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.vertical(
            top: Radius.circular(24),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 12,
              spreadRadius: 2,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: const BorderRadius.vertical(
            top: Radius.circular(24),
          ),
          child: BottomNavigationBar(
            elevation: 0,
            backgroundColor: Colors.white,
            currentIndex: _selectedIndex, 
            onTap: _onItemTapped,
            items: const <BottomNavigationBarItem>[
              BottomNavigationBarItem(
                icon: ImageIcon(
                  AssetImage('assets/icons/ballot.png'),
                ),
                label: 'Bills',
              ),
              BottomNavigationBarItem(
                icon: ImageIcon(
                  AssetImage('assets/icons/manCircle.png'),
                ),
                label: 'My MP',
              ),
              BottomNavigationBarItem(
                icon: ImageIcon(
                  AssetImage('assets/icons/personEdit.png'),
                ),
                label: 'Profile',
              ),
            ],
            selectedItemColor: const Color.fromARGB(255, 243, 33, 33),
          ),
        ),
>>>>>>> Stashed changes
      ),
    );
  }
}
