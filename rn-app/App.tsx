import React, {Component, ReactNode} from 'react';
import {View, StyleSheet, Text} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import CreateStack from './src/navigation/CreateStack';
import ChatStack from './src/navigation/ChatStack';
import ProfileStack from './src/navigation/ProfileStack';
import {COLORS} from './src/constants';

const Tab = createBottomTabNavigator();

class ErrorBoundary extends Component<
  {children: ReactNode},
  {error: Error | null}
> {
  state = {error: null as Error | null};

  static getDerivedStateFromError(error: Error) {
    return {error};
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>:(</Text>
          <Text style={styles.errorTitle}>渲染出错了</Text>
          <Text style={styles.errorText}>
            {this.state.error.message || String(this.state.error)}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const App = () => {
  return (
    <ErrorBoundary>
      <View style={styles.container}>
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarStyle: {
                backgroundColor: COLORS.light.surface,
                borderTopColor: COLORS.light.border,
                borderTopWidth: 1,
                height: 60,
                paddingBottom: 8,
                paddingTop: 6,
              },
              tabBarActiveTintColor: COLORS.accent.primary,
              tabBarInactiveTintColor: COLORS.text.lightFaint,
              tabBarLabelStyle: {
                fontSize: 11,
                fontWeight: '600',
                marginTop: 2,
              },
            }}>
            <Tab.Screen
              name="Chat"
              component={ChatStack}
              options={{
                tabBarLabel: '问元宝',
                tabBarIcon: ({color}) => (
                  <Text style={{fontSize: 22, color}}>💬</Text>
                ),
              }}
            />
            <Tab.Screen
              name="Create"
              component={CreateStack}
              options={{
                tabBarLabel: '创作',
                tabBarIcon: ({color}) => (
                  <Text style={{fontSize: 22, color}}>🎨</Text>
                ),
              }}
            />
            <Tab.Screen
              name="Profile"
              component={ProfileStack}
              options={{
                tabBarLabel: '我们',
                tabBarIcon: ({color}) => (
                  <Text style={{fontSize: 22, color}}>👤</Text>
                ),
              }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </View>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.light.bg},
  errorContainer: {
    flex: 1,
    backgroundColor: COLORS.light.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
    color: COLORS.semantic.error,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.lightPrimary,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.text.lightFaint,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default App;
