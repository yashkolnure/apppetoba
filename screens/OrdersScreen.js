import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as Print from 'expo-print';

const OrdersScreen = () => {
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [newOrderPopup, setNewOrderPopup] = useState(null);
  const [newOrderQueue, setNewOrderQueue] = useState([]);
  const latestOrderTimestampRef = useRef(null);
  const soundRef = useRef(null);

  const playSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/notification.mp3'),
        { shouldPlay: true }
      );
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) sound.unloadAsync();
      });
      soundRef.current = sound;
    } catch (error) {
      console.warn('Sound play error:', error);
    }
  };
  const printOrder = async (order) => {
    const currentDateTime = new Date().toLocaleString(); // <-- Get current date and time
  
    const htmlContent = `
      <html>
        <body style="font-family: sans-serif; padding: 10px;">
          <h3>Kitchen Order</h3>
          <p> ${currentDateTime}</p>
          <p><strong>Table:</strong> ${order.tableNumber}</p>
          <hr />
          <ul>
            ${order.items
              .map(
                (item) =>
                  `<li>${item.itemId?.name || 'Item'} × ${item.quantity}</li>`
              )
              .join('')}
          </ul>
          <hr />
          <p style="margin-bottom: 15px;"><strong>Total:</strong> ₹${order.total}</p>
        </body>
      </html>
    `;
  
    try {
      await Print.printAsync({ html: htmlContent });
    } catch (err) {
      console.error('❌ Print Error:', err);
    }
  };
  
  const fetchOrders = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const restaurant = await AsyncStorage.getItem('restaurant');
      const restaurantId = JSON.parse(restaurant)._id;

      const res = await fetch(
        `https://menubackend-git-main-yashkolnures-projects.vercel.app/api/admin/${restaurantId}/orders`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Invalid data format');

      const sortedOrders = data.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      setOrders(sortedOrders);

      const currentTimestamp = new Date().getTime();
      const newOrders = sortedOrders.filter((order) => {
        const orderTimestamp = new Date(order.createdAt).getTime();
        return !latestOrderTimestampRef.current || orderTimestamp > latestOrderTimestampRef.current;
      });

      if (newOrders.length > 0) {
        setNewOrderQueue((prev) => [...prev, ...newOrders]);
        if (!newOrderPopup) {
          const firstNewOrder = newOrders[0];
          setNewOrderPopup(firstNewOrder);
          setNewOrderQueue((prev) => prev.slice(1));
          playSound();
        }
      }

      if (newOrders.length > 0) {
        latestOrderTimestampRef.current = new Date(newOrders[0].createdAt).getTime();
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  const handleAcceptPopup = async () => {
    if (newOrderPopup) {
      printOrder(newOrderPopup);

      if (newOrderQueue.length > 0) {
        const nextOrder = newOrderQueue[0];
        setNewOrderPopup(nextOrder);
        setNewOrderQueue((prev) => prev.slice(1));
        playSound();
      } else {
        setNewOrderPopup(null);
      }

      await AsyncStorage.setItem('lastShownOrderTimestamp', String(latestOrderTimestampRef.current));
    }
  };

  useEffect(() => {
    fetchOrders();
    const checkLastShownOrderTimestamp = async () => {
      const lastShownTimestamp = await AsyncStorage.getItem('lastShownOrderTimestamp');
      if (lastShownTimestamp) {
        latestOrderTimestampRef.current = parseInt(lastShownTimestamp, 10);
      }
    };

    checkLastShownOrderTimestamp();

    const interval = setInterval(fetchOrders, 3000);
    return () => {
      clearInterval(interval);
      if (soundRef.current) soundRef.current.unloadAsync();
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.heading}>🍕 Active Orders</Text>
      {orders.length === 0 ? (
        <Text style={styles.noOrders}>No orders yet.</Text>
      ) : (
        orders.map((order) => (
          <View key={order._id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.table}>Table #{order.tableNumber}</Text>
              <Text style={styles.timestamp}>🕒 {new Date(order.createdAt).toLocaleString()}</Text>
            </View>
            <View>
              {order.items.map((item, idx) => (
                <Text key={idx} style={styles.item}>
                  • {item.itemId?.name || 'Deleted Item'} × {item.quantity}
                </Text>
              ))}
            </View>
            <View style={styles.bottomRow}>
              <Text style={styles.total}>₹{order.total}</Text>
              <TouchableOpacity onPress={() => printOrder(order)} style={styles.printBtnRounded}>
                <Text style={styles.printIcon}>🖨️</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <Modal visible={!!newOrderPopup} transparent animationType="slide">
        <View style={styles.popupContainer}>
          <View style={styles.blurBackground} />
          <View style={styles.popupCard}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setNewOrderPopup(null)}>
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>
            <Text style={styles.popupTitle}>🆕 New Order</Text>
            {newOrderPopup && (
              <>
                <Text style={styles.popupTable}>Table #{newOrderPopup.tableNumber}</Text>
                <View style={styles.popupItems}>
                  {newOrderPopup.items.map((item, idx) => (
                    <Text key={idx} style={styles.popupItem}>
                      • {item.itemId?.name || 'Deleted Item'} × {item.quantity}
                    </Text>
                  ))}
                </View>
                <View style={styles.bottomRow}>
                  <Text style={styles.popupTotal}>₹{newOrderPopup.total}</Text>
                  <TouchableOpacity onPress={handleAcceptPopup} style={styles.acceptBtn}>
                    <Text style={styles.acceptText}>🖨️ Print</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default OrdersScreen;

const styles = StyleSheet.create({
  container: { padding: 16, paddingTop:50 },
  heading: { fontSize: 24, fontWeight: 'bold', color: '#ff7f50', marginBottom: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 16, elevation: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  timestamp: { fontSize: 12, color: '#666' },
  table: { fontSize: 14, fontWeight: '600', color: '#444' },
  item: { fontSize: 14, color: '#555', marginLeft: 10 },
  total: { fontSize: 16, fontWeight: 'bold', color: 'green', marginTop: 12 },
  noOrders: { textAlign: 'center', color: '#999', fontSize: 16, marginTop: 20 },
  popupContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  blurBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.3)' },
  popupCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, width: '85%', elevation: 10 },
  closeBtn: { position: 'absolute', top: 10, right: 10 },
  closeText: { fontSize: 30, color: '#333', padding: 12, paddingTop:0, },
  popupTitle: { fontSize: 20, fontWeight: 'bold', color: '#f87231', marginBottom: 12 },
  popupTable: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 8 },
  popupItems: { marginBottom: 12 },
  popupItem: { fontSize: 15, color: '#555', marginVertical: 2 },
  popupTotal: { fontSize: 17, fontWeight: 'bold', color: 'green' },
  acceptBtn: { backgroundColor: '#ff6b6b', paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20 },
  acceptText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  printBtnRounded: { backgroundColor: '#222', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 },
  printIcon: { color: '#fff', fontSize: 16 },
});