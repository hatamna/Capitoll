import 'package:flutter/material.dart';
import 'my_mp_page.dart';

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
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
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
  int _counter = 0;

  void _incrementCounter() {
    setState(() {
      _counter++;
    });
  }

  int _selectedIndex = 1;

  final List<Widget> _pages = [
    const Center(child: Text('Bills Page')), 
    const MyMpPage(),                      
    const Center(child: Text('Profile Page')), 
  ];

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
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
        )
      ),
      body: _pages[_selectedIndex],
      bottomNavigationBar: BottomNavigationBar(
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
              AssetImage('assets/icons/personEdit.png')
            ),
            label: 'Profile',
          ),
        ],
        selectedItemColor: const Color.fromARGB(255, 243, 33, 33),
      ),
    ); 
  }
}