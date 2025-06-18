import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSameDay, isSameWeek, subMonths } from 'date-fns';

const OrderHistoryScreen = () => {
  const [orderHistory, setOrderHistory] = useState([]);
  const [groupedOrders, setGroupedOrders] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restaurantId, setRestaurantId] = useState(null);
  const [filter, setFilter] = useState('All');
  const [totalSales, setTotalSales] = useState(0);

  const BASE_URL = 'https://menubackend-git-main-yashkolnures-projects.vercel.app/'; // Your IP
  

  const fetchRestaurantId = async () => {
    try {
      const restaurant = await AsyncStorage.getItem('restaurant');
      const { _id } = JSON.parse(restaurant);
      setRestaurantId(_id);
    } catch (err) {
      Alert.alert('Error', 'Unable to fetch restaurant ID');
    }
  };

  const fetchOrderHistory = async (id) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/api/admin/${id}/order-history`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const contentType = res.headers.get('content-type');
      if (!contentType.includes('application/json')) {
        throw new Error('Invalid server response');
      }

      const data = await res.json();
      setOrderHistory(data);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const groupOrders = (orders) => {
    const grouped = {};
    let total = 0;

    orders.forEach((order) => {
      if (!grouped[order.invoiceNumber]) grouped[order.invoiceNumber] = [];
      grouped[order.invoiceNumber].push(order);
      total += order.totalAmount;
    });

    setGroupedOrders(grouped);
    setTotalSales(total);
  };

  const applyFilter = (selectedFilter) => {
    setFilter(selectedFilter);

    const now = new Date();
    let filteredOrders = [];

    if (selectedFilter === 'Today') {
      filteredOrders = orderHistory.filter((order) =>
        isSameDay(new Date(order.timestamp), now)
      );
    } else if (selectedFilter === 'This Week') {
      filteredOrders = orderHistory.filter((order) =>
        isSameWeek(new Date(order.timestamp), now, { weekStartsOn: 1 })
      );
    } else if (selectedFilter === 'Past Month') {
      const oneMonthAgo = subMonths(now, 1);
      filteredOrders = orderHistory.filter(
        (order) => new Date(order.timestamp) > oneMonthAgo
      );
    } else {
      filteredOrders = orderHistory;
    }

    groupOrders(filteredOrders);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrderHistory(restaurantId);
  };

  const renderInvoiceGroup = ([invoiceNumber, orders]) => {
    const first = orders[0];
    const combinedItems = orders.flatMap((o) => o.orderItems);

    const groupedItems = combinedItems.reduce((acc, item) => {
      const existing = acc.find((i) => i.name === item.name);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        acc.push({ ...item });
      }
      return acc;
    }, []);

    return (
      <View style={styles.card} key={invoiceNumber}>
        {/* Top Info Row */}
        <View style={styles.topRow}>
          <Text style={styles.invoice}>🧾 {invoiceNumber}</Text>
          <Text style={styles.table}>Table #{first.tableNumber}</Text>
        </View>
    
        {/* Timestamp */}
        <Text style={styles.time}>
          {new Date(first.timestamp).toLocaleString()}
        </Text>
    
        {/* Items List */}
        <View style={styles.itemsWrapper}>
          {groupedItems.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemQty}>× {item.quantity}</Text>
              <Text style={styles.itemPrice}>₹{item.quantity * item.price}</Text>
            </View>
          ))}
        </View>
    
        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalAmount}>
            ₹{orders.reduce((sum, o) => sum + o.totalAmount, 0)}
          </Text>
        </View>
      </View>
    );
  };

  useEffect(() => {
    fetchRestaurantId();
  }, []);

  useEffect(() => {
    if (restaurantId) fetchOrderHistory(restaurantId);
  }, [restaurantId]);

  useEffect(() => {
    applyFilter(filter);
  }, [orderHistory]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#444" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.filterWrapper}>
        <Text style={styles.heading}>📜 Order History</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {[ 'All', 'Today', 'This Week', 'Past Month'].map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => applyFilter(f)}
              style={[
                styles.filterButton,
                filter === f && styles.filterButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === f && styles.filterTextActive,
                ]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={styles.totalSales}>Total Sales: ₹{totalSales}</Text>

      {Object.keys(groupedOrders).length === 0 ? (
        <Text style={styles.noOrders}>No orders found.</Text>
      ) : (
        <FlatList
          data={Object.entries(groupedOrders)}
          keyExtractor={([invoiceNumber]) => invoiceNumber}
          renderItem={({ item }) => renderInvoiceGroup(item)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fb',
    paddingTop:40,
  },
  filterWrapper: {
    paddingVertical: 12,
    paddingLeft: 16,
  },
  filterScroll: {
    paddingRight: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
invoice: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#FF3744',
},

table: {
  fontSize: 14,
  color: '#555',
  fontWeight: '600',
},

time: {
  fontSize: 14,
    color: '#888',
  marginTop: 4,
},

itemsWrapper: {
  marginTop: 12,
  paddingLeft: 4,
},

itemRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 6,
},

bullet: {
  fontSize: 12,
  color: '#444',
  marginRight: 4,
},

itemName: {
  flex: 1,
  fontSize: 14,
  color: '#333',
},

itemQty: {
  fontSize: 14,
  color: '#444',
  marginHorizontal: 6,
},

itemPrice: {
  fontSize: 14,
  color: '#444',
  fontWeight: '600',
},
heading: { fontSize: 24, fontWeight: 'bold', color: '#ff7f50', marginBottom: 16 },

totalRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: 12,
  borderTopWidth: 1,
  borderTopColor: '#4444',
  paddingTop: 8,
},

totalLabel: {
  fontSize: 15,
  fontWeight: 'bold',
  color: '#222',
},

totalAmount: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#FF3744',
},
  filterButton: {
    marginRight: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FF3744',
  },
  filterButtonActive: {
    backgroundColor: '#222',
  },
  filterText: {
    color: '#fff',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  totalSales: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 16,
    marginBottom: 10,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 50,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  invoice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  table: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
  },
  time: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  itemsWrapper: {
    marginTop: 10,
  },
  item: {
    fontSize: 14,
    marginBottom: 4,
  },
  total: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 8,
    color: '#111',
  },
  noOrders: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 30,
    color: '#999',
  },
});

export default OrderHistoryScreen;
