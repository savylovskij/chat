import { ChatType } from '@shared/enums';
import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Secure Messenger</Text>
      <Text style={styles.subtitle}>Chat types: {Object.values(ChatType).join(', ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C22',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2DD48C',
  },
  subtitle: {
    fontSize: 14,
    color: '#E8E8EC',
    marginTop: 8,
  },
});
